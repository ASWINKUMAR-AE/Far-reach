import { Request, Response } from 'express';
import { FertilizerEngine } from '../services/fertilizerEngine';
import { RAGService } from '../services/ragService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const recommendFertilizer = async (req: Request, res: Response) => {
  try {
    const { crop, variety, area, area_unit, soil } = req.body;
    
    // 1. Convert Area to Acres for standardized engine logic
    let farmAreaAcres = area;
    if (area_unit === 'hectare') farmAreaAcres = area * 2.47105;
    
    // 2. Lookup Crop Requirements (Mock for now if DB empty)
    // Normally we'd do: const cropData = await prisma.cropKnowledge.findFirst({ where: { crop } })
    const cropReq = { n: 120, p: 40, k: 40 }; // Example: Rice/Paddy kg/ha
    
    // 3. Analyze Soil
    const soilStatus = FertilizerEngine.analyzeSoil(soil.N, soil.P, soil.K, soil.pH);
    
    // 4. Calculate Deterministic Dosage
    const dosage = FertilizerEngine.calculateDosage(cropReq, soilStatus, farmAreaAcres);
    
    // 5. Recommend Products
    const products = await FertilizerEngine.recommendFertilizers(dosage);
    
    // 6. RAG Context (Find IEEE papers etc.)
    const researchContext = await RAGService.searchResearchContext(crop, 'fertilizer application');

    // 7. Format Output
    res.json({
      status: 'success',
      calculation: {
        soilStatus,
        required_npk_total: dosage
      },
      recommendation: {
        chemical_options: products.chemicalAlts,
        organic_options: products.organicAlts
      },
      sources: [researchContext],
      confidence: 'HIGH'
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const adminSeedFertilizers = async (req: Request, res: Response) => {
  try {
    await prisma.fertilizer.createMany({
      data: [
        { name: 'Urea', category: 'chemical', nutrient_n: 46, application_methods: '[]', application_stages: '[]' },
        { name: 'DAP (Diammonium Phosphate)', category: 'chemical', nutrient_n: 18, nutrient_p: 46, application_methods: '[]', application_stages: '[]' },
        { name: 'MOP (Muriate of Potash)', category: 'chemical', nutrient_k: 60, application_methods: '[]', application_stages: '[]' },
        { name: 'Vermicompost', category: 'organic', nutrient_n: 1.5, nutrient_p: 1.0, nutrient_k: 1.0, application_methods: '[]', application_stages: '[]' },
      ]
    });
    res.json({ status: 'seeded' });
  } catch (error) {
    res.status(500).json({ error });
  }
};
