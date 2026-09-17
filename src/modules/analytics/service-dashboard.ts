import { DocumentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export async function getDashboardData() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [sales, purchases, expenses, products, categories, customers, suppliers] = await Promise.all([
    prisma.sale.findMany({
      where: { status: DocumentStatus.CONFIRMED },
      include: { items: true },
      orderBy: { saleDate: 'asc' },
    }),
    prisma.purchase.findMany({
      where: { status: DocumentStatus.CONFIRMED },
      include: { items: true },
      orderBy: { purchaseDate: 'asc' },
    }),
    prisma.expense.findMany({
      orderBy: { date: 'asc' },
    }),
    prisma.product.findMany({
      include: { category: true },
    }),
    prisma.category.findMany({
      include: { products: true },
    }),
    prisma.customer.findMany(),
    prisma.supplier.findMany(),
  ]);

  // Aggregate totals
  let totalRevenue = 0;
  let totalCogs = 0;
  let totalPurchases = 0;
  let totalExpenses = 0;
  let todaySales = 0;
  let todayCogs = 0;
  let todayPurchases = 0;

  for (const s of sales) {
    const rev = s.grandTotal.toNumber();
    const cg = s.cogs.toNumber();
    totalRevenue += rev;
    totalCogs += cg;

    const sDate = new Date(s.saleDate);
    if (sDate >= todayStart && sDate <= todayEnd) {
      todaySales += rev;
      todayCogs += cg;
    }
  }

  for (const p of purchases) {
    const pur = p.grandTotal.toNumber();
    totalPurchases += pur;

    const pDate = new Date(p.purchaseDate);
    if (pDate >= todayStart && pDate <= todayEnd) {
      todayPurchases += pur;
    }
  }

  for (const e of expenses) {
    totalExpenses += e.amount.toNumber();
  }

  const grossProfit = totalRevenue - totalCogs;
  const netProfit = grossProfit - totalExpenses;
  const todayGrossProfit = todaySales - todayCogs;

  // Inventory KPI calculations
  let totalStock = 0;
  let stockValue = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let overstocked = 0;

  for (const prod of products) {
    const st = prod.stock.toNumber();
    const minSt = prod.minimumStock.toNumber();
    const maxSt = prod.maximumStock ? prod.maximumStock.toNumber() : null;
    const cost = prod.averageCost.toNumber();

    totalStock += st;
    stockValue += st * cost;

    if (st <= 0) {
      outOfStock++;
    } else if (st <= minSt) {
      lowStock++;
    } else if (maxSt && st >= maxSt) {
      overstocked++;
    }
  }

  // Receivables & Payables
  let receivable = 0;
  for (const c of customers) {
    receivable += c.balance.toNumber();
  }
  let payable = 0;
  for (const sup of suppliers) {
    payable += sup.balance.toNumber();
  }

  // Time-series breakdowns
  const dailySalesMap = new Map<string, number>();
  const weeklySalesMap = new Map<string, number>();
  const monthlySalesMap = new Map<string, number>();
  const yearlySalesMap = new Map<string, number>();

  for (const s of sales) {
    const d = new Date(s.saleDate);
    const dayKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const yearKey = `${d.getFullYear()}`;
    const weekKey = `W${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)} ${d.toLocaleDateString('en-US', { month: 'short' })}`;

    const amt = s.grandTotal.toNumber();
    dailySalesMap.set(dayKey, (dailySalesMap.get(dayKey) || 0) + amt);
    weeklySalesMap.set(weekKey, (weeklySalesMap.get(weekKey) || 0) + amt);
    monthlySalesMap.set(monthKey, (monthlySalesMap.get(monthKey) || 0) + amt);
    yearlySalesMap.set(yearKey, (yearlySalesMap.get(yearKey) || 0) + amt);
  }

  const dailyPurchasesMap = new Map<string, number>();
  const monthlyPurchasesMap = new Map<string, number>();
  const yearlyPurchasesMap = new Map<string, number>();

  for (const p of purchases) {
    const d = new Date(p.purchaseDate);
    const dayKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const yearKey = `${d.getFullYear()}`;

    const amt = p.grandTotal.toNumber();
    dailyPurchasesMap.set(dayKey, (dailyPurchasesMap.get(dayKey) || 0) + amt);
    monthlyPurchasesMap.set(monthKey, (monthlyPurchasesMap.get(monthKey) || 0) + amt);
    yearlyPurchasesMap.set(yearKey, (yearlyPurchasesMap.get(yearKey) || 0) + amt);
  }

  // Category performance
  const categorySalesMap = new Map<string, { categoryId: string; name: string; productCount: number; sales: number; purchases: number; profit: number }>();
  for (const c of categories) {
    categorySalesMap.set(c.id, {
      categoryId: c.id,
      name: c.name,
      productCount: c.products.length,
      sales: 0,
      purchases: 0,
      profit: 0,
    });
  }

  const productSoldMap = new Map<string, { unitsSold: number; revenue: number; profit: number }>();
  for (const s of sales) {
    for (const item of s.items) {
      const prod = products.find((p) => p.id === item.productId);
      const qty = item.quantity.toNumber();
      const rev = item.total.toNumber();
      const prof = rev - item.unitCost.toNumber() * qty;

      if (prod && prod.categoryId) {
        const cat = categorySalesMap.get(prod.categoryId);
        if (cat) {
          cat.sales += rev;
          cat.profit += prof;
        }
      }

      const existing = productSoldMap.get(item.productId) || { unitsSold: 0, revenue: 0, profit: 0 };
      existing.unitsSold += qty;
      existing.revenue += rev;
      existing.profit += prof;
      productSoldMap.set(item.productId, existing);
    }
  }

  for (const p of purchases) {
    for (const item of p.items) {
      const prod = products.find((prod) => prod.id === item.productId);
      if (prod && prod.categoryId) {
        const cat = categorySalesMap.get(prod.categoryId);
        if (cat) {
          cat.purchases += item.total.toNumber();
        }
      }
    }
  }

  // Product rankings
  const ranked = products.map((prod) => {
    const perf = productSoldMap.get(prod.id) || { unitsSold: 0, revenue: 0, profit: 0 };
    return {
      id: prod.id,
      name: prod.name,
      sku: prod.sku,
      stock: prod.stock.toNumber(),
      category: prod.category?.name || 'Uncategorized',
      unitsSold: perf.unitsSold,
      revenue: perf.revenue,
      profit: perf.profit,
    };
  });

  const topSelling = [...ranked].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);
  const mostProfitable = [...ranked].sort((a, b) => b.profit - a.profit).slice(0, 5);
  const slowMoving = [...ranked].filter((p) => p.unitsSold > 0).sort((a, b) => a.unitsSold - b.unitsSold).slice(0, 5);

  return {
    kpis: {
      totalProducts: products.length,
      totalStock,
      stockValue,
      todaySales,
      todayPurchases,
      todayGrossProfit,
      receivable,
      payable,
      lowStock,
      outOfStock,
      overstocked,
    },
    profit: {
      revenue: totalRevenue,
      cogs: totalCogs,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
    },
    salesTimeSeries: {
      daily: Array.from(dailySalesMap.entries()).map(([label, revenue]) => ({ label, revenue })),
      weekly: Array.from(weeklySalesMap.entries()).map(([label, revenue]) => ({ label, revenue })),
      monthly: Array.from(monthlySalesMap.entries()).map(([label, revenue]) => ({ label, revenue })),
      yearly: Array.from(yearlySalesMap.entries()).map(([label, revenue]) => ({ label, revenue })),
    },
    purchasesTimeSeries: {
      daily: Array.from(dailyPurchasesMap.entries()).map(([label, revenue]) => ({ label, revenue })),
      monthly: Array.from(monthlyPurchasesMap.entries()).map(([label, revenue]) => ({ label, revenue })),
      yearly: Array.from(yearlyPurchasesMap.entries()).map(([label, revenue]) => ({ label, revenue })),
    },
    productPerformance: {
      topSelling,
      mostProfitable,
      slowMoving,
    },
    categoryPerformance: Array.from(categorySalesMap.values()),
    totals: {
      revenue: totalRevenue,
      cogs: totalCogs,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      purchases: totalPurchases,
    },
  };
}
