import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface AlertNotification {
  id: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'CUSTOMER_OVERDUE' | 'SUPPLIER_DUE' | 'DEAD_STOCK';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  amount?: number;
  referenceId?: string;
  referenceType?: string;
  actionUrl: string;
  actionLabel: string;
  timestamp: string;
}

export interface LiveAlertsResponse {
  alerts: AlertNotification[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    customerDue: {
      count: number;
      totalAmount: number;
    };
    supplierDue: {
      count: number;
      totalAmount: number;
    };
    lowStock: {
      totalCount: number;
      outOfStockCount: number;
      lowStockCount: number;
    };
    deadStock: {
      count: number;
      totalValue: number;
    };
  };
}

export async function getLiveAlerts(): Promise<LiveAlertsResponse> {
  const alerts: AlertNotification[] = [];
  const now = new Date();

  // 1. Scan Inventory Alerts (Low Stock & Out of Stock)
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      minimumStock: true,
      unit: true,
      purchasePrice: true,
      createdAt: true,
    },
  });

  let outOfStockCount = 0;
  let lowStockCount = 0;

  for (const p of products) {
    if (p.stock.lte(0)) {
      outOfStockCount++;
      alerts.push({
        id: `oos-${p.id}`,
        type: 'OUT_OF_STOCK',
        severity: 'CRITICAL',
        title: `Out of Stock: ${p.name}`,
        message: `Product SKU "${p.sku}" has 0 ${p.unit} remaining. Immediate procurement required.`,
        referenceId: p.id,
        referenceType: 'PRODUCT',
        actionUrl: `/dashboard/purchases/create`,
        actionLabel: 'Reorder Stock',
        timestamp: now.toISOString(),
      });
    } else if (p.stock.lte(p.minimumStock)) {
      lowStockCount++;
      alerts.push({
        id: `low-${p.id}`,
        type: 'LOW_STOCK',
        severity: 'WARNING',
        title: `Low Stock: ${p.name}`,
        message: `Current stock (${p.stock.toString()} ${p.unit}) is at or below reorder threshold (${p.minimumStock.toString()} ${p.unit}).`,
        referenceId: p.id,
        referenceType: 'PRODUCT',
        actionUrl: `/dashboard/purchases/create`,
        actionLabel: 'Order Stock',
        timestamp: now.toISOString(),
      });
    }
  }

  // 2. Scan Customer Due & Overdue Receivables
  const customerDueSales = await prisma.sale.findMany({
    where: {
      status: 'CONFIRMED',
      dueAmount: { gt: 0 },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { dueAmount: 'desc' },
  });

  let totalCustomerDueAmount = 0;
  for (const s of customerDueSales) {
    const dueNum = Number(s.dueAmount);
    totalCustomerDueAmount += dueNum;

    const isOverdue = now.getTime() - new Date(s.saleDate).getTime() > 7 * 86400000;
    const customerName = s.customer?.name || 'Walk-in Client';

    alerts.push({
      id: `sale-due-${s.id}`,
      type: 'CUSTOMER_OVERDUE',
      severity: isOverdue ? 'WARNING' : 'INFO',
      title: `${isOverdue ? 'Overdue' : 'Due'} Customer Payment: ${customerName}`,
      message: `Invoice #${s.invoiceNumber} has an unpaid balance of ৳ ${dueNum.toLocaleString('en-BD')} (Billed: ${new Date(s.saleDate).toLocaleDateString()}).`,
      amount: dueNum,
      referenceId: s.id,
      referenceType: 'SALE',
      actionUrl: `/dashboard/payments/receivable`,
      actionLabel: 'Receive Due',
      timestamp: s.saleDate.toISOString(),
    });
  }

  // 3. Scan Outstanding Supplier Payables
  const supplierDuePurchases = await prisma.purchase.findMany({
    where: {
      status: 'CONFIRMED',
      dueAmount: { gt: 0 },
    },
    include: {
      supplier: { select: { id: true, name: true, company: true } },
    },
    orderBy: { dueAmount: 'desc' },
  });

  let totalSupplierDueAmount = 0;
  for (const p of supplierDuePurchases) {
    const dueNum = Number(p.dueAmount);
    totalSupplierDueAmount += dueNum;

    alerts.push({
      id: `pur-due-${p.id}`,
      type: 'SUPPLIER_DUE',
      severity: 'WARNING',
      title: `Supplier Due: ${p.supplier.name} ${p.supplier.company ? `(${p.supplier.company})` : ''}`,
      message: `Purchase Order #${p.purchaseNumber} has an outstanding payable of ৳ ${dueNum.toLocaleString('en-BD')}.`,
      amount: dueNum,
      referenceId: p.id,
      referenceType: 'PURCHASE',
      actionUrl: `/dashboard/payments/payable`,
      actionLabel: 'Pay Due',
      timestamp: p.purchaseDate.toISOString(),
    });
  }

  // 4. Scan Dead Stock (Products in stock with no sales in 90+ days)
  const deadStockCutoff = new Date(Date.now() - 90 * 86400000);
  const inStockProducts = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      stock: { gt: 0 },
    },
    include: {
      saleItems: {
        include: { sale: true },
        orderBy: { sale: { saleDate: 'desc' } },
        take: 1,
      },
    },
  });

  let deadStockCount = 0;
  let deadStockTotalValue = 0;

  for (const p of inStockProducts) {
    const lastSale = p.saleItems[0]?.sale;
    const isDead = (!lastSale && p.createdAt <= deadStockCutoff) || (lastSale && lastSale.saleDate <= deadStockCutoff);

    if (isDead) {
      deadStockCount++;
      const val = Number(p.stock) * Number(p.purchasePrice);
      deadStockTotalValue += val;

      alerts.push({
        id: `dead-${p.id}`,
        type: 'DEAD_STOCK',
        severity: 'INFO',
        title: `Dead Stock: ${p.name}`,
        message: `Product SKU "${p.sku}" (${p.stock.toString()} units, valuation: ৳ ${val.toLocaleString('en-BD')}) has recorded no sales in over 90 days.`,
        amount: val,
        referenceId: p.id,
        referenceType: 'PRODUCT',
        actionUrl: `/dashboard/products/${p.id}`,
        actionLabel: 'View Stock',
        timestamp: lastSale ? lastSale.saleDate.toISOString() : p.createdAt.toISOString(),
      });
    }
  }

  const critical = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const warning = alerts.filter((a) => a.severity === 'WARNING').length;
  const info = alerts.filter((a) => a.severity === 'INFO').length;

  return {
    alerts,
    summary: {
      total: alerts.length,
      critical,
      warning,
      info,
      customerDue: {
        count: customerDueSales.length,
        totalAmount: totalCustomerDueAmount,
      },
      supplierDue: {
        count: supplierDuePurchases.length,
        totalAmount: totalSupplierDueAmount,
      },
      lowStock: {
        totalCount: outOfStockCount + lowStockCount,
        outOfStockCount,
        lowStockCount,
      },
      deadStock: {
        count: deadStockCount,
        totalValue: deadStockTotalValue,
      },
    },
  };
}
