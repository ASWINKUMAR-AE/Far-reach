import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SoilStatus {
  n: 'LOW' | 'MEDIUM' | 'HIGH';
  p: 'LOW' | 'MEDIUM' | 'HIGH';
  k: 'LOW' | 'MEDIUM' | 'HIGH';
  ph: number;
}

export class FertilizerEngine {
  
  // 1. Analyzes numeric NPK against regional thresholds to classify as LOW/MEDIUM/HIGH
  static analyzeSoil(n: number, p: number, k: number, ph: number): SoilStatus {
    return {
      n: n < 280 ? 'LOW' : n > 560 ? 'HIGH' : 'MEDIUM',
      p: p < 10 ? 'LOW' : p > 25 ? 'HIGH' : 'MEDIUM',
      k: k < 120 ? 'LOW' : k > 280 ? 'HIGH' : 'MEDIUM',
      ph
    };
  }

  // 2. Deterministic dosage calculator based on crop required kg/ha and soil classification
  static calculateDosage(cropReq: { n: number, p: number, k: number }, soil: SoilStatus, farmAreaAcres: number) {
    const HECTARES_PER_ACRE = 0.404686;
    const farmHectares = farmAreaAcres * HECTARES_PER_ACRE;

    // Base requirement calculation
    // If soil is low, add 25% to requirement. If high, reduce by 25%.
    const adjust = (base: number, status: 'LOW' | 'MEDIUM' | 'HIGH') => {
      if (status === 'LOW') return base * 1.25;
      if (status === 'HIGH') return base * 0.75;
      return base;
    };

    const targetN_kgHa = adjust(cropReq.n, soil.n);
    const targetP_kgHa = adjust(cropReq.p, soil.p);
    const targetK_kgHa = adjust(cropReq.k, soil.k);

    const targetN_total = targetN_kgHa * farmHectares;
    const targetP_total = targetP_kgHa * farmHectares;
    const targetK_total = targetK_kgHa * farmHectares;

    return { targetN_total, targetP_total, targetK_total };
  }

  // 3. Recommends specific fertilizers and computes EXACT product quantity needed.
  static async recommendFertilizers(cropReqTotal: { n: number, p: number, k: number }) {
    // Naive fetch for demo - usually you query specific fertilizers based on region/availability.
    const fertilizers = await prisma.fertilizer.findMany();

    const organic = fertilizers.filter(f => f.category === 'organic');
    const chemical = fertilizers.filter(f => f.category === 'chemical');

    const computeProductWeight = (nutrientNeededKg: number, productNutrientPct: number) => {
      if (productNutrientPct <= 0 || nutrientNeededKg <= 0) return 0;
      return parseFloat(((nutrientNeededKg * 100) / productNutrientPct).toFixed(2));
    };

    // Calculate chemical alternatives (e.g., Urea for N, DAP for P, MOP for K)
    const chemicalAlts = chemical.map(f => {
      let weight = 0;
      let purpose = '';
      if (f.nutrient_n > 0 && cropReqTotal.n > 0) { weight = computeProductWeight(cropReqTotal.n, f.nutrient_n); purpose = 'Nitrogen'; }
      else if (f.nutrient_p > 0 && cropReqTotal.p > 0) { weight = computeProductWeight(cropReqTotal.p, f.nutrient_p); purpose = 'Phosphorus'; }
      else if (f.nutrient_k > 0 && cropReqTotal.k > 0) { weight = computeProductWeight(cropReqTotal.k, f.nutrient_k); purpose = 'Potassium'; }
      
      return { fertilizer: f, quantity_kg: weight, purpose };
    }).filter(a => a.quantity_kg > 0);

    const organicAlts = organic.map(f => {
      let weight = 0;
      let purpose = '';
      if (f.nutrient_n > 0 && cropReqTotal.n > 0) { weight = computeProductWeight(cropReqTotal.n, f.nutrient_n); purpose = 'Nitrogen'; }
      
      return { fertilizer: f, quantity_kg: weight, purpose };
    }).filter(a => a.quantity_kg > 0);

    return { chemicalAlts, organicAlts };
  }
}
