import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * MOCK: Get real-time crowd count from simulated CV model
 */
router.get('/crowd-count/:centreId', async (req, res) => {
  try {
    const { centreId } = req.params;
    
    // In a real scenario, this would query a Redis cache or call a Python service
    // For now, return a randomized realistic count (e.g. 10 to 50 people)
    const count = Math.floor(Math.random() * 41) + 10;
    
    res.json({
      success: true,
      data: {
        centre_id: centreId,
        person_count: count,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Request CCTV Live Feed access with 15-minute rate limit
 */
router.post('/request-cctv', async (req, res) => {
  try {
    const { farmerId, centreId } = req.body;
    if (!farmerId || !centreId) {
      return res.status(400).json({ error: 'farmerId and centreId are required' });
    }

    const COOLDOWN_MINUTES = 15;
    const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
    const now = new Date();

    // Check last request for this farmer
    const lastRequest = await prisma.cctvRequest.findFirst({
      where: { farmer_id: farmerId, centre_id: centreId },
      orderBy: { requested_at: 'desc' }
    });

    if (lastRequest) {
      const timeSinceLast = now.getTime() - lastRequest.requested_at.getTime();
      if (timeSinceLast < cooldownMs) {
        const remainingMs = cooldownMs - timeSinceLast;
        const remainingMin = Math.ceil(remainingMs / (1000 * 60));
        return res.status(429).json({
          error: 'Too many requests. Please wait before requesting the live feed again.',
          remaining_minutes: remainingMin
        });
      }
    }

    // Allow request, save to DB
    await prisma.cctvRequest.create({
      data: {
        farmer_id: farmerId,
        centre_id: centreId,
        requested_at: now
      }
    });

    // Return mock video URL (Using an open test video for demonstration)
    res.json({
      success: true,
      data: {
        stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        message: 'Live feed access granted.'
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
