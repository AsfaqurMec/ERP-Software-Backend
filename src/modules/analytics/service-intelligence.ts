import { DocumentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { parseTimeframe } from './service.js';

export interface IntelligenceOverview {
  healthScore: {
    totalScore: number; // 0 - 100
    rating: 'CRITICAL' | 'NEEDS_ATTENTION' | 'GOOD' | 'EXCELLENT';
    breakdown: {
      profitMarginScore: number; // max 25
      cashFlowScore: number; // max 25
      inventoryEfficiencyScore: number; // max 25
      revenueMomentumScore: number; // max 25
    };
    insights: string[];
  };
  executiveHighlights: {
    topGrowthEngine: {
      name: string;
      category: string;
      revenue: number;
      profit: number;
      marginPct: number;
    } | null;
    cashTrappedInDeadStock: {
      productCount: number;
      totalValue: number;
      topItems: { id: string; name: string; sku: string; stock: number; trappedValue: number }[];
    };
    criticalStockoutAlerts: {
      count: number;
      potentialLostRevenue: number;
    };
    operatingExpenseRatio: {
      ratioPct: number; // expenses / grossProfit * 100
      status: 'OPTIMAL' | 'MODERATE' | 'HIGH';
      totalExpenses: number;
    };
  };
  restockGuide: {
    summary: {
      criticalCount: number;
      lowCount: number;
      healthyCount: number;
      overstockedCount: number;
      totalCapitalNeeded: number;
      projectedProfitReturn: number;
    };
    recommendations: {
      id: string;
      name: string;
      sku: string;
      category: string;
      supplierName: string | null;
      supplierId: string | null;
      currentStock: number;
      minimumStock: number;
      dailyRunRate: number; // units sold per day
      runwayDays: number; // days of stock remaining
      status: 'CRITICAL' | 'LOW' | 'HEALTHY' | 'OVERSTOCKED';
      suggestedReorderQty: number;
      unitCost: number;
      sellingPrice: number;
      estimatedCost: number; // suggestedReorderQty * unitCost
      projectedRevenue: number; // suggestedReorderQty * sellingPrice
      projectedProfit: number; // projectedRevenue - estimatedCost
      roiPct: number;
      actionNote: string;
    }[];
  };
  pricingOptimizer: {
    summary: {
      underpricedCount: number;
      premiumOpportunityCount: number;
      stalePriceCount: number;
      potentialMonthlyProfitBoost: number;
    };
    recommendations: {
      id: string;
      name: string;
      sku: string;
      category: string;
      currentCost: number;
      currentSellingPrice: number;
      currentMarginPct: number;
      recommendedSellingPrice: number;
      recommendedMarginPct: number;
      priceAdjustment: number;
      adjustmentPct: number;
      type: 'RAISE_MARGIN' | 'PREMIUM_BUMP' | 'CLEARANCE_DISCOUNT' | 'OPTIMAL';
      projectedMonthlyProfitGain: number;
      rationale: string;
    }[];
  };
  bcgMatrix: {
    stars: {
      count: number;
      revenue: number;
      profit: number;
      advice: string;
      products: { id: string; name: string; sku: string; unitsSold: number; revenue: number; profit: number; marginPct: number; stock: number }[];
    };
    cashCows: {
      count: number;
      revenue: number;
      profit: number;
      advice: string;
      products: { id: string; name: string; sku: string; unitsSold: number; revenue: number; profit: number; marginPct: number; stock: number }[];
    };
    opportunities: {
      count: number;
      revenue: number;
      profit: number;
      advice: string;
      products: { id: string; name: string; sku: string; unitsSold: number; revenue: number; profit: number; marginPct: number; stock: number }[];
    };
    deadStock: {
      count: number;
      trappedCapital: number;
      advice: string;
      products: { id: string; name: string; sku: string; stock: number; unitCost: number; trappedValue: number }[];
    };
  };
  profitLevers: {
    crossSellBundles: {
      title: string;
      description: string;
      items: string[];
      expectedBenefit: string;
    }[];
    debtCollectionStrategy: {
      totalCustomerDue: number;
      highRiskDebtors: { id: string; name: string; phone: string | null; balance: number; lastSaleDate: string | null }[];
      actionGuide: string;
    };
    expenseOptimization: {
      topExpenseCategories: { category: string; amount: number; pctOfTotal: number }[];
      recommendation: string;
    };
  };
  futureProjections: {
    historicalDays: number;
    dailyAvgRevenue: number;
    dailyAvgProfit: number;
    forecast30Days: {
      projectedRevenue: number;
      projectedCogs: number;
      projectedExpenses: number;
      projectedNetProfit: number;
    };
    forecast90Days: {
      projectedRevenue: number;
      projectedCogs: number;
      projectedExpenses: number;
      projectedNetProfit: number;
    };
    scalingRoadmap: {
      step: number;
      title: string;
      impact: 'HIGH' | 'CRITICAL' | 'MEDIUM';
      detail: string;
    }[];
  };
}

export async function getOwnerIntelligence(
  timeframe?: string,
  customFrom?: string,
  customTo?: string
): Promise<IntelligenceOverview> {
  const { from, to } = parseTimeframe(timeframe, customFrom, customTo);

  // Determine span in days (minimum 1 day to prevent div by zero)
  const diffTime = Math.abs(to.getTime() - from.getTime());
  const periodDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const [
    sales,
    purchases,
    expenses,
    products,
    categories,
    customers,
    suppliers,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: {
        status: DocumentStatus.CONFIRMED,
        saleDate: { gte: from, lte: to },
      },
      include: {
        items: true,
        customer: true,
      },
      orderBy: { saleDate: 'asc' },
    }),
    prisma.purchase.findMany({
      where: {
        status: DocumentStatus.CONFIRMED,
        purchaseDate: { gte: from, lte: to },
      },
      include: {
        items: true,
        supplier: true,
      },
    }),
    prisma.expense.findMany({
      where: {
        date: { gte: from, lte: to },
      },
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        category: true,
        supplier: true,
      },
    }),
    prisma.category.findMany({
      where: { status: 'ACTIVE' },
    }),
    prisma.customer.findMany({
      where: { status: 'ACTIVE' },
      include: {
        sales: {
          where: { status: DocumentStatus.CONFIRMED },
          orderBy: { saleDate: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.supplier.findMany({
      where: { status: 'ACTIVE' },
    }),
  ]);

  // Aggregate high-level financials
  let totalRevenue = 0;
  let totalCogs = 0;
  let totalExpenses = 0;
  let totalDiscounts = 0;

  for (const s of sales) {
    totalRevenue += s.grandTotal.toNumber();
    totalCogs += s.cogs.toNumber();
    totalDiscounts += s.discount.toNumber();
  }

  const categoryExpenseMap = new Map<string, number>();
  for (const e of expenses) {
    const amt = e.amount.toNumber();
    totalExpenses += amt;
    categoryExpenseMap.set(e.category, (categoryExpenseMap.get(e.category) || 0) + amt);
  }

  const grossProfit = totalRevenue - totalCogs;
  const netProfit = grossProfit - totalExpenses;
  const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Track product-level sales in period
  const productSalesMap = new Map<
    string,
    {
      unitsSold: number;
      revenue: number;
      profit: number;
      orderCount: number;
    }
  >();

  for (const s of sales) {
    for (const item of s.items) {
      const qty = item.quantity.toNumber();
      const rev = item.total.toNumber();
      const cost = item.unitCost.toNumber() * qty;
      const profit = rev - cost;

      const current = productSalesMap.get(item.productId) || {
        unitsSold: 0,
        revenue: 0,
        profit: 0,
        orderCount: 0,
      };

      current.unitsSold += qty;
      current.revenue += rev;
      current.profit += profit;
      current.orderCount += 1;
      productSalesMap.set(item.productId, current);
    }
  }

  // Working capital
  let totalCustomerDue = 0;
  for (const c of customers) {
    totalCustomerDue += c.balance.toNumber();
  }

  let totalSupplierDue = 0;
  for (const s of suppliers) {
    totalSupplierDue += s.balance.toNumber();
  }

  // -------------------------------------------------------------
  // 1. PRODUCT AUDIT & RESTOCK ADVISOR
  // -------------------------------------------------------------
  let totalStockValuation = 0;
  let trappedCapitalDeadStock = 0;
  const deadStockProducts: { id: string; name: string; sku: string; stock: number; unitCost: number; trappedValue: number }[] = [];
  const restockRecommendations: IntelligenceOverview['restockGuide']['recommendations'] = [];
  const pricingRecommendations: IntelligenceOverview['pricingOptimizer']['recommendations'] = [];

  const classifiedProducts: {
    id: string;
    name: string;
    sku: string;
    category: string;
    stock: number;
    unitsSold: number;
    revenue: number;
    profit: number;
    marginPct: number;
    unitCost: number;
    sellingPrice: number;
  }[] = [];

  let criticalCount = 0;
  let lowCount = 0;
  let healthyCount = 0;
  let overstockedCount = 0;
  let totalCapitalNeededForReorder = 0;
  let projectedProfitFromReorders = 0;
  let potentialLostRevenueCritical = 0;

  for (const prod of products) {
    const stock = prod.stock.toNumber();
    const minStock = prod.minimumStock.toNumber();
    const unitCost = prod.averageCost.toNumber() > 0 ? prod.averageCost.toNumber() : prod.purchasePrice.toNumber();
    const sellingPrice = prod.sellingPrice.toNumber();
    const perf = productSalesMap.get(prod.id) || { unitsSold: 0, revenue: 0, profit: 0, orderCount: 0 };

    const prodValuation = stock * unitCost;
    totalStockValuation += prodValuation;

    const marginPct = sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : 0;

    classifiedProducts.push({
      id: prod.id,
      name: prod.name,
      sku: prod.sku,
      category: prod.category?.name || 'General',
      stock,
      unitsSold: perf.unitsSold,
      revenue: perf.revenue,
      profit: perf.profit,
      marginPct,
      unitCost,
      sellingPrice,
    });

    // Run rate & inventory runway
    const dailyRunRate = perf.unitsSold / periodDays;
    let runwayDays = 999;
    if (dailyRunRate > 0) {
      runwayDays = Math.round(stock / dailyRunRate);
    } else if (stock === 0) {
      runwayDays = 0;
    }

    // Determine Restock Status
    let status: 'CRITICAL' | 'LOW' | 'HEALTHY' | 'OVERSTOCKED' = 'HEALTHY';
    let suggestedReorderQty = 0;
    let actionNote = '';

    if (stock <= 0 && perf.unitsSold > 0) {
      status = 'CRITICAL';
      criticalCount++;
      // 30 days buffer based on run rate + safety stock
      suggestedReorderQty = Math.max(minStock, Math.ceil(dailyRunRate * 30));
      actionNote = 'Out of stock with active customer demand! Immediate reorder required to stop revenue loss.';
      potentialLostRevenueCritical += dailyRunRate * 14 * sellingPrice; // Estimated 14 days lost sales
    } else if (dailyRunRate > 0 && runwayDays <= 7) {
      status = 'CRITICAL';
      criticalCount++;
      suggestedReorderQty = Math.max(minStock, Math.ceil(dailyRunRate * 30 - stock));
      actionNote = `Critical inventory level! Stock will run out in ~${runwayDays} days at current sales pace.`;
      potentialLostRevenueCritical += dailyRunRate * 7 * sellingPrice;
    } else if (stock <= minStock || (dailyRunRate > 0 && runwayDays <= 14)) {
      status = 'LOW';
      lowCount++;
      suggestedReorderQty = Math.max(minStock * 2 - stock, Math.ceil(dailyRunRate * 30 - stock));
      actionNote = `Below safety stock threshold. Restock recommended to maintain a 30-day buffer.`;
    } else if (dailyRunRate === 0 && stock > 0) {
      status = 'OVERSTOCKED';
      overstockedCount++;
      trappedCapitalDeadStock += prodValuation;
      deadStockProducts.push({
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        stock,
        unitCost,
        trappedValue: prodValuation,
      });
      actionNote = 'Zero sales in this period. Do not reorder. Consider bundling or promotional discount.';
    } else if (runwayDays > 60 && stock > minStock * 2) {
      status = 'OVERSTOCKED';
      overstockedCount++;
      actionNote = `Overstocked (~${runwayDays} days of supply on hand). Pause reordering until inventory normalizes.`;
    } else {
      status = 'HEALTHY';
      healthyCount++;
      actionNote = 'Stock levels are balanced relative to sales velocity.';
    }

    if (suggestedReorderQty > 0) {
      const estimatedCost = suggestedReorderQty * unitCost;
      const projectedRevenue = suggestedReorderQty * sellingPrice;
      const projectedProfit = projectedRevenue - estimatedCost;
      const roiPct = estimatedCost > 0 ? (projectedProfit / estimatedCost) * 100 : 0;

      totalCapitalNeededForReorder += estimatedCost;
      projectedProfitFromReorders += projectedProfit;

      restockRecommendations.push({
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        category: prod.category?.name || 'General',
        supplierName: prod.supplier?.name || null,
        supplierId: prod.supplierId || null,
        currentStock: stock,
        minimumStock: minStock,
        dailyRunRate: Number(dailyRunRate.toFixed(2)),
        runwayDays: runwayDays === 999 ? 999 : runwayDays,
        status,
        suggestedReorderQty,
        unitCost,
        sellingPrice,
        estimatedCost: Math.round(estimatedCost),
        projectedRevenue: Math.round(projectedRevenue),
        projectedProfit: Math.round(projectedProfit),
        roiPct: Number(roiPct.toFixed(1)),
        actionNote,
      });
    }

    // -------------------------------------------------------------
    // PRICING STRATEGY DIAGNOSTICS
    // -------------------------------------------------------------
    if (sellingPrice > 0) {
      // 1. Underpriced / razor-thin margin alert (< 15% gross margin)
      if (marginPct < 15 && unitCost > 0 && perf.unitsSold > 0) {
        // Recommend raising price to at least 25% target margin
        const targetMargin = 0.25;
        const recommendedPrice = Math.ceil(unitCost / (1 - targetMargin));
        const priceDiff = recommendedPrice - sellingPrice;
        const estGain = priceDiff * (perf.unitsSold / periodDays) * 30;

        pricingRecommendations.push({
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
          category: prod.category?.name || 'General',
          currentCost: unitCost,
          currentSellingPrice: sellingPrice,
          currentMarginPct: Number(marginPct.toFixed(1)),
          recommendedSellingPrice: recommendedPrice,
          recommendedMarginPct: Math.round(targetMargin * 100),
          priceAdjustment: priceDiff,
          adjustmentPct: Number(((priceDiff / sellingPrice) * 100).toFixed(1)),
          type: 'RAISE_MARGIN',
          projectedMonthlyProfitGain: Math.round(estGain),
          rationale: `Current margin (${marginPct.toFixed(1)}%) is too low. Adjusting price to reach standard 25% margin can boost monthly profits by ~৳${Math.round(estGain).toLocaleString()} with low volume resistance.`,
        });
      }
      // 2. Premium pricing bump opportunity (High sales volume, high popularity, margin 20-35%)
      else if (perf.unitsSold >= 15 && marginPct >= 18 && marginPct <= 35) {
        // Safe 5% price bump test
        const bumpPct = 0.05;
        const recommendedPrice = Math.ceil(sellingPrice * (1 + bumpPct));
        const priceDiff = recommendedPrice - sellingPrice;
        const estGain = priceDiff * (perf.unitsSold / periodDays) * 30;

        pricingRecommendations.push({
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
          category: prod.category?.name || 'General',
          currentCost: unitCost,
          currentSellingPrice: sellingPrice,
          currentMarginPct: Number(marginPct.toFixed(1)),
          recommendedSellingPrice: recommendedPrice,
          recommendedMarginPct: Number((((recommendedPrice - unitCost) / recommendedPrice) * 100).toFixed(1)),
          priceAdjustment: priceDiff,
          adjustmentPct: 5,
          type: 'PREMIUM_BUMP',
          projectedMonthlyProfitGain: Math.round(estGain),
          rationale: `Top performer with proven customer inelasticity. A subtle 5% price refinement will capture ~৳${Math.round(estGain).toLocaleString()} additional monthly net profit directly.`,
        });
      }
      // 3. Stale overpriced dead stock (0 sales, stock > 0, margin > 40%)
      else if (perf.unitsSold === 0 && stock > 0 && marginPct >= 35) {
        // Recommend 15% clearance discount
        const discountPct = 0.15;
        const recommendedPrice = Math.floor(sellingPrice * (1 - discountPct));
        const priceDiff = recommendedPrice - sellingPrice;

        pricingRecommendations.push({
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
          category: prod.category?.name || 'General',
          currentCost: unitCost,
          currentSellingPrice: sellingPrice,
          currentMarginPct: Number(marginPct.toFixed(1)),
          recommendedSellingPrice: recommendedPrice,
          recommendedMarginPct: Number((((recommendedPrice - unitCost) / recommendedPrice) * 100).toFixed(1)),
          priceAdjustment: priceDiff,
          adjustmentPct: -15,
          type: 'CLEARANCE_DISCOUNT',
          projectedMonthlyProfitGain: 0,
          rationale: `Stagnant inventory tying up ৳${Math.round(prodValuation).toLocaleString()} of capital. A 15% promotional markdown will stimulate demand, clear shelf space, and liquidate cash.`,
        });
      }
    }
  }

  // Sort restock recommendations: CRITICAL first, then LOW, sorted by runway asc
  restockRecommendations.sort((a, b) => {
    const priorityOrder = { CRITICAL: 0, LOW: 1, HEALTHY: 2, OVERSTOCKED: 3 };
    if (priorityOrder[a.status] !== priorityOrder[b.status]) {
      return priorityOrder[a.status] - priorityOrder[b.status];
    }
    return a.runwayDays - b.runwayDays;
  });

  // Sort pricing recommendations by projected gain desc
  pricingRecommendations.sort((a, b) => b.projectedMonthlyProfitGain - a.projectedMonthlyProfitGain);

  const potentialMonthlyProfitBoost = pricingRecommendations.reduce(
    (acc, p) => acc + (p.projectedMonthlyProfitGain > 0 ? p.projectedMonthlyProfitGain : 0),
    0
  );

  // -------------------------------------------------------------
  // 2. BCG GROWTH-SHARE MATRIX CLASSIFICATION
  // -------------------------------------------------------------
  const totalUnitsSold = classifiedProducts.reduce((acc, p) => acc + p.unitsSold, 0);
  const avgUnitsSold = classifiedProducts.length > 0 ? totalUnitsSold / classifiedProducts.length : 1;
  const avgMargin = grossMarginPct > 0 ? grossMarginPct : 25;

  const stars: IntelligenceOverview['bcgMatrix']['stars']['products'] = [];
  const cashCows: IntelligenceOverview['bcgMatrix']['cashCows']['products'] = [];
  const opportunities: IntelligenceOverview['bcgMatrix']['opportunities']['products'] = [];

  for (const p of classifiedProducts) {
    if (p.unitsSold === 0) continue; // Dead stock handled separately

    const isHighVolume = p.unitsSold >= Math.max(1, avgUnitsSold * 0.7);
    const isHighMargin = p.marginPct >= avgMargin;

    if (isHighVolume && isHighMargin) {
      stars.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unitsSold: p.unitsSold,
        revenue: Math.round(p.revenue),
        profit: Math.round(p.profit),
        marginPct: Number(p.marginPct.toFixed(1)),
        stock: p.stock,
      });
    } else if (isHighVolume && !isHighMargin) {
      cashCows.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unitsSold: p.unitsSold,
        revenue: Math.round(p.revenue),
        profit: Math.round(p.profit),
        marginPct: Number(p.marginPct.toFixed(1)),
        stock: p.stock,
      });
    } else if (!isHighVolume && isHighMargin) {
      opportunities.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unitsSold: p.unitsSold,
        revenue: Math.round(p.revenue),
        profit: Math.round(p.profit),
        marginPct: Number(p.marginPct.toFixed(1)),
        stock: p.stock,
      });
    }
  }

  // Sort each BCG category
  stars.sort((a, b) => b.profit - a.profit);
  cashCows.sort((a, b) => b.revenue - a.revenue);
  opportunities.sort((a, b) => b.marginPct - a.marginPct);
  deadStockProducts.sort((a, b) => b.trappedValue - a.trappedValue);

  // -------------------------------------------------------------
  // 3. BUSINESS HEALTH SCORE ALGORITHM (0 - 100)
  // -------------------------------------------------------------
  let profitMarginScore = 0;
  if (grossMarginPct >= 35 && netMarginPct >= 15) profitMarginScore = 25;
  else if (grossMarginPct >= 25 && netMarginPct >= 10) profitMarginScore = 22;
  else if (grossMarginPct >= 18 && netMarginPct >= 5) profitMarginScore = 17;
  else if (netMarginPct > 0) profitMarginScore = 12;
  else profitMarginScore = 5;

  let cashFlowScore = 25;
  if (totalRevenue > 0) {
    const receivableToRevenue = totalCustomerDue / totalRevenue;
    if (receivableToRevenue > 1.2) cashFlowScore = 10;
    else if (receivableToRevenue > 0.6) cashFlowScore = 16;
    else if (receivableToRevenue > 0.3) cashFlowScore = 21;
    else cashFlowScore = 25;
  } else {
    cashFlowScore = 15;
  }

  let inventoryEfficiencyScore = 25;
  if (totalStockValuation > 0) {
    const deadStockRatio = trappedCapitalDeadStock / totalStockValuation;
    if (deadStockRatio > 0.35) inventoryEfficiencyScore = 8;
    else if (deadStockRatio > 0.2) inventoryEfficiencyScore = 14;
    else if (deadStockRatio > 0.1) inventoryEfficiencyScore = 19;
    else inventoryEfficiencyScore = 25;
  }

  let revenueMomentumScore = 25;
  if (criticalCount > 5) revenueMomentumScore = 12;
  else if (criticalCount > 2) revenueMomentumScore = 18;
  else if (criticalCount > 0) revenueMomentumScore = 22;
  else revenueMomentumScore = 25;

  const totalScore = Math.min(
    100,
    Math.max(10, profitMarginScore + cashFlowScore + inventoryEfficiencyScore + revenueMomentumScore)
  );

  let rating: IntelligenceOverview['healthScore']['rating'] = 'EXCELLENT';
  if (totalScore < 50) rating = 'CRITICAL';
  else if (totalScore < 70) rating = 'NEEDS_ATTENTION';
  else if (totalScore < 85) rating = 'GOOD';

  const healthInsights: string[] = [];
  if (netMarginPct >= 15) {
    healthInsights.push(`Exceptional net profitability of ${netMarginPct.toFixed(1)}% indicates strong operational cost discipline.`);
  } else if (netMarginPct < 5 && netMarginPct >= 0) {
    healthInsights.push(`Net profit margin is compressed at ${netMarginPct.toFixed(1)}%. Review overhead expenses and low-margin products.`);
  } else if (netMarginPct < 0) {
    healthInsights.push(`Operating at a net loss for this timeframe. Immediate pricing revision and expense rationalization required.`);
  }

  if (criticalCount > 0) {
    healthInsights.push(`${criticalCount} high-demand product(s) are at critical stockout risk, risking ~৳${Math.round(potentialLostRevenueCritical).toLocaleString()} in lost sales.`);
  }

  if (trappedCapitalDeadStock > 0) {
    healthInsights.push(`৳${Math.round(trappedCapitalDeadStock).toLocaleString()} of working capital is trapped in ${deadStockProducts.length} non-selling inventory items.`);
  }

  if (totalCustomerDue > 0 && totalRevenue > 0 && totalCustomerDue / totalRevenue > 0.5) {
    healthInsights.push(`Outstanding customer debt (৳${Math.round(totalCustomerDue).toLocaleString()}) is high relative to period revenue. Prioritize debt collection to loosen cash flow.`);
  }

  // -------------------------------------------------------------
  // 4. PROFIT LEVERS & BUNDLING ENGINE
  // -------------------------------------------------------------
  const crossSellBundles: IntelligenceOverview['profitLevers']['crossSellBundles'] = [];
  if (cashCows.length > 0 && opportunities.length > 0) {
    const mainItem = cashCows[0];
    const highMarginItem = opportunities[0];
    crossSellBundles.push({
      title: `High-Velocity Bundle: "${mainItem.name}" + "${highMarginItem.name}"`,
      description: `Pair high-turnover staple "${mainItem.name}" with high-margin "${highMarginItem.name}" at a 5% promotional package discount.`,
      items: [mainItem.name, highMarginItem.name],
      expectedBenefit: `Accelerates movement of high-margin inventory (+${highMarginItem.marginPct}% margin) using existing customer traffic.`,
    });
  }

  if (deadStockProducts.length > 0 && stars.length > 0) {
    const starItem = stars[0];
    const clearanceItem = deadStockProducts[0];
    crossSellBundles.push({
      title: `Inventory Liquidation Pair: "${starItem.name}" + "${clearanceItem.name}"`,
      description: `Offer "${clearanceItem.name}" at a steep 30% discount when purchased alongside bestseller "${starItem.name}".`,
      items: [starItem.name, clearanceItem.name],
      expectedBenefit: `Recovers ৳${Math.round(clearanceItem.trappedValue).toLocaleString()} in trapped capital while rewarding loyal customers.`,
    });
  }

  // Debt collection priorities
  const highRiskDebtors = customers
    .filter((c) => c.balance.toNumber() > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      balance: c.balance.toNumber(),
      lastSaleDate: c.sales[0]?.saleDate ? c.sales[0].saleDate.toISOString().slice(0, 10) : null,
    }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 8);

  // Expense breakdown
  const topExpenseCategories = Array.from(categoryExpenseMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      pctOfTotal: totalExpenses > 0 ? Number(((amount / totalExpenses) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const expenseRatioPct = grossProfit > 0 ? (totalExpenses / grossProfit) * 100 : 0;
  const expenseStatus: 'OPTIMAL' | 'MODERATE' | 'HIGH' =
    expenseRatioPct <= 45 ? 'OPTIMAL' : expenseRatioPct <= 70 ? 'MODERATE' : 'HIGH';

  // -------------------------------------------------------------
  // 5. FUTURE PREDICTIVE FORECASTING & SCALING ROADMAP
  // -------------------------------------------------------------
  const dailyAvgRevenue = totalRevenue / periodDays;
  const dailyAvgCogs = totalCogs / periodDays;
  const dailyAvgExpenses = totalExpenses / periodDays;
  const dailyAvgProfit = netProfit / periodDays;

  const forecast30Days = {
    projectedRevenue: Math.round(dailyAvgRevenue * 30),
    projectedCogs: Math.round(dailyAvgCogs * 30),
    projectedExpenses: Math.round(dailyAvgExpenses * 30),
    projectedNetProfit: Math.round(dailyAvgProfit * 30),
  };

  const forecast90Days = {
    projectedRevenue: Math.round(dailyAvgRevenue * 90),
    projectedCogs: Math.round(dailyAvgCogs * 90),
    projectedExpenses: Math.round(dailyAvgExpenses * 90),
    projectedNetProfit: Math.round(dailyAvgProfit * 90),
  };

  const scalingRoadmap: IntelligenceOverview['futureProjections']['scalingRoadmap'] = [
    {
      step: 1,
      title: 'Secure Supply for Top Profit Engines (Stars & Cash Cows)',
      impact: 'CRITICAL',
      detail: `Your top ${stars.length + cashCows.length} products generate the bulk of operational cash. Establish rolling buffer stock agreements with suppliers to prevent stockouts.`,
    },
    {
      step: 2,
      title: 'Implement Targeted Price Optimization',
      impact: 'HIGH',
      detail: `Applying the recommended adjustments across ${pricingRecommendations.length} flagged products can generate an estimated +৳${Math.round(potentialMonthlyProfitBoost).toLocaleString()} extra net profit per month without overhead increases.`,
    },
    {
      step: 3,
      title: 'Liquidate Stagnant Capital in Dead Stock',
      impact: 'HIGH',
      detail: `Clear ৳${Math.round(trappedCapitalDeadStock).toLocaleString()} of trapped capital across ${deadStockProducts.length} items using flash deals or bundles, and reinvest this cash directly into high-ROI inventory.`,
    },
    {
      step: 4,
      title: 'Enforce Credit Settlement Terms on High-Balance Accounts',
      impact: 'HIGH',
      detail: `Collect outstanding dues from your top ${highRiskDebtors.length} debtor accounts (totaling ৳${Math.round(highRiskDebtors.reduce((acc, d) => acc + d.balance, 0)).toLocaleString()}) to strengthen business operating reserves.`,
    },
    {
      step: 5,
      title: 'Negotiate Volume Procurement Rebates',
      impact: 'MEDIUM',
      detail: `Consolidate purchasing with top suppliers. A 3% to 5% reduction in procurement unit costs will directly expand gross margin by +2-4%.`,
    },
  ];

  const topGrowthEngine =
    stars.length > 0
      ? {
          name: stars[0].name,
          category: classifiedProducts.find((p) => p.id === stars[0].id)?.category || 'General',
          revenue: stars[0].revenue,
          profit: stars[0].profit,
          marginPct: stars[0].marginPct,
        }
      : classifiedProducts.length > 0
      ? {
          name: classifiedProducts[0].name,
          category: classifiedProducts[0].category,
          revenue: classifiedProducts[0].revenue,
          profit: classifiedProducts[0].profit,
          marginPct: classifiedProducts[0].marginPct,
        }
      : null;

  return {
    healthScore: {
      totalScore,
      rating,
      breakdown: {
        profitMarginScore,
        cashFlowScore,
        inventoryEfficiencyScore,
        revenueMomentumScore,
      },
      insights: healthInsights,
    },
    executiveHighlights: {
      topGrowthEngine,
      cashTrappedInDeadStock: {
        productCount: deadStockProducts.length,
        totalValue: Math.round(trappedCapitalDeadStock),
        topItems: deadStockProducts.slice(0, 5),
      },
      criticalStockoutAlerts: {
        count: criticalCount,
        potentialLostRevenue: Math.round(potentialLostRevenueCritical),
      },
      operatingExpenseRatio: {
        ratioPct: Number(expenseRatioPct.toFixed(1)),
        status: expenseStatus,
        totalExpenses: Math.round(totalExpenses),
      },
    },
    restockGuide: {
      summary: {
        criticalCount,
        lowCount,
        healthyCount,
        overstockedCount,
        totalCapitalNeeded: Math.round(totalCapitalNeededForReorder),
        projectedProfitReturn: Math.round(projectedProfitFromReorders),
      },
      recommendations: restockRecommendations,
    },
    pricingOptimizer: {
      summary: {
        underpricedCount: pricingRecommendations.filter((p) => p.type === 'RAISE_MARGIN').length,
        premiumOpportunityCount: pricingRecommendations.filter((p) => p.type === 'PREMIUM_BUMP').length,
        stalePriceCount: pricingRecommendations.filter((p) => p.type === 'CLEARANCE_DISCOUNT').length,
        potentialMonthlyProfitBoost: Math.round(potentialMonthlyProfitBoost),
      },
      recommendations: pricingRecommendations,
    },
    bcgMatrix: {
      stars: {
        count: stars.length,
        revenue: stars.reduce((acc, p) => acc + p.revenue, 0),
        profit: stars.reduce((acc, p) => acc + p.profit, 0),
        advice: 'Top revenue & profit drivers. Maintain priority safety stock, feature in premium advertising, and guarantee supplier supply continuity.',
        products: stars.slice(0, 10),
      },
      cashCows: {
        count: cashCows.length,
        revenue: cashCows.reduce((acc, p) => acc + p.revenue, 0),
        profit: cashCows.reduce((acc, p) => acc + p.profit, 0),
        advice: 'Steady cash generators with high transaction velocity. Negotiate wholesale supplier cost discounts to widen margins, and cross-sell high-margin items.',
        products: cashCows.slice(0, 10),
      },
      opportunities: {
        count: opportunities.length,
        revenue: opportunities.reduce((acc, p) => acc + p.revenue, 0),
        profit: opportunities.reduce((acc, p) => acc + p.profit, 0),
        advice: 'High-margin potential winners. Each sale yields excellent returns but volume is limited. Increase visibility, bundle with staples, and incentivize staff sales.',
        products: opportunities.slice(0, 10),
      },
      deadStock: {
        count: deadStockProducts.length,
        trappedCapital: Math.round(trappedCapitalDeadStock),
        advice: 'Stagnant inventory generating zero cash flow. Implement clearance sales, bundling promotions, or return to vendor to reclaim working capital.',
        products: deadStockProducts.slice(0, 10),
      },
    },
    profitLevers: {
      crossSellBundles,
      debtCollectionStrategy: {
        totalCustomerDue: Math.round(totalCustomerDue),
        highRiskDebtors,
        actionGuide: 'Place temporary credit holds on overdue accounts exceeding payment terms until balance reduction is confirmed.',
      },
      expenseOptimization: {
        topExpenseCategories,
        recommendation:
          expenseStatus === 'HIGH'
            ? 'Operating expenses are consuming over 70% of gross profits. Audit discretionary spending categories immediately.'
            : 'Operating overhead is within a sustainable range relative to gross earnings.',
      },
    },
    futureProjections: {
      historicalDays: periodDays,
      dailyAvgRevenue: Math.round(dailyAvgRevenue),
      dailyAvgProfit: Math.round(dailyAvgProfit),
      forecast30Days,
      forecast90Days,
      scalingRoadmap,
    },
  };
}
