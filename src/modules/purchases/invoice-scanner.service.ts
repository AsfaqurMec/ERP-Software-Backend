import { GoogleGenAI } from '@google/genai';
import { prisma } from '../../lib/prisma.js';

export interface ScannedInvoiceItem {
  rawName: string;
  rawSku?: string;
  quantity: number;
  unitCost: number;
  discount: number;
  tax: number;
  total: number;
  matchedProductId: string | null;
  matchedProductName: string | null;
  matchedSku: string | null;
  matchConfidence: number; // 0 to 1
  isNewProduct: boolean;
}

export interface ScannedInvoiceResult {
  supplierName: string | null;
  matchedSupplierId: string | null;
  invoiceNumber: string | null;
  invoiceDate: string;
  items: ScannedInvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  grandTotal: number;
  extractionMethod: 'GEMINI_AI' | 'PATTERN_PARSER';
  notes?: string;
}

/**
 * Calculates string similarity between 0 and 1 using token overlap and character distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Direct substring bonus
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.85;
  }

  // Token overlap (Jaccard similarity)
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

/**
 * Robust structural parser for text / tabular receipts when AI key is absent
 */
function parseTextInvoiceFallback(text: string): {
  supplierName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string;
  items: Array<{ name: string; sku?: string; quantity: number; unitCost: number }>;
  discount: number;
  tax: number;
  shipping: number;
} {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let supplierName: string | null = null;
  let invoiceNumber: string | null = null;
  const items: Array<{ name: string; sku?: string; quantity: number; unitCost: number }> = [];

  for (const line of lines) {
    // Check for invoice number
    const invMatch = line.match(/(?:invoice|bill|inv|memo)[\s#:]*([A-Za-z0-9\-_]+)/i);
    if (invMatch && !invoiceNumber) {
      invoiceNumber = invMatch[1];
    }

    // Check for supplier name
    const suppMatch = line.match(/(?:supplier|vendor|from|company)[\s:]+([A-Za-z0-9\s&.,]+)/i);
    if (suppMatch && !supplierName) {
      supplierName = suppMatch[1].trim();
    }

    // Line item parser: looks for "ItemName [qty] [cost]" or comma/tab separated
    // e.g. "Wireless Mouse, 10 pcs, 350" or "Keyboard x 5 @ 500"
    const itemMatch =
      line.match(/^([A-Za-z0-9\s\-_()]+)[,\t|]+(\d+(?:\.\d+)?)[,\t|\s@x*]+(\d+(?:\.\d+)?)/) ||
      line.match(/^(.+?)\s+(\d+)\s+(?:pcs|units|kg|box)?\s*[@x]?\s*(\d+(?:\.\d+)?)$/i);

    if (itemMatch) {
      const name = itemMatch[1].trim();
      const qty = parseFloat(itemMatch[2]);
      const cost = parseFloat(itemMatch[3]);
      if (name && qty > 0 && cost > 0 && !name.toLowerCase().includes('total') && !name.toLowerCase().includes('subtotal')) {
        items.push({ name, quantity: qty, unitCost: cost });
      }
    }
  }

  return {
    supplierName,
    invoiceNumber,
    invoiceDate: new Date().toISOString().slice(0, 10),
    items,
    discount: 0,
    tax: 0,
    shipping: 0,
  };
}

export async function scanAndExtractInvoice(params: {
  imageBase64?: string;
  mimeType?: string;
  textContent?: string;
}): Promise<ScannedInvoiceResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  let rawExtracted: {
    supplierName: string | null;
    invoiceNumber: string | null;
    invoiceDate: string;
    items: Array<{ name: string; sku?: string; quantity: number; unitCost: number; discount?: number; tax?: number }>;
    discount: number;
    tax: number;
    shipping: number;
  };

  let extractionMethod: 'GEMINI_AI' | 'PATTERN_PARSER' = 'PATTERN_PARSER';

  // 1. Try Gemini AI if API key is present
  if (apiKey && (params.imageBase64 || params.textContent)) {
    try {
      const client = new GoogleGenAI({ apiKey });

      const prompt = `You are an expert ERP invoice/receipt ingestion AI. 
Extract invoice data from the provided document and return ONLY valid JSON matching this schema:
{
  "supplierName": string or null,
  "invoiceNumber": string or null,
  "invoiceDate": "YYYY-MM-DD",
  "items": [
    {
      "name": string,
      "sku": string or null,
      "quantity": number,
      "unitCost": number,
      "discount": number,
      "tax": number
    }
  ],
  "discount": number,
  "tax": number,
  "shipping": number
}
Do not include markdown ticks (\`\`\`json). Output pure JSON only.`;

      let contents: any[] = [];
      if (params.imageBase64 && params.mimeType) {
        contents = [
          prompt,
          {
            inlineData: {
              data: params.imageBase64,
              mimeType: params.mimeType,
            },
          },
        ];
      } else if (params.textContent) {
        contents = [prompt, `Invoice document text:\n${params.textContent}`];
      }

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      rawExtracted = {
        supplierName: parsed.supplierName || null,
        invoiceNumber: parsed.invoiceNumber || null,
        invoiceDate: parsed.invoiceDate || new Date().toISOString().slice(0, 10),
        items: Array.isArray(parsed.items) ? parsed.items : [],
        discount: Number(parsed.discount || 0),
        tax: Number(parsed.tax || 0),
        shipping: Number(parsed.shipping || 0),
      };
      extractionMethod = 'GEMINI_AI';
    } catch (err) {
      console.warn('Gemini AI invoice extraction fallback triggered:', err);
      rawExtracted = parseTextInvoiceFallback(params.textContent || '');
    }
  } else {
    rawExtracted = parseTextInvoiceFallback(params.textContent || '');
  }

  // 2. Fetch existing products and suppliers from database for Fuzzy Matching
  const [dbProducts, dbSuppliers] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, sku: true, barcode: true, purchasePrice: true, averageCost: true },
    }),
    prisma.supplier.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, company: true },
    }),
  ]);

  // Match Supplier
  let matchedSupplierId: string | null = null;
  if (rawExtracted.supplierName && dbSuppliers.length > 0) {
    let bestSupplierScore = 0;
    for (const supp of dbSuppliers) {
      const scoreName = calculateSimilarity(rawExtracted.supplierName, supp.name);
      const scoreCompany = supp.company ? calculateSimilarity(rawExtracted.supplierName, supp.company) : 0;
      const maxScore = Math.max(scoreName, scoreCompany);
      if (maxScore > bestSupplierScore && maxScore >= 0.5) {
        bestSupplierScore = maxScore;
        matchedSupplierId = supp.id;
      }
    }
  }

  // Match Line Items
  const matchedItems: ScannedInvoiceItem[] = [];
  let calculatedSubtotal = 0;

  for (const rawItem of rawExtracted.items) {
    const rawQty = Math.max(1, Number(rawItem.quantity || 1));
    const rawCost = Math.max(0, Number(rawItem.unitCost || 0));
    const itemDiscount = Math.max(0, Number(rawItem.discount || 0));
    const itemTax = Math.max(0, Number(rawItem.tax || 0));
    const itemTotal = rawCost * rawQty - itemDiscount + itemTax;
    calculatedSubtotal += itemTotal;

    // Fuzzy match against database products
    let bestProductMatch: (typeof dbProducts)[0] | null = null;
    let highestConfidence = 0;

    for (const p of dbProducts) {
      // 1. Direct SKU or barcode exact match
      if (rawItem.sku && (p.sku.toLowerCase() === rawItem.sku.toLowerCase() || p.barcode === rawItem.sku)) {
        bestProductMatch = p;
        highestConfidence = 1.0;
        break;
      }

      // 2. Name similarity
      const nameScore = calculateSimilarity(rawItem.name, p.name);
      if (nameScore > highestConfidence) {
        highestConfidence = nameScore;
        bestProductMatch = p;
      }
    }

    const isMatched = highestConfidence >= 0.5 && bestProductMatch !== null;

    matchedItems.push({
      rawName: rawItem.name,
      rawSku: rawItem.sku,
      quantity: rawQty,
      unitCost: rawCost > 0 ? rawCost : bestProductMatch ? bestProductMatch.purchasePrice.toNumber() : 0,
      discount: itemDiscount,
      tax: itemTax,
      total: Math.round(itemTotal),
      matchedProductId: isMatched ? bestProductMatch!.id : null,
      matchedProductName: isMatched ? bestProductMatch!.name : null,
      matchedSku: isMatched ? bestProductMatch!.sku : null,
      matchConfidence: highestConfidence,
      isNewProduct: !isMatched,
    });
  }

  const grandTotal = Math.max(
    0,
    calculatedSubtotal - rawExtracted.discount + rawExtracted.tax + rawExtracted.shipping
  );

  return {
    supplierName: rawExtracted.supplierName,
    matchedSupplierId,
    invoiceNumber: rawExtracted.invoiceNumber,
    invoiceDate: rawExtracted.invoiceDate,
    items: matchedItems,
    subtotal: Math.round(calculatedSubtotal),
    discount: rawExtracted.discount,
    tax: rawExtracted.tax,
    shipping: rawExtracted.shipping,
    grandTotal: Math.round(grandTotal),
    extractionMethod,
    notes: `Scanned via ${extractionMethod}. Extracted ${matchedItems.length} line items with ${matchedItems.filter((i) => i.matchedProductId).length} matched SKUs.`,
  };
}
