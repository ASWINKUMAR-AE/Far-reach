import { Router } from 'express';
import { prisma, io } from '../server';

const router = Router();

// ==============================================
// PUBLIC ENDPOINTS (For Farmer App)
// ==============================================

// Get Latest News (Filtered & Paginated)
router.get('/', async (req, res) => {
  try {
    const { category, location, priority, search, limit = 20, offset = 0 } = req.query;

    const whereClause: any = { is_active: true };
    
    if (category) whereClause.category = String(category);
    if (location) whereClause.location = { contains: String(location) };
    if (priority) whereClause.priority = String(priority);
    if (search) {
      whereClause.OR = [
        { title: { contains: String(search) } },
        { summary: { contains: String(search) } },
        { content: { contains: String(search) } },
      ];
    }

    const news = await prisma.news.findMany({
      where: whereClause,
      orderBy: { published_at: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json({ data: news });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Important/Live News
router.get('/live', async (req, res) => {
  try {
    const news = await prisma.news.findMany({
      where: {
        is_active: true,
        priority: { in: ['CRITICAL', 'HIGH'] },
      },
      orderBy: { published_at: 'desc' },
      take: 10,
    });
    res.json({ data: news });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single News
router.get('/:id', async (req, res) => {
  try {
    const news = await prisma.news.findUnique({
      where: { id: req.params.id }
    });
    if (!news) return res.status(404).json({ error: "News not found" });
    res.json({ data: news });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==============================================
// ADMIN ENDPOINTS
// ==============================================

// Create News Manually
router.post('/admin', async (req, res) => {
  try {
    // In a real app, verify admin auth token here
    const data = req.body;
    
    const newUpdate = await prisma.news.create({
      data: {
        ...data,
        is_verified: true, // Manual admin updates are verified
        verified_by: "ADMIN",
        verification_method: "ADMIN_VERIFIED",
        verified_at: new Date()
      }
    });

    // Emit live update to connected farmers
    io.emit('NEW_UPDATE', newUpdate);

    res.status(201).json({ data: newUpdate });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update News
router.put('/admin/:id', async (req, res) => {
  try {
    const updated = await prisma.news.update({
      where: { id: req.params.id },
      data: req.body
    });
    io.emit('NEWS_UPDATED', updated);
    res.json({ data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete (Unpublish) News
router.delete('/admin/:id', async (req, res) => {
  try {
    const deleted = await prisma.news.update({
      where: { id: req.params.id },
      data: { is_active: false }
    });
    io.emit('NEWS_DELETED', { id: req.params.id });
    res.json({ data: deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add Source
router.post('/admin/sources', async (req, res) => {
  try {
    const source = await prisma.newsSource.create({
      data: req.body
    });
    res.status(201).json({ data: source });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
