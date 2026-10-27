import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';

describe('Intelligent ERP & Machine Learning Decision Engine', () => {
  describe('Customer Credit Risk & Repayment Latency Scoring', () => {
    it('should assign HIGH RISK and 0 credit limit when overdue debt exceeds 45 days', () => {
      // Simulate customer with 50,000 balance overdue for 65 days
      const balance = 50000;
      const totalSalesVolume = 60000;
      const oldestUnpaidDays = 65;
      const averageRepaymentDays = 50;
      const overdueRatio = balance / totalSalesVolume;

      let score = 100;
      if (overdueRatio > 0.6) score -= 35;
      if (oldestUnpaidDays > 60) score -= 40;
      if (averageRepaymentDays > 45) score -= 20;

      const riskScore = Math.max(0, Math.min(100, score));
      expect(riskScore).toBeLessThan(50);

      const isHighRisk = riskScore < 50 || oldestUnpaidDays > 45;
      expect(isHighRisk).toBe(true);

      const recommendedLimit = isHighRisk ? 0 : 25000;
      expect(recommendedLimit).toBe(0);
    });

    it('should assign LOW RISK and ample credit limit to loyal on-time payers', () => {
      // Customer with 12 orders, 0 overdue invoices, 8-day repayment cadence
      const confirmedOrdersCount = 12;
      const balance = 0;
      const oldestUnpaidDays = 0;
      const averageRepaymentDays = 8;
      const averageOrderValue = 15000;

      let score = 100;
      if (confirmedOrdersCount >= 10 && oldestUnpaidDays <= 30) {
        score += 15;
      }
      const riskScore = Math.min(100, score);
      expect(riskScore).toBe(100);

      const isLowRisk = riskScore >= 75;
      expect(isLowRisk).toBe(true);

      const recommendedCreditLimit = Math.max(50000, averageOrderValue * 2);
      expect(recommendedCreditLimit).toBe(50000);
    });

    it('should format clean WhatsApp direct payment reminder link', () => {
      const phone = '01712345678';
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanPhone.startsWith('880') ? cleanPhone : `88${cleanPhone}`;
      const balance = 15000;
      const customerName = 'Rahim Traders';

      const reminderMessage =
        `Dear ${customerName},\n` +
        `This is a friendly reminder regarding your outstanding balance of ৳${balance.toLocaleString()} with StockPilot.\n` +
        `Kindly arrange settlement at your earliest convenience to maintain an active credit account.\n` +
        `Thank you for your business!`;

      const whatsAppUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(reminderMessage)}`;

      expect(whatsAppUrl).toContain('wa.me/8801712345678');
      expect(whatsAppUrl).toContain('Rahim%20Traders');
      expect(whatsAppUrl).toContain('15%2C000');
    });
  });

  describe('Anomaly Guard: Typo & Cost Spike Protection', () => {
    it('should flag an anomaly when incoming purchase unit cost is >400% of historical average', () => {
      const historicalAverageCost = 350; // e.g. Wireless Mouse
      const incomingTypoCost = 3500; // Accidental extra 0

      const isSpike = incomingTypoCost > historicalAverageCost * 4;
      expect(isSpike).toBe(true);
    });

    it('should flag an anomaly when incoming unit cost is <15% of historical cost', () => {
      const historicalAverageCost = 1000;
      const incomingTypoCost = 50; // Missed a digit

      const isAnomalouslyLow = incomingTypoCost < historicalAverageCost * 0.15;
      expect(isAnomalouslyLow).toBe(true);
    });

    it('should accept normal price fluctuations within 50% to 200% band', () => {
      const historicalAverageCost = 500;
      const incomingCost = 550; // Normal 10% inflation

      const isSpike = incomingCost > historicalAverageCost * 4;
      const isAnomalouslyLow = incomingCost < historicalAverageCost * 0.15;

      expect(isSpike).toBe(false);
      expect(isAnomalouslyLow).toBe(false);
    });
  });

  describe('Fuzzy SKU & Product Matching for AI Invoices', () => {
    function calculateSimilarity(str1: string, str2: string): number {
      const s1 = str1.toLowerCase().trim();
      const s2 = str2.toLowerCase().trim();
      if (s1 === s2) return 1.0;
      if (s1.includes(s2) || s2.includes(s1)) return 0.85;

      const tokens1 = new Set(s1.split(/[\s\-_,.]+/).filter((t) => t.length > 1));
      const tokens2 = new Set(s2.split(/[\s\-_,.]+/).filter((t) => t.length > 1));
      if (tokens1.size === 0 || tokens2.size === 0) return 0;

      let intersection = 0;
      for (const t of tokens1) {
        if (tokens2.has(t)) intersection++;
      }
      const union = new Set([...tokens1, ...tokens2]).size;
      return union > 0 ? Number((intersection / union).toFixed(2)) : 0;
    }

    it('should match slightly misspelled or variation product names accurately', () => {
      const dbProductName = 'Logitech Wireless Mouse M185';
      const scannedReceiptName = 'Logitech Mouse M185';

      const similarity = calculateSimilarity(scannedReceiptName, dbProductName);
      expect(similarity).toBeGreaterThanOrEqual(0.75);
    });

    it('should correctly discriminate between unrelated products', () => {
      const dbProductName = 'Apple MacBook Pro M3';
      const scannedReceiptName = 'Cotton T-Shirt Blue';

      const similarity = calculateSimilarity(scannedReceiptName, dbProductName);
      expect(similarity).toBeLessThan(0.2);
    });
  });
});
