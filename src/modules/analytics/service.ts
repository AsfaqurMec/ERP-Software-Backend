import { DocumentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface TimeframeRange {
  from: Date;
  to: Date;
}

export function parseTimeframe(timeframe?: string, customFrom?: string, customTo?: string): TimeframeRange {
  const now = new Date();

  switch (timeframe) {
    case 'today': {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { from, to };
    }
    case 'yesterday': {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      return { from, to };
    }
    case 'this_week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const from = new Date(now.getFullYear(), now.getMonth(), diff);
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { from, to };
    }
    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { from, to };
    }
    case 'last_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from, to };
    }
    case 'this_year': {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { from, to };
    }
    case 'custom':
      if (customFrom && customTo) {
        return {
          from: new Date(customFrom),
          to: new Date(customTo),
        };
      }
      break;
    default:
      break;
  }

  // Default to last 30 days
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const to = now;
  return { from, to };
}

export async function getDeepAnalytics(timeframe?: string, customFrom?: string, customTo?: string) {
  const { from, to } = parseTimeframe(timeframe, customFrom, customTo);

  const [
    sales,
    purchases,
    expenses,
    salesReturns,
    purchaseReturns,
    products,
    customers,
    suppliers,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: {
        status: DocumentStatus.CONFIRMED,
        saleDate: { gte: from, lte: to },
      },
      include: { items: true, customer: true },
    }),
    prisma.purchase.findMany({
      where: {
        status: DocumentStatus.CONFIRMED,
        purchaseDate: { gte: from, lte: to },
      },
      include: { items: true, supplier: true },
    }),
    prisma.expense.findMany({
      where: {
        date: { gte: from, lte: to },
      },
    }),
    prisma.salesReturn.findMany({
      where: {
        date: { gte: from, lte: to },
      },
      include: { items: true },
    }),
    prisma.purchaseReturn.findMany({
      where: {
        date: { gte: from, lte: to },
      },
      include: { items: true },
    }),
    prisma.product.findMany({
      include: { category: true },
    }),
    prisma.customer.findMany({
      include: {
        sales: { where: { status: DocumentStatus.CONFIRMED } },
      },
    }),
    prisma.supplier.findMany({
      include: {
        purchases: { where: { status: DocumentStatus.CONFIRMED } },
      },
    }),
  ]);

  // Sales calculations
  let totalRevenue = new Prisma.Decimal(0);
  let totalCogs = new Prisma.Decimal(0);
  let itemsSold = new Prisma.Decimal(0);
  let paidSales = new Prisma.Decimal(0);
  let creditSales = new Prisma.Decimal(0);

  const productSoldMap = new Map<string, { qty: Prisma.Decimal; revenue: Prisma.Decimal; profit: Prisma.Decimal }>();

  for (const s of sales) {
    totalRevenue = totalRevenue.add(s.grandTotal);
    totalCogs = totalCogs.add(s.cogs);
    paidSales = paidSales.add(s.paidAmount);
    creditSales = creditSales.add(s.dueAmount);

    for (const item of s.items) {
      itemsSold = itemsSold.add(item.quantity);
      const existing = productSoldMap.get(item.productId) || {
        qty: new Prisma.Decimal(0),
        revenue: new Prisma.Decimal(0),
        profit: new Prisma.Decimal(0),
      };
      const lineProfit = item.total.sub(item.unitCost.mul(item.quantity));
      productSoldMap.set(item.productId, {
        qty: existing.qty.add(item.quantity),
        revenue: existing.revenue.add(item.total),
        profit: existing.profit.add(lineProfit),
      });
    }
  }

  const totalOrders = sales.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue.div(totalOrders) : new Prisma.Decimal(0);

  // Sales Returns
  let totalSalesReturns = new Prisma.Decimal(0);
  for (const sr of salesReturns) {
    totalSalesReturns = totalSalesReturns.add(sr.total);
  }

  // Purchases calculations
  let totalPurchases = new Prisma.Decimal(0);
  let itemsPurchased = new Prisma.Decimal(0);
  let paidPurchases = new Prisma.Decimal(0);
  let creditPurchases = new Prisma.Decimal(0);

  for (const p of purchases) {
    totalPurchases = totalPurchases.add(p.grandTotal);
    paidPurchases = paidPurchases.add(p.paidAmount);
    creditPurchases = creditPurchases.add(p.dueAmount);

    for (const item of p.items) {
      itemsPurchased = itemsPurchased.add(item.quantity);
    }
  }

  let totalPurchaseReturns = new Prisma.Decimal(0);
  for (const pr of purchaseReturns) {
    totalPurchaseReturns = totalPurchaseReturns.add(pr.total);
  }

  // Expenses & Profit
  let totalExpenses = new Prisma.Decimal(0);
  for (const e of expenses) {
    totalExpenses = totalExpenses.add(e.amount);
  }

  const grossProfit = totalRevenue.sub(totalCogs);
  const netProfit = grossProfit.sub(totalExpenses);
  const grossMarginPct = totalRevenue.gt(0) ? grossProfit.div(totalRevenue).mul(100).toNumber() : 0;
  const netMarginPct = totalRevenue.gt(0) ? netProfit.div(totalRevenue).mul(100).toNumber() : 0;

  // Inventory Health
  let totalStockQty = new Prisma.Decimal(0);
  let totalStockVal = new Prisma.Decimal(0);
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let overstockedCount = 0;

  const productRankings = products.map((prod) => {
    const stats = productSoldMap.get(prod.id) || {
      qty: new Prisma.Decimal(0),
      revenue: new Prisma.Decimal(0),
      profit: new Prisma.Decimal(0),
    };

    totalStockQty = totalStockQty.add(prod.stock);
    totalStockVal = totalStockVal.add(prod.stock.mul(prod.averageCost));

    if (prod.stock.lte(0)) {
      outOfStockCount++;
    } else if (prod.stock.lte(prod.minimumStock)) {
      lowStockCount++;
    } else if (prod.maximumStock && prod.stock.gte(prod.maximumStock)) {
      overstockedCount++;
    }

    return {
      id: prod.id,
      name: prod.name,
      sku: prod.sku,
      stock: prod.stock,
      category: prod.category?.name || 'Uncategorized',
      quantitySold: stats.qty,
      revenue: stats.revenue,
      profit: stats.profit,
    };
  });

  // Top Selling & Most Profitable
  const topSelling = [...productRankings].sort((a, b) => b.quantitySold.sub(a.quantitySold).toNumber()).slice(0, 10);
  const topRevenue = [...productRankings].sort((a, b) => b.revenue.sub(a.revenue).toNumber()).slice(0, 10);
  const mostProfitable = [...productRankings].sort((a, b) => b.profit.sub(a.profit).toNumber()).slice(0, 10);
  const slowMoving = [...productRankings].filter((p) => p.quantitySold.gt(0)).sort((a, b) => a.quantitySold.sub(b.quantitySold).toNumber()).slice(0, 10);
  const deadStock = productRankings.filter((p) => p.quantitySold.equals(0) && p.stock.gt(0)).slice(0, 10);

  // Customer Analytics
  const customerAnalytics = customers
    .map((c) => {
      const cSales = c.sales || [];
      const totalCustomerSales = cSales.reduce((acc, s) => acc.add(s.grandTotal), new Prisma.Decimal(0));
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        totalSales: totalCustomerSales,
        orderCount: cSales.length,
        dueBalance: c.balance,
        isRepeat: cSales.length > 1,
      };
    })
    .sort((a, b) => b.totalSales.sub(a.totalSales).toNumber());

  // Supplier Analytics
  const supplierAnalytics = suppliers
    .map((s) => {
      const sPurchases = s.purchases || [];
      const totalSupplierPurchases = sPurchases.reduce((acc, p) => acc.add(p.grandTotal), new Prisma.Decimal(0));
      return {
        id: s.id,
        name: s.name,
        company: s.company,
        totalPurchases: totalSupplierPurchases,
        orderCount: sPurchases.length,
        dueBalance: s.balance,
      };
    })
    .sort((a, b) => b.totalPurchases.sub(a.totalPurchases).toNumber());

  return {
    timeframe: { from, to },
    sales: {
      totalRevenue,
      totalOrders,
      itemsSold,
      averageOrderValue,
      paidSales,
      creditSales,
      totalSalesReturns,
    },
    purchases: {
      totalPurchases,
      purchaseOrders: purchases.length,
      itemsPurchased,
      paidPurchases,
      creditPurchases,
      totalPurchaseReturns,
    },
    profit: {
      revenue: totalRevenue,
      cogs: totalCogs,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      grossMarginPct: Number(grossMarginPct.toFixed(2)),
      netMarginPct: Number(netMarginPct.toFixed(2)),
    },
    inventory: {
      totalStock: totalStockQty,
      stockValue: totalStockVal,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
      overstocked: overstockedCount,
      fastMoving: topSelling.slice(0, 5),
      slowMoving,
      deadStock,
    },
    rankings: {
      topSelling,
      topRevenue,
      mostProfitable,
    },
    customerAnalytics: {
      topBySales: customerAnalytics.slice(0, 10),
      topByOrders: [...customerAnalytics].sort((a, b) => b.orderCount - a.orderCount).slice(0, 10),
      highestDue: [...customerAnalytics].sort((a, b) => b.dueBalance.sub(a.dueBalance).toNumber()).slice(0, 10),
      repeatCustomerCount: customerAnalytics.filter((c) => c.isRepeat).length,
    },
    supplierAnalytics: {
      topByPurchase: supplierAnalytics.slice(0, 10),
      highestDue: [...supplierAnalytics].sort((a, b) => b.dueBalance.sub(a.dueBalance).toNumber()).slice(0, 10),
    },
  };
}

// Preserve existing dashboard functions
export { getDashboardData } from './service-dashboard.js';
