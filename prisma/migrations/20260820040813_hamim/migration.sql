-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'PURCHASE');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK', 'BKASH', 'NAGAD', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('PURCHASE', 'SALE', 'PURCHASE_RETURN', 'SALES_RETURN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'OPENING_STOCK');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CUSTOMER', 'SUPPLIER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "purchasePrice" DECIMAL(14,2) NOT NULL,
    "sellingPrice" DECIMAL(14,2) NOT NULL,
    "wholesalePrice" DECIMAL(14,2),
    "stock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "averageCost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "minimumStock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "maximumStock" DECIMAL(14,3),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "shipping" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "shipping" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(14,2) NOT NULL,
    "cogs" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "unitCost" DECIMAL(14,4) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,4),
    "referenceType" TEXT,
    "referenceId" TEXT,
    "reason" TEXT,
    "note" TEXT,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "partyType" "PartyType" NOT NULL,
    "partyId" TEXT NOT NULL,
    "customerId" TEXT,
    "supplierId" TEXT,
    "saleId" TEXT,
    "purchaseId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "description" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReturn" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "total" DECIMAL(14,2) NOT NULL,
    "cogs" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReturnItem" (
    "id" TEXT NOT NULL,
    "salesReturnId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "SalesReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReturn" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "total" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReturnItem" (
    "id" TEXT NOT NULL,
    "purchaseReturnId" TEXT NOT NULL,
    "purchaseItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PurchaseReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_purchaseNumber_key" ON "Purchase"("purchaseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_invoiceNumber_key" ON "Sale"("invoiceNumber");

-- CreateIndex
CREATE INDEX "StockMovement_productId_movementDate_idx" ON "StockMovement"("productId", "movementDate");

-- CreateIndex
CREATE INDEX "SalesReturnItem_saleItemId_idx" ON "SalesReturnItem"("saleItemId");

-- CreateIndex
CREATE INDEX "PurchaseReturnItem_purchaseItemId_idx" ON "PurchaseReturnItem"("purchaseItemId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_salesReturnId_fkey" FOREIGN KEY ("salesReturnId") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturn" ADD CONSTRAINT "PurchaseReturn_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReturnItem" ADD CONSTRAINT "PurchaseReturnItem_purchaseReturnId_fkey" FOREIGN KEY ("purchaseReturnId") REFERENCES "PurchaseReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
