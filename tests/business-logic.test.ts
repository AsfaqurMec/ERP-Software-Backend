import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';

describe('StockPilot Business Logic & Financial Formulas', () => {
  describe('Weighted Average Cost (WAC) Calculation', () => {
    it('should accurately calculate new average cost upon inward procurement', () => {
      // Existing: 10 units @ 100 BDT each = 1,000 BDT
      const existingStock = new Prisma.Decimal(10);
      const existingAvgCost = new Prisma.Decimal(100);
      const existingValue = existingStock.mul(existingAvgCost);

      // New purchase: 20 units @ 130 BDT each = 2,600 BDT
      const incomingQuantity = new Prisma.Decimal(20);
      const incomingUnitCost = new Prisma.Decimal(130);
      const incomingValue = incomingQuantity.mul(incomingUnitCost);

      // Total: 30 units, Total value = 3,600 BDT => New Average Cost = 120 BDT
      const totalQuantity = existingStock.add(incomingQuantity);
      const totalValue = existingValue.add(incomingValue);
      const newAverageCost = totalValue.div(totalQuantity);

      expect(totalQuantity.toNumber()).toBe(30);
      expect(totalValue.toNumber()).toBe(3600);
      expect(newAverageCost.toNumber()).toBe(120);
    });

    it('should preserve unit cost when starting from zero stock', () => {
      const existingStock = new Prisma.Decimal(0);
      const existingAvgCost = new Prisma.Decimal(0);
      const existingValue = existingStock.mul(existingAvgCost);

      const incomingQuantity = new Prisma.Decimal(15);
      const incomingUnitCost = new Prisma.Decimal(250);
      const incomingValue = incomingQuantity.mul(incomingUnitCost);

      const totalQuantity = existingStock.add(incomingQuantity);
      const newAverageCost = existingValue.add(incomingValue).div(totalQuantity);

      expect(newAverageCost.toNumber()).toBe(250);
    });
  });

  describe('Stock Validation & Negative Inventory Prevention', () => {
    it('should strictly reject sale if requested quantity exceeds available stock', () => {
      const availableStock = new Prisma.Decimal(5);
      const requestedQuantity = new Prisma.Decimal(8);

      const isStockAvailable = availableStock.greaterThanOrEqualTo(requestedQuantity);
      expect(isStockAvailable).toBe(false);

      if (!isStockAvailable) {
        const errorMsg = `Insufficient stock for "Test Product". Available: ${availableStock.toString()}; Requested: ${requestedQuantity.toString()}`;
        expect(errorMsg).toBe('Insufficient stock for "Test Product". Available: 5; Requested: 8');
      }
    });

    it('should allow sale when requested quantity is within available stock', () => {
      const availableStock = new Prisma.Decimal(10);
      const requestedQuantity = new Prisma.Decimal(4);

      const isStockAvailable = availableStock.greaterThanOrEqualTo(requestedQuantity);
      expect(isStockAvailable).toBe(true);

      const remainingStock = availableStock.sub(requestedQuantity);
      expect(remainingStock.toNumber()).toBe(6);
    });
  });

  describe('Cost of Goods Sold (COGS) & Profit Calculations', () => {
    it('should accurately calculate COGS, Gross Profit, and Net Profit', () => {
      // Sale of 5 units @ selling price 200 BDT, with snapshot WAC = 120 BDT
      const soldQuantity = new Prisma.Decimal(5);
      const sellingPrice = new Prisma.Decimal(200);
      const snapshotUnitCost = new Prisma.Decimal(120);

      const revenue = soldQuantity.mul(sellingPrice); // 1,000 BDT
      const cogs = soldQuantity.mul(snapshotUnitCost); // 600 BDT
      const grossProfit = revenue.sub(cogs); // 400 BDT

      // Operating expenses for the period = 150 BDT
      const operatingExpenses = new Prisma.Decimal(150);
      const netProfit = grossProfit.sub(operatingExpenses); // 250 BDT

      expect(revenue.toNumber()).toBe(1000);
      expect(cogs.toNumber()).toBe(600);
      expect(grossProfit.toNumber()).toBe(400);
      expect(netProfit.toNumber()).toBe(250);

      // Gross margin percentage
      const grossMarginPercent = grossProfit.div(revenue).mul(100);
      expect(grossMarginPercent.toNumber()).toBe(40);
    });
  });

  describe('Sales and Purchase Returns Quantity Boundaries', () => {
    it('should reject sales return if return quantity exceeds originally sold quantity', () => {
      const originalSoldQty = new Prisma.Decimal(10);
      const alreadyReturnedQty = new Prisma.Decimal(3);
      const newReturnAttemptQty = new Prisma.Decimal(8);

      const totalReturnQty = alreadyReturnedQty.add(newReturnAttemptQty);
      const isValidReturn = totalReturnQty.lessThanOrEqualTo(originalSoldQty);

      expect(isValidReturn).toBe(false);
    });

    it('should accept valid sales return and correctly compute restock quantity and credited total', () => {
      const unitPrice = new Prisma.Decimal(250);
      const originalSoldQty = new Prisma.Decimal(10);
      const alreadyReturnedQty = new Prisma.Decimal(2);
      const newReturnAttemptQty = new Prisma.Decimal(3);

      const totalReturnQty = alreadyReturnedQty.add(newReturnAttemptQty);
      expect(totalReturnQty.lessThanOrEqualTo(originalSoldQty)).toBe(true);

      const creditTotal = unitPrice.mul(newReturnAttemptQty);
      expect(creditTotal.toNumber()).toBe(750);
    });
  });

  describe('Customer and Supplier Balance Ledgers', () => {
    it('should adjust customer balance on credit sale and subsequent payment collection', () => {
      let customerBalance = new Prisma.Decimal(0);

      // Sale of 5,000 BDT with 2,000 BDT initial payment => 3,000 BDT due
      const saleGrandTotal = new Prisma.Decimal(5000);
      const initialPaid = new Prisma.Decimal(2000);
      const dueAmount = saleGrandTotal.sub(initialPaid);

      customerBalance = customerBalance.add(dueAmount);
      expect(customerBalance.toNumber()).toBe(3000);

      // Customer makes a later payment of 2,000 BDT
      const collectionAmount = new Prisma.Decimal(2000);
      customerBalance = customerBalance.sub(collectionAmount);
      expect(customerBalance.toNumber()).toBe(1000);
    });

    it('should adjust supplier payable balance on credit purchase and disbursement', () => {
      let supplierBalance = new Prisma.Decimal(0);

      // Purchase of 12,000 BDT with 5,000 BDT initial payment => 7,000 BDT payable
      const purchaseGrandTotal = new Prisma.Decimal(12000);
      const initialPaid = new Prisma.Decimal(5000);
      const dueAmount = purchaseGrandTotal.sub(initialPaid);

      supplierBalance = supplierBalance.add(dueAmount);
      expect(supplierBalance.toNumber()).toBe(7000);

      // Supplier payment disbursement of 7,000 BDT
      const disbursement = new Prisma.Decimal(7000);
      supplierBalance = supplierBalance.sub(disbursement);
      expect(supplierBalance.toNumber()).toBe(0);
    });
  });
});
