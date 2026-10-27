import { Prisma, PaymentStatus, DocumentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

export interface CustomerCreditProfile {
  customerId: string;
  customerName: string;
  phone: string | null;
  balance: number;
  totalSalesVolume: number;
  confirmedOrdersCount: number;
  averageOrderValue: number;
  unpaidInvoicesCount: number;
  oldestUnpaidDays: number;
  averageRepaymentDays: number;
  overdueRatio: number; // balance / totalSalesVolume
  riskScore: number; // 0 - 100 (higher = safer, lower = riskier)
  riskCategory: 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
  creditRecommendation: 'UNRESTRICTED' | 'MODERATE_LIMIT' | 'STRICT_COD_ONLY';
  recommendedCreditLimit: number;
  allowCreditSale: boolean;
  riskFactors: string[];
  whatsAppReminderUrl: string | null;
  reminderMessage: string | null;
}

/**
 * Calculates statistical & behavioral credit risk profile for a customer.
 */
export async function evaluateCustomerCreditRisk(customerId: string): Promise<CustomerCreditProfile> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      sales: {
        where: { status: DocumentStatus.CONFIRMED },
        include: { payments: true },
        orderBy: { saleDate: 'asc' },
      },
      payments: {
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!customer) {
    throw new NotFoundError('Customer');
  }

  const balance = customer.balance.toNumber();
  const sales = customer.sales;
  const payments = customer.payments;

  let totalSalesVolume = 0;
  let unpaidInvoicesCount = 0;
  let oldestUnpaidDays = 0;
  const now = new Date();

  // Track unpaid sales and calculate aging
  for (const s of sales) {
    const grandTotal = s.grandTotal.toNumber();
    totalSalesVolume += grandTotal;

    const dueAmount = s.dueAmount.toNumber();
    if (dueAmount > 0) {
      unpaidInvoicesCount++;
      const daysOld = Math.max(0, Math.floor((now.getTime() - new Date(s.saleDate).getTime()) / (1000 * 60 * 60 * 24)));
      if (daysOld > oldestUnpaidDays) {
        oldestUnpaidDays = daysOld;
      }
    }
  }

  const confirmedOrdersCount = sales.length;
  const averageOrderValue = confirmedOrdersCount > 0 ? Math.round(totalSalesVolume / confirmedOrdersCount) : 0;

  // Calculate Average Repayment Days from payments
  let totalRepaymentDays = 0;
  let measuredPaymentsCount = 0;

  for (const p of payments) {
    if (p.saleId) {
      const parentSale = sales.find((s) => s.id === p.saleId);
      if (parentSale) {
        const diffDays = Math.max(
          0,
          Math.floor((new Date(p.date).getTime() - new Date(parentSale.saleDate).getTime()) / (1000 * 60 * 60 * 24))
        );
        totalRepaymentDays += diffDays;
        measuredPaymentsCount++;
      }
    }
  }

  const averageRepaymentDays = measuredPaymentsCount > 0 ? Math.round(totalRepaymentDays / measuredPaymentsCount) : 10;
  const overdueRatio = totalSalesVolume > 0 ? balance / totalSalesVolume : balance > 0 ? 1 : 0;

  // -------------------------------------------------------------
  // Credit Risk Scoring Algorithm (0 - 100)
  // Higher = Safe / Reliable; Lower = High Default Risk
  // -------------------------------------------------------------
  let score = 100;
  const riskFactors: string[] = [];

  // 1. Balance size and overdue ratio penalty
  if (balance > 0) {
    if (overdueRatio > 0.6) {
      score -= 35;
      riskFactors.push(`High debt-to-volume ratio: Outstanding debt is ${(overdueRatio * 100).toFixed(0)}% of total sales.`);
    } else if (overdueRatio > 0.3) {
      score -= 20;
      riskFactors.push(`Moderate debt ratio: ${(overdueRatio * 100).toFixed(0)}% of sales volume is currently unpaid.`);
    } else {
      score -= 10;
    }
  }

  // 2. Invoice Aging penalty (Worst factor for liquidity)
  if (oldestUnpaidDays > 60) {
    score -= 40;
    riskFactors.push(`Critical invoice aging: Unpaid invoice has been overdue for ${oldestUnpaidDays} days.`);
  } else if (oldestUnpaidDays > 30) {
    score -= 25;
    riskFactors.push(`Overdue invoice: Unpaid bill has exceeded standard 30-day term (${oldestUnpaidDays} days).`);
  } else if (oldestUnpaidDays > 14) {
    score -= 10;
    riskFactors.push(`Pending payment: Recent balance open for ${oldestUnpaidDays} days.`);
  }

  // 3. Payment Latency Penalty
  if (averageRepaymentDays > 45) {
    score -= 20;
    riskFactors.push(`Slow settlement cadence: Customer averages ${averageRepaymentDays} days to settle invoices.`);
  } else if (averageRepaymentDays > 25) {
    score -= 10;
    riskFactors.push(`Moderate settlement delay: Averages ${averageRepaymentDays} days per payment.`);
  }

  // 4. Loyalty & History Trust Bonus
  if (confirmedOrdersCount >= 10 && oldestUnpaidDays <= 30) {
    score += 15;
  } else if (confirmedOrdersCount >= 5 && oldestUnpaidDays <= 30) {
    score += 10;
  } else if (confirmedOrdersCount <= 1 && balance > 0) {
    score -= 15;
    riskFactors.push('Unestablished credit history: New or single-order customer requesting credit.');
  }

  const riskScore = Math.max(0, Math.min(100, score));

  // Determine Category and Actionable Limits
  let riskCategory: CustomerCreditProfile['riskCategory'] = 'LOW_RISK';
  let creditRecommendation: CustomerCreditProfile['creditRecommendation'] = 'UNRESTRICTED';
  let recommendedCreditLimit = 0;
  let allowCreditSale = true;

  if (riskScore < 50 || oldestUnpaidDays > 45) {
    riskCategory = 'HIGH_RISK';
    creditRecommendation = 'STRICT_COD_ONLY';
    recommendedCreditLimit = 0;
    allowCreditSale = false;
    if (riskFactors.length === 0) {
      riskFactors.push('High probability of payment default or extended capital lockup.');
    }
  } else if (riskScore < 75 || oldestUnpaidDays > 20) {
    riskCategory = 'MEDIUM_RISK';
    creditRecommendation = 'MODERATE_LIMIT';
    // Max safe limit: 25% of average order value or min cap
    recommendedCreditLimit = Math.max(10000, Math.round(averageOrderValue * 0.5));
    allowCreditSale = balance < recommendedCreditLimit;
    if (!allowCreditSale) {
      riskFactors.push(`Current balance (৳${balance.toLocaleString()}) exceeds safe limit (৳${recommendedCreditLimit.toLocaleString()}).`);
    }
  } else {
    riskCategory = 'LOW_RISK';
    creditRecommendation = 'UNRESTRICTED';
    recommendedCreditLimit = Math.max(50000, Math.round(averageOrderValue * 2));
    allowCreditSale = true;
  }

  // Build Personalized WhatsApp Collection Reminder
  let whatsAppReminderUrl: string | null = null;
  let reminderMessage: string | null = null;

  if (balance > 0 && customer.phone) {
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('880') ? cleanPhone : cleanPhone.startsWith('0') ? `88${cleanPhone}` : cleanPhone;

    reminderMessage =
      `Dear ${customer.name},\n` +
      `This is a friendly reminder regarding your outstanding balance of ৳${balance.toLocaleString()} with StockPilot.\n` +
      (oldestUnpaidDays > 0 ? `The oldest invoice has been due for ${oldestUnpaidDays} days.\n` : '') +
      `Kindly arrange settlement at your earliest convenience to maintain an active credit account.\n` +
      `Thank you for your business!`;

    whatsAppReminderUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(reminderMessage)}`;
  }

  return {
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
    balance,
    totalSalesVolume,
    confirmedOrdersCount,
    averageOrderValue,
    unpaidInvoicesCount,
    oldestUnpaidDays,
    averageRepaymentDays,
    overdueRatio: Number(overdueRatio.toFixed(2)),
    riskScore,
    riskCategory,
    creditRecommendation,
    recommendedCreditLimit,
    allowCreditSale,
    riskFactors,
    whatsAppReminderUrl,
    reminderMessage,
  };
}
