import { Prisma, DocumentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { getOwnerIntelligence } from './service-intelligence.js';
import { evaluateCustomerCreditRisk } from '../customers/credit-risk.service.js';
import { detectShrinkageAnomalies } from '../inventory/shrinkage-anomaly.service.js';
import { createPurchase } from '../purchases/service.js';
import { BusinessError, NotFoundError } from '../../lib/errors.js';

export interface ActionCard {
  id: string;
  category: 'RESTOCK' | 'DEBT_COLLECTION' | 'PRICING' | 'SHRINKAGE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  description: string;
  impactMetric: string;
  actionType: 'CREATE_DRAFT_PO' | 'UPDATE_PRICE' | 'SEND_WHATSAPP' | 'ACKNOWLEDGE_SHRINKAGE';
  actionButtonText: string;
  actionPayload: any;
  isCompleted?: boolean;
}

export interface MorningBriefing {
  generatedAt: string;
  greeting: string;
  summary: {
    totalUrgentActions: number;
    capitalAtRisk: number;
    potentialRevenueProtection: number;
    monthlyProfitBoostOpportunity: number;
  };
  actions: ActionCard[];
}

/**
 * Generates the executive 60-second morning action briefing with 1-click execution cards
 */
export async function getMorningActionBriefing(): Promise<MorningBriefing> {
  const [intel, customers, shrinkageData] = await Promise.all([
    getOwnerIntelligence('this_month'),
    prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
        balance: { gt: 0 },
      },
      take: 10,
      orderBy: { balance: 'desc' },
    }),
    detectShrinkageAnomalies(60),
  ]);

  const actions: ActionCard[] = [];
  let capitalAtRisk = 0;
  let potentialRevenueProtection = 0;
  let monthlyProfitBoostOpportunity = 0;

  // 1. Critical Restock Actions
  const criticalRestocks = intel.restockGuide.recommendations.filter(
    (r) => (r.status === 'CRITICAL' || r.status === 'LOW') && r.supplierId
  );

  for (const item of criticalRestocks.slice(0, 2)) {
    potentialRevenueProtection += item.projectedRevenue;
    actions.push({
      id: `ACT-RESTOCK-${item.id.slice(-6)}`,
      category: 'RESTOCK',
      severity: item.status === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      title: `Prevent Out-of-Stock: "${item.name}"`,
      description: `Stock will deplete in ~${item.runwayDays} days at current sales pace. Buffer reorder recommended from supplier ${item.supplierName || 'Primary Supplier'}.`,
      impactMetric: `৳${item.projectedRevenue.toLocaleString()} Revenue Protected`,
      actionType: 'CREATE_DRAFT_PO',
      actionButtonText: `Create Draft PO (${item.suggestedReorderQty} units, ৳${item.estimatedCost.toLocaleString()})`,
      actionPayload: {
        supplierId: item.supplierId,
        supplierName: item.supplierName,
        productId: item.id,
        productName: item.name,
        quantity: item.suggestedReorderQty,
        unitCost: item.unitCost,
        estimatedCost: item.estimatedCost,
      },
    });
  }

  // 2. High-Risk Debt Collection Actions
  for (const c of customers.slice(0, 3)) {
    try {
      const risk = await evaluateCustomerCreditRisk(c.id);
      if (risk.balance > 0 && (risk.riskCategory === 'HIGH_RISK' || risk.oldestUnpaidDays >= 14)) {
        capitalAtRisk += risk.balance;
        actions.push({
          id: `ACT-DEBT-${c.id.slice(-6)}`,
          category: 'DEBT_COLLECTION',
          severity: risk.riskCategory === 'HIGH_RISK' ? 'CRITICAL' : 'HIGH',
          title: `Overdue Collection: ${risk.customerName}`,
          description: `Outstanding balance of ৳${risk.balance.toLocaleString()} pending (oldest bill due ${risk.oldestUnpaidDays} days). Repayment rating: ${risk.riskScore}/100.`,
          impactMetric: `৳${risk.balance.toLocaleString()} Overdue Capital`,
          actionType: 'SEND_WHATSAPP',
          actionButtonText: 'Send WhatsApp Reminder',
          actionPayload: {
            customerId: risk.customerId,
            customerName: risk.customerName,
            phone: risk.phone,
            balance: risk.balance,
            url: risk.whatsAppReminderUrl,
            message: risk.reminderMessage,
          },
        });
      }
    } catch {
      // Continue next customer if profile eval fails
    }
  }

  // 3. Margin & Price Optimization Actions
  const topPricingOps = intel.pricingOptimizer.recommendations.filter(
    (p) => p.type === 'RAISE_MARGIN' || p.type === 'PREMIUM_BUMP'
  );

  for (const p of topPricingOps.slice(0, 2)) {
    monthlyProfitBoostOpportunity += p.projectedMonthlyProfitGain;
    actions.push({
      id: `ACT-PRICE-${p.id.slice(-6)}`,
      category: 'PRICING',
      severity: 'HIGH',
      title: `Optimize Profit Margin: "${p.name}"`,
      description: `Current margin is ${p.currentMarginPct}%. Adjusting selling price to ৳${p.recommendedSellingPrice.toLocaleString()} captures extra margin with low volume resistance.`,
      impactMetric: `+৳${p.projectedMonthlyProfitGain.toLocaleString()}/mo Net Profit`,
      actionType: 'UPDATE_PRICE',
      actionButtonText: `Apply New Price (৳${p.recommendedSellingPrice.toLocaleString()})`,
      actionPayload: {
        productId: p.id,
        productName: p.name,
        currentPrice: p.currentSellingPrice,
        recommendedPrice: p.recommendedSellingPrice,
        projectedMonthlyProfitGain: p.projectedMonthlyProfitGain,
      },
    });
  }

  // 4. Shrinkage & Loss Prevention Anomalies
  if (shrinkageData.anomalies.length > 0) {
    const topAnomaly = shrinkageData.anomalies[0];
    actions.push({
      id: `ACT-SHRINK-${topAnomaly.productId.slice(-6)}`,
      category: 'SHRINKAGE',
      severity: topAnomaly.severity,
      title: `Inventory Discrepancy Flag: "${topAnomaly.productName}"`,
      description: topAnomaly.explanation,
      impactMetric: `৳${topAnomaly.totalLossValue.toLocaleString()} Written Off`,
      actionType: 'ACKNOWLEDGE_SHRINKAGE',
      actionButtonText: 'Acknowledge & Schedule Audit',
      actionPayload: {
        productId: topAnomaly.productId,
        productName: topAnomaly.productName,
        lossValue: topAnomaly.totalLossValue,
        anomalyId: topAnomaly.id,
      },
    });
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';

  return {
    generatedAt: new Date().toISOString(),
    greeting,
    summary: {
      totalUrgentActions: actions.length,
      capitalAtRisk,
      potentialRevenueProtection,
      monthlyProfitBoostOpportunity,
    },
    actions,
  };
}

/**
 * 1-Click Execution Handler for Action Cards
 */
export async function executeActionCard(
  actionType: 'CREATE_DRAFT_PO' | 'UPDATE_PRICE' | 'RESOLVE_ALERT',
  payload: any
): Promise<{ success: boolean; message: string; data?: any }> {
  switch (actionType) {
    case 'CREATE_DRAFT_PO': {
      if (!payload.supplierId || !payload.productId || !payload.quantity) {
        throw new BusinessError('Incomplete draft PO payload');
      }

      const purchase = await createPurchase({
        supplierId: payload.supplierId,
        purchaseDate: new Date().toISOString(),
        status: 'DRAFT',
        items: [
          {
            productId: payload.productId,
            quantity: payload.quantity,
            unitCost: payload.unitCost,
            discount: 0,
            tax: 0,
          },
        ],
        paidAmount: 0,
        notes: `Auto-drafted by StockPilot Executive Action Briefing to prevent stockout of "${payload.productName}".`,
      });

      return {
        success: true,
        message: `Draft Purchase Order #${purchase.purchaseNumber} created for ${payload.quantity} units of "${payload.productName}".`,
        data: { purchaseId: purchase.id, purchaseNumber: purchase.purchaseNumber },
      };
    }

    case 'UPDATE_PRICE': {
      if (!payload.productId || !payload.recommendedPrice) {
        throw new BusinessError('Incomplete price update payload');
      }

      const updated = await prisma.product.update({
        where: { id: payload.productId },
        data: {
          sellingPrice: new Prisma.Decimal(payload.recommendedPrice),
        },
      });

      return {
        success: true,
        message: `Selling price of "${updated.name}" updated from ৳${payload.currentPrice} to ৳${payload.recommendedPrice}.`,
        data: { productId: updated.id, newSellingPrice: updated.sellingPrice.toNumber() },
      };
    }

    case 'RESOLVE_ALERT': {
      return {
        success: true,
        message: 'Alert acknowledged and archived.',
      };
    }

    default:
      throw new BusinessError(`Unsupported action type: ${actionType}`);
  }
}
