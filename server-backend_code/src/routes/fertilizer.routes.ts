import { Router } from 'express';
import { recommendFertilizer, adminSeedFertilizers } from '../controllers/fertilizerController';

const router = Router();

router.post('/recommend', recommendFertilizer);
router.post('/admin/seed', adminSeedFertilizers);

export default router;
