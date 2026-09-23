import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// The 8 Canonical Operational Steps (Index 0 through 7)
export const TOKEN_STAGES = [
  'REGISTRATION',          // 0
  'SLOT BOOKED',           // 1
  'CHECKED IN',            // 2
  'WEIGHING',              // 3
  'QUALITY CHECK',         // 4
  'PROCUREMENT ACCEPTED',  // 5
  'PAYMENT INITIATED',     // 6
  'PAYMENT RECEIVED',      // 7
];
export const MAX_STATUS_INDEX = TOKEN_STAGES.length - 1; // 7

/**
 * Middleware: verifyToken
 * Extracts admin authentication and center scope.
 * Reads Bearer JWT or x-center-code header (fallback for internal dev/testing).
 * Populates req.user.center_code.
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  // Check header or authorization
  const authHeader = req.headers.authorization;
  const headerCenter = req.headers['x-center-code'] as string;

  // Mock / extracted decoded user payload
  let userCenter = headerCenter || 'CTR-01';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      // In production: jwt.verify(token, process.env.JWT_SECRET)
      // If token payload contains center_code:
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
        if (decoded.center_code) userCenter = decoded.center_code;
      }
    } catch (e) {
      // Fallback to center header
    }
  }

  (req as any).user = {
    id: 'ADM-001',
    role: 'ADMIN',
    center_code: userCenter,
  };

  next();
};

/**
 * 1. GET /api/queue/:tokenId
 * Fetches token details if it matches the admin's center_code
 */
router.get('/:tokenId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const adminCenterCode = (req as any).user?.center_code;

    const token = await prisma.procurementToken.findUnique({
      where: { tokenId },
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: `Token #${tokenId} not found in procurement registry.`,
      });
    }

    // Strict Multi-Tenant Security Check
    if (token.centerCode !== adminCenterCode) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Token #${tokenId} belongs to center "${token.centerCode}", but your administrative session is assigned to "${adminCenterCode}".`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...token,
        currentStage: TOKEN_STAGES[token.statusIndex],
        totalStages: TOKEN_STAGES.length,
        isCompleted: token.statusIndex === MAX_STATUS_INDEX,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/queue/:tokenId Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving token details.',
    });
  }
});

/**
 * 2. PUT /api/queue/:tokenId/advance
 * Advances statusIndex by +1 (capped at 7) with center_code verification
 */
router.put('/:tokenId/advance', verifyToken, async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const adminCenterCode = (req as any).user?.center_code;

    // 1. Fetch current token state
    const existingToken = await prisma.procurementToken.findUnique({
      where: { tokenId },
    });

    if (!existingToken) {
      return res.status(404).json({
        success: false,
        error: `Token #${tokenId} not found.`,
      });
    }

    // 2. Strict Security Check
    if (existingToken.centerCode !== adminCenterCode) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: You cannot modify tokens outside your assigned center (${adminCenterCode}).`,
      });
    }

    // 3. Boundary Check: Cannot exceed index 7
    if (existingToken.statusIndex >= MAX_STATUS_INDEX) {
      return res.status(400).json({
        success: false,
        error: `Token has already reached the final step (${TOKEN_STAGES[MAX_STATUS_INDEX]}). Cannot advance further.`,
        data: existingToken,
      });
    }

    // 4. Increment status index atomically
    const updatedToken = await prisma.procurementToken.update({
      where: { tokenId },
      data: {
        statusIndex: { increment: 1 },
      },
    });

    // Notify connected clients via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('TOKEN_ADVANCED', {
        tokenId: updatedToken.tokenId,
        centerCode: updatedToken.centerCode,
        newStatusIndex: updatedToken.statusIndex,
        stage: TOKEN_STAGES[updatedToken.statusIndex],
      });
    }

    return res.status(200).json({
      success: true,
      message: `Token #${tokenId} advanced to ${TOKEN_STAGES[updatedToken.statusIndex]}.`,
      data: {
        ...updatedToken,
        previousStage: TOKEN_STAGES[existingToken.statusIndex],
        currentStage: TOKEN_STAGES[updatedToken.statusIndex],
        isCompleted: updatedToken.statusIndex === MAX_STATUS_INDEX,
      },
    });
  } catch (error: any) {
    console.error('[PUT /api/queue/:tokenId/advance Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while advancing token status.',
    });
  }
});

/**
 * 3. POST /api/queue/create
 * Creates or seeds a procurement token for testing/demo
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { tokenId, farmerName, centerCode, statusIndex, crop, quantityKg } = req.body;

    if (!tokenId || !farmerName || !centerCode) {
      return res.status(400).json({
        success: false,
        error: 'tokenId, farmerName, and centerCode are required.',
      });
    }

    const created = await prisma.procurementToken.upsert({
      where: { tokenId },
      update: {
        farmerName,
        centerCode,
        statusIndex: statusIndex !== undefined ? statusIndex : 0,
        crop: crop || 'Paddy (A-Grade)',
        quantityKg: quantityKg || 500,
      },
      create: {
        tokenId,
        farmerName,
        centerCode,
        statusIndex: statusIndex !== undefined ? statusIndex : 0,
        crop: crop || 'Paddy (A-Grade)',
        quantityKg: quantityKg || 500,
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 4. GET /api/queue
 * Lists all tokens for a center
 */
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const adminCenterCode = (req as any).user?.center_code || 'CTR-01';
    const tokens = await prisma.procurementToken.findMany({
      where: { centerCode: adminCenterCode },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: tokens });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
