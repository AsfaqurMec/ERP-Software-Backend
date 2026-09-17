import { DocumentStatus, PartyType, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export async function getSummaryReport(from: Date, to: Date) {
  const [sales, purchases, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: {
        status: DocumentStatus.CONFIRMED,
        saleDate: { gte: from, lte: to },
      },
    }),
    prisma.purchase.findMany({
      where: {
        status: DocumentStatus.CONFIRMED,
        purchaseDate: { gte: from, lte: to },
      },
    }),
    prisma.expense.findMany({
      where: {
        date: { gte: from, lte: to },
      },
    }),
  ]);

  let totalRevenue = new Prisma.Decimal(0);
  let totalCogs = new Prisma.Decimal(0);
  let totalPurchases = new Prisma.Decimal(0);
  let totalExpenses = new Prisma.Decimal(0);

  for (const s of sales) {
    totalRevenue = totalRevenue.add(s.grandTotal);
    totalCogs = totalCogs.add(s.cogs);
  }
  for (const p of purchases) {
    totalPurchases = totalPurchases.add(p.grandTotal);
  }
  for (const e of expenses) {
    totalExpenses = totalExpenses.add(e.amount);
  }

  const grossProfit = totalRevenue.sub(totalCogs);
  const netProfit = grossProfit.sub(totalExpenses);

  return {
    from,
    to,
    sales: {
      orders: sales.length,
      revenue: totalRevenue,
      cogs: totalCogs,
    },
    purchases: {
      orders: purchases.length,
      total: totalPurchases,
    },
    expenses: {
      count: expenses.length,
      total: totalExpenses,
    },
    profit: {
      grossProfit,
      netProfit,
    },
  };
}

export async function getDailyReport(date?: Date) {
  const target = date || new Date();
  const from = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const to = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);

  const [sales, purchases, expenses, payments] = await Promise.all([
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
      where: { date: { gte: from, lte: to } },
    }),
    prisma.payment.findMany({
      where: { date: { gte: from, lte: to } },
    }),
  ]);

  let totalRevenue = new Prisma.Decimal(0);
  let totalCogs = new Prisma.Decimal(0);
  let itemsSold = new Prisma.Decimal(0);

  for (const s of sales) {
    totalRevenue = totalRevenue.add(s.grandTotal);
    totalCogs = totalCogs.add(s.cogs);
    for (const item of s.items) {
      itemsSold = itemsSold.add(item.quantity);
    }
  }

  let totalPurchases = new Prisma.Decimal(0);
  let itemsPurchased = new Prisma.Decimal(0);

  for (const p of purchases) {
    totalPurchases = totalPurchases.add(p.grandTotal);
    for (const item of p.items) {
      itemsPurchased = itemsPurchased.add(item.quantity);
    }
  }

  let totalExpenses = new Prisma.Decimal(0);
  for (const e of expenses) {
    totalExpenses = totalExpenses.add(e.amount);
  }

  let paymentsReceived = new Prisma.Decimal(0);
  let paymentsMade = new Prisma.Decimal(0);

  for (const p of payments) {
    if (p.partyType === PartyType.CUSTOMER) {
      paymentsReceived = paymentsReceived.add(p.amount);
    } else {
      paymentsMade = paymentsMade.add(p.amount);
    }
  }

  const grossProfit = totalRevenue.sub(totalCogs);
  const netProfit = grossProfit.sub(totalExpenses);

  return {
    date: from,
    sales: {
      orders: sales.length,
      revenue: totalRevenue,
      cogs: totalCogs,
      itemsSold,
    },
    purchases: {
      orders: purchases.length,
      total: totalPurchases,
      itemsPurchased,
    },
    expenses: {
      count: expenses.length,
      total: totalExpenses,
    },
    payments: {
      received: paymentsReceived,
      made: paymentsMade,
    },
    profit: {
      grossProfit,
      netProfit,
    },
  };
}

export async function getMonthlyReport(year?: number, month?: number) {
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month !== undefined ? month : now.getMonth();

  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0, 23, 59, 59, 999);

  const [sales, purchases, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: {
        status: DocumentStatus.CONFIRMED,
        saleDate: { gte: from, lte: to },
      },
      include: { items: true },
      orderBy: { saleDate: 'asc' },
    }),
    prisma.purchase.findMany({
      where: {
        status: DocumentStatus.CONFIRMED,
        purchaseDate: { gte: from, lte: to },
      },
      include: { items: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
    }),
  ]);

  let totalRevenue = new Prisma.Decimal(0);
  let totalCogs = new Prisma.Decimal(0);
  let itemsSold = new Prisma.Decimal(0);
  const distinctCustomerIds = new Set<string>();

  const dailyTrend = new Map<string, { date: string; sales: number; profit: number }>();

  for (const s of sales) {
    totalRevenue = totalRevenue.add(s.grandTotal);
    totalCogs = totalCogs.add(s.cogs);
    if (s.customerId) distinctCustomerIds.add(s.customerId);

    for (const item of s.items) {
      itemsSold = itemsSold.add(item.quantity);
    }

    const dStr = s.saleDate.toISOString().slice(0, 10);
    const existing = dailyTrend.get(dStr) || { date: dStr, sales: 0, profit: 0 };
    existing.sales += s.grandTotal.toNumber();
    existing.profit += s.grandTotal.sub(s.cogs).toNumber();
    dailyTrend.set(dStr, existing);
  }

  let totalPurchases = new Prisma.Decimal(0);
  for (const p of purchases) {
    totalPurchases = totalPurchases.add(p.grandTotal);
  }

  let totalExpenses = new Prisma.Decimal(0);
  for (const e of expenses) {
    totalExpenses = totalExpenses.add(e.amount);
  }

  const grossProfit = totalRevenue.sub(totalCogs);
  const netProfit = grossProfit.sub(totalExpenses);

  return {
    year: y,
    month: m + 1,
    from,
    to,
    sales: {
      orders: sales.length,
      revenue: totalRevenue,
      cogs: totalCogs,
      itemsSold,
      customers: distinctCustomerIds.size,
    },
    purchases: {
      orders: purchases.length,
      total: totalPurchases,
    },
    expenses: {
      count: expenses.length,
      total: totalExpenses,
    },
    profit: {
      grossProfit,
      netProfit,
    },
    dailyTrend: Array.from(dailyTrend.values()),
  };
}

export async function getYearlyReport(year?: number) {
  const y = year || new Date().getFullYear();
  const from = new Date(y, 0, 1);
  const to = new Date(y, 11, 31, 23, 59, 59, 999);

  const [sales, purchases, expenses] = await Promise.all([
    prisma.sale.findMany({
      where: {
        status: DocumentStatus.CONFIRMED,
        saleDate: { gte: from, lte: to },
      },
    }),
    prisma.purchase.findMany({
      where: {
        status: DocumentStatus.CONFIRMED,
        purchaseDate: { gte: from, lte: to },
      },
    }),
    prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
    }),
  ]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyComparison = monthNames.map((name, idx) => ({
    month: name,
    monthIndex: idx,
    sales: 0,
    purchases: 0,
    expenses: 0,
    profit: 0,
  }));

  let totalRevenue = new Prisma.Decimal(0);
  let totalCogs = new Prisma.Decimal(0);

  for (const s of sales) {
    totalRevenue = totalRevenue.add(s.grandTotal);
    totalCogs = totalCogs.add(s.cogs);
    const mIdx = s.saleDate.getMonth();
    monthlyComparison[mIdx].sales += s.grandTotal.toNumber();
    monthlyComparison[mIdx].profit += s.grandTotal.sub(s.cogs).toNumber();
  }

  let totalPurchases = new Prisma.Decimal(0);
  for (const p of purchases) {
    totalPurchases = totalPurchases.add(p.grandTotal);
    const mIdx = p.purchaseDate.getMonth();
    monthlyComparison[mIdx].purchases += p.grandTotal.toNumber();
  }

  let totalExpenses = new Prisma.Decimal(0);
  for (const e of expenses) {
    totalExpenses = totalExpenses.add(e.amount);
    const mIdx = e.date.getMonth();
    monthlyComparison[mIdx].expenses += e.amount.toNumber();
    monthlyComparison[mIdx].profit -= e.amount.toNumber();
  }

  const grossProfit = totalRevenue.sub(totalCogs);
  const netProfit = grossProfit.sub(totalExpenses);

  return {
    year: y,
    sales: {
      orders: sales.length,
      revenue: totalRevenue,
      cogs: totalCogs,
    },
    purchases: {
      orders: purchases.length,
      total: totalPurchases,
    },
    expenses: {
      count: expenses.length,
      total: totalExpenses,
    },
    profit: {
      grossProfit,
      netProfit,
    },
    monthlyComparison,
  };
}

export async function getSalesReport(from?: Date, to?: Date) {
  const f = from || new Date(Date.now() - 30 * 86400000);
  const t = to || new Date();

  const sales = await prisma.sale.findMany({
    where: {
      status: DocumentStatus.CONFIRMED,
      saleDate: { gte: f, lte: t },
    },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
    orderBy: { saleDate: 'desc' },
  });

  return { from: f, to: t, count: sales.length, sales };
}

export async function getPurchasesReport(from?: Date, to?: Date) {
  const f = from || new Date(Date.now() - 30 * 86400000);
  const t = to || new Date();

  const purchases = await prisma.purchase.findMany({
    where: {
      status: DocumentStatus.CONFIRMED,
      purchaseDate: { gte: f, lte: t },
    },
    include: {
      supplier: true,
      items: { include: { product: true } },
    },
    orderBy: { purchaseDate: 'desc' },
  });

  return { from: f, to: t, count: purchases.length, purchases };
}

export async function getInventoryReport() {
  const products = await prisma.product.findMany({
    include: { category: true, supplier: true },
    orderBy: { name: 'asc' },
  });

  let totalQty = new Prisma.Decimal(0);
  let totalVal = new Prisma.Decimal(0);

  for (const p of products) {
    totalQty = totalQty.add(p.stock);
    totalVal = totalVal.add(p.stock.mul(p.averageCost));
  }

  return {
    totalProducts: products.length,
    totalQuantity: totalQty,
    totalValuation: totalVal,
    products,
  };
}
