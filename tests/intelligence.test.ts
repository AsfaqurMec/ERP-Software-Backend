import { describe, it, expect } from 'vitest';

describe('Owner Intelligence & Decision Support Formulas', () => {
  describe('Stock Runway & Run-Rate Calculations', () => {
    it('should compute accurate daily run rate and days of runway left', () => {
      const unitsSold = 60;
      const periodDays = 30;
      const currentStock = 14;

      const dailyRunRate = unitsSold / periodDays; // 2 units/day
      const runwayDays = Math.round(currentStock / dailyRunRate); // 7 days

      expect(dailyRunRate).toBe(2);
      expect(runwayDays).toBe(7);

      // Status should be CRITICAL when runway <= 7
      const isCritical = runwayDays <= 7;
      expect(isCritical).toBe(true);
    });

    it('should calculate target reorder quantity to reach 30-day buffer plus minimum stock', () => {
      const dailyRunRate = 2; // 2 units/day
      const currentStock = 14;
      const minStock = 10;

      // 30 days buffer = 60 units. Needs 60 - 14 = 46 units.
      const targetBuffer = Math.ceil(dailyRunRate * 30 - currentStock);
      const suggestedReorderQty = Math.max(minStock, targetBuffer);

      expect(suggestedReorderQty).toBe(46);

      const unitCost = 500;
      const sellingPrice = 750;
      const estimatedCost = suggestedReorderQty * unitCost; // 23,000
      const projectedRevenue = suggestedReorderQty * sellingPrice; // 34,500
      const projectedProfit = projectedRevenue - estimatedCost; // 11,500
      const roiPct = (projectedProfit / estimatedCost) * 100; // 50%

      expect(estimatedCost).toBe(23000);
      expect(projectedRevenue).toBe(34500);
      expect(projectedProfit).toBe(11500);
      expect(roiPct).toBe(50);
    });
  });

  describe('Pricing Optimization & Margin Recovery', () => {
    it('should flag underpriced products and recommend benchmark 25% margin price', () => {
      const unitCost = 90;
      const currentSellingPrice = 100; // Margin = (100 - 90)/100 = 10% (< 15%)
      const currentMarginPct = ((currentSellingPrice - unitCost) / currentSellingPrice) * 100;

      expect(currentMarginPct).toBe(10);

      // Target margin = 25%
      const targetMargin = 0.25;
      const recommendedSellingPrice = Math.ceil(unitCost / (1 - targetMargin)); // 90 / 0.75 = 120
      const newMarginPct = ((recommendedSellingPrice - unitCost) / recommendedSellingPrice) * 100;

      expect(recommendedSellingPrice).toBe(120);
      expect(newMarginPct).toBe(25);

      // Projected monthly profit gain with 50 units/month sales volume
      const monthlyVolume = 50;
      const priceDiff = recommendedSellingPrice - currentSellingPrice; // +20
      const projectedMonthlyGain = priceDiff * monthlyVolume; // +1,000

      expect(projectedMonthlyGain).toBe(1000);
    });

    it('should calculate 5% premium bump for high-volume star performers', () => {
      const sellingPrice = 500;
      const bumpPct = 0.05;
      const recommendedPrice = Math.ceil(sellingPrice * (1 + bumpPct));

      expect(recommendedPrice).toBe(525);
      const priceDiff = recommendedPrice - sellingPrice;
      expect(priceDiff).toBe(25);
    });
  });

  describe('BCG Matrix Classification', () => {
    it('should accurately categorize products into Stars, Cash Cows, Opportunities, and Dead Stock', () => {
      const avgUnitsSold = 20;
      const avgMargin = 25;

      const productA = { name: 'Top Earner', unitsSold: 45, marginPct: 35, stock: 30 }; // High volume, High margin => STAR
      const productB = { name: 'Fast Mover', unitsSold: 50, marginPct: 18, stock: 15 }; // High volume, Low margin => CASH COW
      const productC = { name: 'Niche Jewel', unitsSold: 5, marginPct: 40, stock: 20 }; // Low volume, High margin => OPPORTUNITY
      const productD = { name: 'Dust Collector', unitsSold: 0, marginPct: 50, stock: 40 }; // Zero volume => DEAD STOCK

      const classify = (p: typeof productA) => {
        if (p.unitsSold === 0) return 'DEAD_STOCK';
        const isHighVolume = p.unitsSold >= avgUnitsSold * 0.7;
        const isHighMargin = p.marginPct >= avgMargin;
        if (isHighVolume && isHighMargin) return 'STAR';
        if (isHighVolume && !isHighMargin) return 'CASH_COW';
        return 'OPPORTUNITY';
      };

      expect(classify(productA)).toBe('STAR');
      expect(classify(productB)).toBe('CASH_COW');
      expect(classify(productC)).toBe('OPPORTUNITY');
      expect(classify(productD)).toBe('DEAD_STOCK');
    });
  });

  describe('Company Business Health Score Algorithm', () => {
    it('should calculate a healthy score when margins, cash flow, and stock velocity are sound', () => {
      const grossMarginPct = 30;
      const netMarginPct = 12;
      const receivableToRevenue = 0.25;
      const deadStockRatio = 0.05;
      const criticalCount = 0;

      let score = 0;
      // Margin score (max 25)
      if (grossMarginPct >= 25 && netMarginPct >= 10) score += 22;
      // Cash flow score (max 25)
      if (receivableToRevenue <= 0.3) score += 25;
      // Inventory efficiency (max 25)
      if (deadStockRatio <= 0.1) score += 25;
      // Stockout exposure (max 25)
      if (criticalCount === 0) score += 25;

      expect(score).toBe(97);
      expect(score >= 85).toBe(true); // EXCELLENT
    });
  });
});
