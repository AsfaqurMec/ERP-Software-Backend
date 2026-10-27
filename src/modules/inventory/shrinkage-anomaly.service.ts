import { MovementType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface ShrinkageAnomaly {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  totalAdjustedOutQty: number;
  totalLossValue: number;
  incidentCount: number;
  anomalyScore: number; // 0 - 100
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  reasonSummary: string;
  explanation: string;
  lastIncidentDate: string;
}

export async function detectShrinkageAnomalies(daysLookback: number = 90): Promise<{
  totalLossValue: number;
  flaggedIncidentsCount: number;
  anomalies: ShrinkageAnomaly[];
}> {
  const fromDate = new Date(Date.now() - daysLookback * 24 * 60 * 60 * 1000);

  // Fetch negative adjustments (shrinkage, lost, damage, audit corrections)
  const [movements, products] = await Promise.all([
    prisma.stockMovement.findMany({
      where: {
        type: { in: [MovementType.ADJUSTMENT_OUT, MovementType.SALES_RETURN] },
        movementDate: { gte: fromDate },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: { movementDate: 'desc' },
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, sku: true, stock: true, averageCost: true, purchasePrice: true },
    }),
  ]);

  const productPriceMap = new Map(
    products.map((p) => [
      p.id,
      p.averageCost.toNumber() > 0 ? p.averageCost.toNumber() : p.purchasePrice.toNumber(),
    ])
  );

  // Group by product
  const productGroupMap = new Map<
    string,
    {
      productName: string;
      sku: string;
      category: string;
      totalQty: number;
      incidents: number;
      reasons: Set<string>;
      lastDate: Date;
    }
  >();

  for (const m of movements) {
    if (m.type === MovementType.ADJUSTMENT_OUT) {
      const existing = productGroupMap.get(m.productId) || {
        productName: m.product.name,
        sku: m.product.sku,
        category: m.product.category?.name || 'General',
        totalQty: 0,
        incidents: 0,
        reasons: new Set<string>(),
        lastDate: m.movementDate,
      };

      existing.totalQty += m.quantity.toNumber();
      existing.incidents += 1;
      if (m.reason) existing.reasons.add(m.reason);
      if (m.movementDate > existing.lastDate) existing.lastDate = m.movementDate;

      productGroupMap.set(m.productId, existing);
    }
  }

  const anomalies: ShrinkageAnomaly[] = [];
  let totalOverallLoss = 0;

  for (const [prodId, group] of productGroupMap.entries()) {
    const unitCost = productPriceMap.get(prodId) || 0;
    const lossValue = Math.round(group.totalQty * unitCost);
    totalOverallLoss += lossValue;

    // Statistical Anomaly Heuristic:
    // Outlier if loss value > 10,000 BDT or incidents >= 3 or quantity > 10
    let anomalyScore = 0;
    if (lossValue >= 20000) anomalyScore += 45;
    else if (lossValue >= 8000) anomalyScore += 25;
    else if (lossValue > 0) anomalyScore += 10;

    if (group.incidents >= 4) anomalyScore += 35;
    else if (group.incidents >= 2) anomalyScore += 20;

    if (group.totalQty >= 15) anomalyScore += 20;

    anomalyScore = Math.min(100, anomalyScore);

    if (anomalyScore >= 40) {
      let severity: ShrinkageAnomaly['severity'] = 'INFO';
      if (anomalyScore >= 75) severity = 'CRITICAL';
      else if (anomalyScore >= 55) severity = 'WARNING';

      const reasonsText = Array.from(group.reasons).join(', ') || 'Inventory Adjustment';
      const explanation =
        lossValue >= 20000
          ? `High-value inventory write-off: ৳${lossValue.toLocaleString()} lost across ${group.incidents} adjustments. Immediate physical stock audit recommended.`
          : `Frequent shrinkage discrepancy: ${group.incidents} repeated adjustments (${group.totalQty} units written off). Check warehouse logging protocol.`;

      anomalies.push({
        id: `ANOM-${prodId.slice(-6)}`,
        productId: prodId,
        productName: group.productName,
        sku: group.sku,
        category: group.category,
        totalAdjustedOutQty: group.totalQty,
        totalLossValue: lossValue,
        incidentCount: group.incidents,
        anomalyScore,
        severity,
        reasonSummary: reasonsText,
        explanation,
        lastIncidentDate: group.lastDate.toISOString().slice(0, 10),
      });
    }
  }

  anomalies.sort((a, b) => b.totalLossValue - a.totalLossValue);

  return {
    totalLossValue: totalOverallLoss,
    flaggedIncidentsCount: anomalies.length,
    anomalies,
  };
}
