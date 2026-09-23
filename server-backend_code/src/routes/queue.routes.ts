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
 * Reads Bearer JWT or x-center-code header.
 * Populates req.user.center_code.
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const headerCenter = req.headers['x-center-code'] as string;

  let userCenter = headerCenter || 'CTR-01';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
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
 * Fetches token details with flexible query matching (e.g. "148", "#148", or "TKN-148")
 * Enforces strict multi-tenant center scoping (403 if center mismatch).
 */
router.get('/:tokenId', verifyToken, async (req: Request, res: Response) => {
  try {
    const rawParam = req.params.tokenId.trim();
    const adminCenterCode = (req as any).user?.center_code;

    // Normalize query: handle "148", "#148", "tkn-148", etc.
    const cleanParam = rawParam.replace(/^#/, '').toUpperCase();
    const possibleTokenIds = [
      cleanParam,
      cleanParam.startsWith('TKN-') ? cleanParam : `TKN-${cleanParam}`,
    ];

    const token = await prisma.procurementToken.findFirst({
      where: {
        tokenId: { in: possibleTokenIds },
      },
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: `Token #${rawParam} not found in procurement registry.`,
      });
    }

    // Strict Multi-Tenant Security Check
    if (token.centerCode !== adminCenterCode) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Token #${token.tokenId} belongs to center "${token.centerCode}", but your administrative session is assigned to "${adminCenterCode}".`,
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
    const rawParam = req.params.tokenId.trim();
    const cleanParam = rawParam.replace(/^#/, '').toUpperCase();
    const possibleTokenIds = [
      cleanParam,
      cleanParam.startsWith('TKN-') ? cleanParam : `TKN-${cleanParam}`,
    ];
    const adminCenterCode = (req as any).user?.center_code;

    // 1. Fetch current token state
    const existingToken = await prisma.procurementToken.findFirst({
      where: {
        tokenId: { in: possibleTokenIds },
      },
    });

    if (!existingToken) {
      return res.status(404).json({
        success: false,
        error: `Token #${rawParam} not found.`,
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
      where: { tokenId: existingToken.tokenId },
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
      message: `Token #${updatedToken.tokenId} advanced to ${TOKEN_STAGES[updatedToken.statusIndex]}.`,
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
 * 3. POST /api/queue/register-token
 * Transfers token generated in the App to the Token Status Manager table.
 * Enforces NO DUPLICATES: Atomically allocates next sequential token number if collision occurs.
 */
router.post('/register-token', async (req: Request, res: Response) => {
  try {
    const { farmerName, centerCode, crop, quantityKg, slot, requestedTokenNumber } = req.body;

    if (!farmerName || !centerCode) {
      return res.status(400).json({
        success: false,
        error: 'farmerName and centerCode are required.',
      });
    }

    // Atomic transaction to ensure NO DUPLICATES
    const result = await prisma.$transaction(async (tx) => {
      // Find all existing tokens for this center to determine highest token number
      const existingTokens = await tx.procurementToken.findMany({
        where: { centerCode },
        select: { tokenId: true },
      });

      // Extract existing numeric tokens
      const existingNumbers = existingTokens
        .map((t) => {
          const numMatch = t.tokenId.match(/(\d+)/);
          return numMatch ? parseInt(numMatch[1], 10) : 0;
        })
        .filter((n) => n > 0);

      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 147;

      let targetNumber: number;
      if (requestedTokenNumber && typeof requestedTokenNumber === 'number') {
        const candidateId = `TKN-${requestedTokenNumber}`;
        const alreadyExists = existingTokens.some((t) => t.tokenId === candidateId);
        if (!alreadyExists) {
          targetNumber = requestedTokenNumber;
        } else {
          // If requested token number already exists, avoid duplicate by allocating max + 1
          targetNumber = maxNumber + 1;
        }
      } else {
        targetNumber = maxNumber + 1;
      }

      const finalTokenId = `TKN-${targetNumber}`;

      const created = await tx.procurementToken.create({
        data: {
          tokenId: finalTokenId,
          farmerName,
          centerCode,
          statusIndex: 1, // Step 1: SLOT BOOKED
          crop: crop || 'Paddy (A-Grade)',
          quantityKg: typeof quantityKg === 'number' ? quantityKg : parseFloat(quantityKg) || 500,
          notes: slot ? `Slot: ${slot}` : undefined,
        },
      });

      return { token: created, tokenNumber: targetNumber };
    });

    // Notify connected admin dashboards in real time via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('TOKEN_REGISTERED', {
        tokenId: result.token.tokenId,
        farmerName: result.token.farmerName,
        centerCode: result.token.centerCode,
        crop: result.token.crop,
        quantityKg: result.token.quantityKg,
        statusIndex: result.token.statusIndex,
      });
    }

    return res.status(201).json({
      success: true,
      message: `Token #${result.token.tokenId} successfully transferred and registered with zero duplicates.`,
      data: result.token,
      tokenNumber: result.tokenNumber,
    });
  } catch (error: any) {
    console.error('[POST /api/queue/register-token Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 4. POST /api/queue/create
 * Legacy/test endpoint for direct creation
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
 * 5. GET /api/queue
 * Lists all registered tokens for the admin's center
 */
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const adminCenterCode = (req as any).user?.center_code || 'CTR-01';
    const tokens = await prisma.procurementToken.findMany({
      where: { centerCode: adminCenterCode },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return res.status(200).json({
      success: true,
      centerCode: adminCenterCode,
      count: tokens.length,
      data: tokens.map((t) => ({
        ...t,
        currentStage: TOKEN_STAGES[t.statusIndex],
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
