import bcrypt from 'bcryptjs';
import {
  DocumentStatus,
  MovementType,
  PartyType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  Role,
  RecordStatus,
} from '@prisma/client';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('🌱 Starting full database seed with 100+ transactions & multi-month history...');

  // 1. Clean existing records in reverse dependency order
  await prisma.salesReturnItem.deleteMany();
  await prisma.salesReturn.deleteMany();
  await prisma.purchaseReturnItem.deleteMany();
  await prisma.purchaseReturn.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing tables.');

  // 2. Seed Users (All Roles + Example Demo User)
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const demoAdminHash = await bcrypt.hash('Admin@123456', 10);
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Demo Administrator',
        email: 'admin@example.com',
        passwordHash: demoAdminHash,
        role: Role.SUPER_ADMIN,
        status: RecordStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'superadmin@stockpilot.io',
        passwordHash,
        role: Role.SUPER_ADMIN,
        status: RecordStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'System Admin',
        email: 'admin@stockpilot.io',
        passwordHash,
        role: Role.ADMIN,
        status: RecordStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Operations Manager',
        email: 'manager@stockpilot.io',
        passwordHash,
        role: Role.MANAGER,
        status: RecordStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Sales Executive',
        email: 'sales@stockpilot.io',
        passwordHash,
        role: Role.SALES,
        status: RecordStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Procurement Specialist',
        email: 'purchase@stockpilot.io',
        passwordHash,
        role: Role.PURCHASE,
        status: RecordStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Senior Accountant',
        email: 'accountant@stockpilot.io',
        passwordHash,
        role: Role.ACCOUNTANT,
        status: RecordStatus.ACTIVE,
      },
    }),
  ]);
  console.log(`✅ Seeded ${users.length} authenticated users.`);

  // 3. Seed Categories
  const categoryNames = [
    { name: 'Electronics', desc: 'Laptops, monitors, computing accessories' },
    { name: 'Clothing & Apparel', desc: 'Apparel, fabric, uniforms' },
    { name: 'Food & Beverage', desc: 'Packaged food, coffee, tea, pantry supplies' },
    { name: 'Accessories', desc: 'Bags, watch straps, desk gear' },
    { name: 'Stationery & Office', desc: 'Paper, notebooks, desk stationery' },
    { name: 'Home Appliances', desc: 'Fans, kettles, blenders, heaters' },
    { name: 'Mobile Accessories', desc: 'Fast chargers, cables, earbuds, powerbanks' },
  ];

  const categories = await Promise.all(
    categoryNames.map((c) =>
      prisma.category.create({
        data: { name: c.name, description: c.desc, status: RecordStatus.ACTIVE },
      })
    )
  );
  console.log(`✅ Seeded ${categories.length} categories.`);

  // 4. Seed Suppliers (12 Suppliers)
  const supplierData = [
    { name: 'Metro Tech Distribution', company: 'Metro Tech Ltd.', phone: '+880 1711-000101', email: 'sales@metrotech.com', address: 'BCS Computer City, IDB Bhaban, Dhaka' },
    { name: 'Apex Apparel Sourcing', company: 'Apex Textile Mills', phone: '+880 1711-000102', email: 'orders@apextextiles.com', address: 'Gazipur Industrial Area, Dhaka' },
    { name: 'Bengal Food & Provisions', company: 'Bengal Agro Foods Ltd.', phone: '+880 1711-000103', email: 'supply@bengalfoods.com', address: 'Tejgaon Industrial Area, Dhaka' },
    { name: 'Silicon Valley Imports', company: 'Silicon Valley Trading Co.', phone: '+880 1711-000104', email: 'info@siliconimports.bd', address: 'Elephant Road, Dhaka' },
    { name: 'Delta Office Essentials', company: 'Delta Paper & Stationery', phone: '+880 1711-000105', email: 'contact@deltapaper.com', address: 'Banglabazar, Old Dhaka' },
    { name: 'National Electronics Corp', company: 'National Consumer Electronics', phone: '+880 1711-000106', email: 'sales@nationalelec.com', address: 'Stadium Market, Motijheel, Dhaka' },
    { name: 'SmartGear Global Ltd.', company: 'SmartGear Accessories', phone: '+880 1711-000107', email: 'b2b@smartgear.com', address: 'Dhanmondi 27, Dhaka' },
    { name: 'Premier Lifestyle Goods', company: 'Premier Consumer Products', phone: '+880 1711-000108', email: 'info@premierlifestyle.bd', address: 'Gulshan 1, Dhaka' },
    { name: 'Eastern Hardware Logistics', company: 'Eastern Trading House', phone: '+880 1711-000109', email: 'eastern@hardwarebd.com', address: 'Nawabpur Road, Dhaka' },
    { name: 'Greenleaf Tea & Commodities', company: 'Greenleaf Agro Industries', phone: '+880 1711-000110', email: 'export@greenleaftea.com', address: 'Agrabad Commercial Area, Chittagong' },
    { name: 'AnkerBD Accessories', company: 'Anker Power Solutions', phone: '+880 1711-000111', email: 'supply@ankerbd.com', address: 'Banani, Dhaka' },
    { name: 'Comfort Home Products', company: 'Comfort Appliances Ltd.', phone: '+880 1711-000112', email: 'sales@comfortappliances.com', address: 'Mirpur 10, Dhaka' },
  ];

  const suppliers = await Promise.all(
    supplierData.map((s) =>
      prisma.supplier.create({
        data: {
          name: s.name,
          company: s.company,
          phone: s.phone,
          email: s.email,
          address: s.address,
          openingBalance: new Prisma.Decimal(0),
          balance: new Prisma.Decimal(0),
          status: RecordStatus.ACTIVE,
        },
      })
    )
  );
  console.log(`✅ Seeded ${suppliers.length} suppliers.`);

  // 5. Seed Customers (25 Customers)
  const customerData = [
    { name: 'Rahim Enterprise', phone: '+880 1819-100201', email: 'rahim@enterprise.bd', address: 'Motijheel C/A, Dhaka' },
    { name: 'Karim Retail & Co.', phone: '+880 1819-100202', email: 'karim@retail.com', address: 'Dhanmondi, Dhaka' },
    { name: 'Chowdhury Tech Store', phone: '+880 1819-100203', email: 'shop@chowdhurytech.com', address: 'Uttara Sector 3, Dhaka' },
    { name: 'Shadhin IT Solutions', phone: '+880 1819-100204', email: 'procurement@shadhinit.com', address: 'Kawran Bazar, Dhaka' },
    { name: 'Prime Office Supplies', phone: '+880 1819-100205', email: 'billing@primeoffice.bd', address: 'Mohakhali DOHS, Dhaka' },
    { name: 'Blue Horizon Cafe', phone: '+880 1819-100206', email: 'orders@bluehorizoncafe.com', address: 'Banani 11, Dhaka' },
    { name: 'Evergreen Garments Ltd.', phone: '+880 1819-100207', email: 'admin@evergreengarments.com', address: 'Ashulia, Savar' },
    { name: 'Nippon Electronics Mart', phone: '+880 1819-100208', email: 'info@nipponelec.bd', address: 'Agrabad, Chittagong' },
    { name: 'Smart Lifestyle Hub', phone: '+880 1819-100209', email: 'lifestyle@smartbd.com', address: 'Gulshan 2, Dhaka' },
    { name: 'Green Valley Supermarket', phone: '+880 1819-100210', email: 'purchasing@greenvalleyshop.com', address: 'Sylhet Sadar' },
    { name: 'Alpha Traders & Logistics', phone: '+880 1819-100211', email: 'alpha@tradersbd.com', address: 'Khulna Commercial Area' },
    { name: 'Nova Gadget Corner', phone: '+880 1819-100212', email: 'nova@gadgetcorner.bd', address: 'Mirpur 2, Dhaka' },
    { name: 'Zenith Design Agency', phone: '+880 1819-100213', email: 'accounts@zenithagency.com', address: 'Baridhara, Dhaka' },
    { name: 'Falcon Express Mart', phone: '+880 1819-100214', email: 'falcon@expressmart.bd', address: 'Rajshahi City' },
    { name: 'Vertex Computer System', phone: '+880 1819-100215', email: 'sales@vertexcomputer.com', address: 'Multiplan Center, Elephant Road' },
    { name: 'Sunrise Food Court', phone: '+880 1819-100216', email: 'sunrise@foodcourtbd.com', address: 'Baily Road, Dhaka' },
    { name: 'City Dental & Medical', phone: '+880 1819-100217', email: 'citydental@medicalbd.com', address: 'Green Road, Dhaka' },
    { name: 'Prestige Stationery Corner', phone: '+880 1819-100218', email: 'prestige@stationery.bd', address: 'Nilkhet, Dhaka' },
    { name: 'Delta Fashion Studio', phone: '+880 1819-100219', email: 'delta@fashionstudio.com', address: 'Bashundhara City, Dhaka' },
    { name: 'Urban Tech Hub', phone: '+880 1819-100220', email: 'urban@techhub.bd', address: 'Jamuna Future Park, Dhaka' },
    { name: 'Al-Hasan Trading House', phone: '+880 1819-100221', email: 'alhasan@trading.com', address: 'Chawkbazar, Old Dhaka' },
    { name: 'Starlight Book & Paper', phone: '+880 1819-100222', email: 'starlight@books.bd', address: 'Shahbagh, Dhaka' },
    { name: 'Golden Harvest Supplies', phone: '+880 1819-100223', email: 'golden@harvestbd.com', address: 'Bogura City Center' },
    { name: 'Titan Hardware Depot', phone: '+880 1819-100224', email: 'titan@hardwaredepot.com', address: 'Jatrabari, Dhaka' },
    { name: 'Apex Commercial Partners', phone: '+880 1819-100225', email: 'apex@commercialpartners.bd', address: 'Kakrail, Dhaka' },
  ];

  const customers = await Promise.all(
    customerData.map((c) =>
      prisma.customer.create({
        data: {
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          openingBalance: new Prisma.Decimal(0),
          balance: new Prisma.Decimal(0),
          status: RecordStatus.ACTIVE,
        },
      })
    )
  );
  console.log(`✅ Seeded ${customers.length} customers.`);

  // 6. Seed 42 Realistic Products
  const productConfigs = [
    // Electronics
    { sku: 'EL-001', barcode: '8901001001', name: 'Dell 24" IPS Full HD Monitor', cat: 'Electronics', brand: 'Dell', unit: 'Piece', cost: 16500, price: 20500, min: 5, open: 12 },
    { sku: 'EL-002', barcode: '8901001002', name: 'Logitech MX Master 3S Wireless Mouse', cat: 'Electronics', brand: 'Logitech', unit: 'Piece', cost: 8500, price: 11200, min: 10, open: 25 },
    { sku: 'EL-003', barcode: '8901001003', name: 'Keychron K2 Mechanical Keyboard', cat: 'Electronics', brand: 'Keychron', unit: 'Piece', cost: 7200, price: 9800, min: 8, open: 18 },
    { sku: 'EL-004', barcode: '8901001004', name: 'Anker 65W GaN USB-C Charger', cat: 'Electronics', brand: 'Anker', unit: 'Piece', cost: 3200, price: 4400, min: 15, open: 40 },
    { sku: 'EL-005', barcode: '8901001005', name: 'Sony WH-1000XM5 ANC Headphones', cat: 'Electronics', brand: 'Sony', unit: 'Piece', cost: 31000, price: 38500, min: 4, open: 8 },
    { sku: 'EL-006', barcode: '8901001006', name: 'Samsung 980 Pro 1TB NVMe SSD', cat: 'Electronics', brand: 'Samsung', unit: 'Piece', cost: 9500, price: 12800, min: 10, open: 22 },
    { sku: 'EL-007', barcode: '8901001007', name: 'SanDisk Extreme 128GB MicroSD', cat: 'Electronics', brand: 'SanDisk', unit: 'Piece', cost: 1400, price: 2100, min: 20, open: 60 },

    // Mobile Accessories
    { sku: 'MA-001', barcode: '8901002001', name: 'Baseus 20000mAh 65W Power Bank', cat: 'Mobile Accessories', brand: 'Baseus', unit: 'Piece', cost: 3800, price: 5200, min: 10, open: 30 },
    { sku: 'MA-002', barcode: '8901002002', name: 'Anker PowerLine+ USB-C to Lightning 2M', cat: 'Mobile Accessories', brand: 'Anker', unit: 'Piece', cost: 1200, price: 1850, min: 25, open: 80 },
    { sku: 'MA-003', barcode: '8901002003', name: 'UGREEN 100W USB-C Fast Charging Cable', cat: 'Mobile Accessories', brand: 'UGREEN', unit: 'Piece', cost: 750, price: 1200, min: 30, open: 90 },
    { sku: 'MA-004', barcode: '8901002004', name: 'QCY T13 Wireless Earbuds', cat: 'Mobile Accessories', brand: 'QCY', unit: 'Piece', cost: 1350, price: 2100, min: 15, open: 50 },
    { sku: 'MA-005', barcode: '8901002005', name: 'Magnetic MagSafe Car Mount Stand', cat: 'Mobile Accessories', brand: 'Joyroom', unit: 'Piece', cost: 900, price: 1600, min: 10, open: 35 },
    { sku: 'MA-006', barcode: '8901002006', name: 'Tempered Glass Screen Guard iPhone 15', cat: 'Mobile Accessories', brand: 'Nillkin', unit: 'Piece', cost: 300, price: 650, min: 40, open: 120 },

    // Clothing & Apparel
    { sku: 'CL-001', barcode: '8901003001', name: 'Premium Oxford Cotton Formal Shirt', cat: 'Clothing & Apparel', brand: 'Northstar Apparel', unit: 'Piece', cost: 1100, price: 1850, min: 15, open: 45 },
    { sku: 'CL-002', barcode: '8901003002', name: 'Slim Fit Chino Trousers (Navy)', cat: 'Clothing & Apparel', brand: 'Northstar Apparel', unit: 'Pair', cost: 1300, price: 2250, min: 12, open: 35 },
    { sku: 'CL-003', barcode: '8901003003', name: 'Heavyweight Cotton Crewneck T-Shirt', cat: 'Clothing & Apparel', brand: 'Bengal Fabric', unit: 'Piece', cost: 420, price: 850, min: 30, open: 100 },
    { sku: 'CL-004', barcode: '8901003004', name: 'Merino Wool Knitted Winter Sweater', cat: 'Clothing & Apparel', brand: 'Apex Apparel', unit: 'Piece', cost: 1800, price: 3200, min: 8, open: 20 },
    { sku: 'CL-005', barcode: '8901003005', name: 'Activewear Dry-Fit Sports Polo', cat: 'Clothing & Apparel', brand: 'Apex Sport', unit: 'Piece', cost: 650, price: 1250, min: 20, open: 55 },

    // Food & Beverage
    { sku: 'FB-001', barcode: '8901004001', name: 'Arabica Dark Roast Coffee Beans 500g', cat: 'Food & Beverage', brand: 'Bengal Roasters', unit: 'Pack', cost: 850, price: 1350, min: 15, open: 40 },
    { sku: 'FB-002', barcode: '8901004002', name: 'Ceylon Premium Black Tea 400g Box', cat: 'Food & Beverage', brand: 'Greenleaf', unit: 'Box', cost: 380, price: 580, min: 20, open: 60 },
    { sku: 'FB-003', barcode: '8901004003', name: 'Organic Raw Honey 500g Glass Jar', cat: 'Food & Beverage', brand: 'Sundarbans Pure', unit: 'Piece', cost: 620, price: 950, min: 10, open: 30 },
    { sku: 'FB-004', barcode: '8901004004', name: 'Assorted Roasted Nuts & Berries 250g', cat: 'Food & Beverage', brand: 'NutriBite', unit: 'Pack', cost: 480, price: 780, min: 15, open: 45 },
    { sku: 'FB-005', barcode: '8901004005', name: 'Imported Dark Chocolate 70% 100g Bar', cat: 'Food & Beverage', brand: 'Lindt', unit: 'Piece', cost: 280, price: 450, min: 25, open: 70 },

    // Stationery & Office
    { sku: 'ST-001', barcode: '8901005001', name: 'A4 Premium Copier Paper (80gsm / 500 Sheets)', cat: 'Stationery & Office', brand: 'Double A', unit: 'Pack', cost: 480, price: 680, min: 30, open: 120 },
    { sku: 'ST-002', barcode: '8901005002', name: 'Executive Hardcover Journal Notebook', cat: 'Stationery & Office', brand: 'Moleskine', unit: 'Piece', cost: 850, price: 1450, min: 10, open: 28 },
    { sku: 'ST-003', barcode: '8901005003', name: 'Gel Ink Pen Box (0.5mm / 12 Pens)', cat: 'Stationery & Office', brand: 'Uni-ball', unit: 'Box', cost: 320, price: 520, min: 20, open: 65 },
    { sku: 'ST-004', barcode: '8901005004', name: 'Heavy Duty Office Stapler & Pins Set', cat: 'Stationery & Office', brand: 'Kangaro', unit: 'Piece', cost: 450, price: 720, min: 8, open: 24 },
    { sku: 'ST-005', barcode: '8901005005', name: 'Desktop Sticky Notes & Index Tabs Pack', cat: 'Stationery & Office', brand: 'Post-it', unit: 'Pack', cost: 180, price: 320, min: 25, open: 80 },

    // Home Appliances
    { sku: 'HA-001', barcode: '8901006001', name: 'Philips 1.8L Stainless Steel Electric Kettle', cat: 'Home Appliances', brand: 'Philips', unit: 'Piece', cost: 2400, price: 3450, min: 6, open: 16 },
    { sku: 'HA-002', barcode: '8901006002', name: 'Panasonic 750W 3-Jar Mixer Grinder', cat: 'Home Appliances', brand: 'Panasonic', unit: 'Piece', cost: 6800, price: 8900, min: 4, open: 10 },
    { sku: 'HA-003', barcode: '8901006003', name: 'Midea 20L Digital Microwave Oven', cat: 'Home Appliances', brand: 'Midea', unit: 'Piece', cost: 9200, price: 12500, min: 3, open: 8 },
    { sku: 'HA-004', barcode: '8901006004', name: 'Xiaomi Smart Air Purifier 4 Compact', cat: 'Home Appliances', brand: 'Xiaomi', unit: 'Piece', cost: 10500, price: 14200, min: 3, open: 9 },
    { sku: 'HA-005', barcode: '8901006005', name: 'Gree 16" Stand Fan with Remote', cat: 'Home Appliances', brand: 'Gree', unit: 'Piece', cost: 4200, price: 5800, min: 6, open: 15 },

    // Accessories
    { sku: 'AC-001', barcode: '8901007001', name: 'Waterproof Laptop Backpack 15.6"', cat: 'Accessories', brand: 'Tigernu', unit: 'Piece', cost: 1900, price: 3100, min: 8, open: 22 },
    { sku: 'AC-002', barcode: '8901007002', name: 'Genuine Leather RFID Men Bifold Wallet', cat: 'Accessories', brand: 'WildHorn', unit: 'Piece', cost: 850, price: 1550, min: 12, open: 30 },
    { sku: 'AC-003', barcode: '8901007003', name: 'Felt Desk Mat Mousepad 900x400mm', cat: 'Accessories', brand: 'MinimalDesk', unit: 'Piece', cost: 600, price: 1150, min: 15, open: 40 },
    { sku: 'AC-004', barcode: '8901007004', name: 'Aluminum Ergonomic Laptop Stand', cat: 'Accessories', brand: 'Nulaxy', unit: 'Piece', cost: 1200, price: 2100, min: 10, open: 25 },
    { sku: 'AC-005', barcode: '8901007005', name: 'Polarized UV400 Sunglasses', cat: 'Accessories', brand: 'Hawkers', unit: 'Piece', cost: 1100, price: 2250, min: 10, open: 26 },

    // Edge Stock Case Products
    { sku: 'LOW-01', barcode: '8901008001', name: 'Limited Edition Wireless Gaming Headset', cat: 'Electronics', brand: 'Razer', unit: 'Piece', cost: 12000, price: 16500, min: 10, open: 3 }, // Low stock
    { sku: 'OUT-01', barcode: '8901008002', name: 'High-Demand 4K 144Hz HDR Display Cable', cat: 'Electronics', brand: 'Belkin', unit: 'Piece', cost: 1100, price: 1950, min: 15, open: 0 }, // Out of stock
  ];

  const products: any[] = [];
  for (const pc of productConfigs) {
    const category = categories.find((c) => c.name === pc.cat) || categories[0];
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];

    const p = await prisma.product.create({
      data: {
        sku: pc.sku,
        barcode: pc.barcode,
        name: pc.name,
        categoryId: category.id,
        supplierId: supplier.id,
        brand: pc.brand,
        unit: pc.unit,
        purchasePrice: new Prisma.Decimal(pc.cost),
        sellingPrice: new Prisma.Decimal(pc.price),
        wholesalePrice: new Prisma.Decimal(pc.price * 0.88),
        stock: new Prisma.Decimal(pc.open),
        averageCost: new Prisma.Decimal(pc.cost),
        minimumStock: new Prisma.Decimal(pc.min),
        maximumStock: new Prisma.Decimal(pc.min * 10),
        status: RecordStatus.ACTIVE,
      },
    });

    if (pc.open > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: p.id,
          type: MovementType.OPENING_STOCK,
          quantity: new Prisma.Decimal(pc.open),
          unitCost: new Prisma.Decimal(pc.cost),
          reason: 'Initial opening warehouse allocation',
          referenceType: 'OPENING_STOCK',
          movementDate: new Date(Date.now() - 120 * 86400000),
        },
      });
    }

    products.push(p);
  }
  console.log(`✅ Seeded ${products.length} products with initial stock positions.`);

  // 7. Seed 55 Multi-Month Purchases (Inward stock receipts)
  console.log('📦 Seeding 55 purchase orders spread across previous 4 months...');
  const paymentMethods: PaymentMethod[] = [PaymentMethod.BANK, PaymentMethod.CASH, PaymentMethod.BKASH, PaymentMethod.NAGAD];

  for (let i = 1; i <= 55; i++) {
    const daysAgo = Math.floor(Math.random() * 110) + 1;
    const purchaseDate = new Date(Date.now() - daysAgo * 86400000);
    const supplier = suppliers[i % suppliers.length];

    const itemCount = Math.floor(Math.random() * 3) + 1;
    const chosenProducts: any[] = [];
    for (let j = 0; j < itemCount; j++) {
      const prod = products[(i * 3 + j) % products.length];
      if (!chosenProducts.find((x) => x.id === prod.id)) {
        chosenProducts.push(prod);
      }
    }

    let subtotal = new Prisma.Decimal(0);
    const itemsData = chosenProducts.map((p) => {
      const qty = new Prisma.Decimal(Math.floor(Math.random() * 15) + 5);
      const unitCost = p.purchasePrice;
      const total = unitCost.mul(qty);
      subtotal = subtotal.add(total);
      return {
        productId: p.id,
        quantity: qty,
        unitCost,
        discount: new Prisma.Decimal(0),
        tax: new Prisma.Decimal(0),
        subtotal: total,
        total,
      };
    });

    const discount = new Prisma.Decimal(i % 5 === 0 ? 500 : 0);
    const shipping = new Prisma.Decimal(i % 3 === 0 ? 350 : 0);
    const grandTotal = subtotal.sub(discount).add(shipping);

    // Some paid, some partial, some unpaid
    let paidAmount = grandTotal;
    let paymentStatus = PaymentStatus.PAID;
    if (i % 6 === 0) {
      paidAmount = grandTotal.mul(0.6).toDecimalPlaces(2);
      paymentStatus = PaymentStatus.PARTIAL;
    } else if (i % 8 === 0) {
      paidAmount = new Prisma.Decimal(0);
      paymentStatus = PaymentStatus.UNPAID;
    }

    const dueAmount = grandTotal.sub(paidAmount);
    const purchaseNumber = `PUR-${String(i).padStart(6, '0')}`;
    const method = paymentMethods[i % paymentMethods.length];

    const purchase = await prisma.purchase.create({
      data: {
        purchaseNumber,
        invoiceNumber: `SUP-INV-${1000 + i}`,
        supplierId: supplier.id,
        purchaseDate,
        status: DocumentStatus.CONFIRMED,
        paymentStatus,
        subtotal,
        discount,
        tax: new Prisma.Decimal(0),
        shipping,
        grandTotal,
        paidAmount,
        dueAmount,
        paymentMethod: method,
        items: {
          create: itemsData,
        },
      },
    });

    // Update product stocks & WAC
    for (const it of itemsData) {
      const prod = await prisma.product.findUnique({ where: { id: it.productId } });
      if (prod) {
        const curVal = prod.stock.mul(prod.averageCost);
        const addVal = it.quantity.mul(it.unitCost);
        const newQty = prod.stock.add(it.quantity);
        const newAvg = newQty.gt(0) ? curVal.add(addVal).div(newQty) : prod.averageCost;

        await prisma.product.update({
          where: { id: prod.id },
          data: { stock: newQty, averageCost: newAvg },
        });

        await prisma.stockMovement.create({
          data: {
            productId: prod.id,
            type: MovementType.PURCHASE,
            quantity: it.quantity,
            unitCost: it.unitCost,
            reason: `Purchase order ${purchaseNumber}`,
            referenceType: 'PURCHASE',
            referenceId: purchase.id,
            movementDate: purchaseDate,
          },
        });
      }
    }

    // Update supplier balance
    if (dueAmount.gt(0)) {
      await prisma.supplier.update({
        where: { id: supplier.id },
        data: { balance: { increment: dueAmount } },
      });
    }

    if (paidAmount.gt(0)) {
      await prisma.payment.create({
        data: {
          partyType: PartyType.SUPPLIER,
          partyId: supplier.id,
          supplierId: supplier.id,
          purchaseId: purchase.id,
          amount: paidAmount,
          date: purchaseDate,
          method,
          reference: purchaseNumber,
          note: `Procurement payment for ${purchaseNumber}`,
        },
      });
    }
  }

  // 8. Seed 130 Multi-Month Sales (Outward invoices)
  console.log('🛒 Seeding 130 confirmed sales transactions over 120 days...');
  for (let i = 1; i <= 130; i++) {
    const daysAgo = Math.floor(Math.random() * 115);
    const saleDate = new Date(Date.now() - daysAgo * 86400000);
    const customer = customers[i % customers.length];

    const itemCount = Math.floor(Math.random() * 3) + 1;
    const chosenProducts: any[] = [];
    for (let j = 0; j < itemCount; j++) {
      const prod = products[(i * 4 + j) % products.length];
      if (!chosenProducts.find((x) => x.id === prod.id)) {
        chosenProducts.push(prod);
      }
    }

    let subtotal = new Prisma.Decimal(0);
    let totalCogs = new Prisma.Decimal(0);

    const itemsData: any[] = [];
    for (const p of chosenProducts) {
      const prod = await prisma.product.findUnique({ where: { id: p.id } });
      if (!prod || prod.stock.lte(1)) continue;

      const maxSell = Math.min(prod.stock.toNumber() - 1, Math.floor(Math.random() * 6) + 1);
      if (maxSell <= 0) continue;

      const qty = new Prisma.Decimal(maxSell);
      const unitPrice = prod.sellingPrice;
      const unitCost = prod.averageCost;
      const total = unitPrice.mul(qty);

      subtotal = subtotal.add(total);
      totalCogs = totalCogs.add(unitCost.mul(qty));

      itemsData.push({
        productId: prod.id,
        quantity: qty,
        unitPrice,
        unitCost,
        discount: new Prisma.Decimal(0),
        tax: new Prisma.Decimal(0),
        subtotal: total,
        total,
      });
    }

    if (!itemsData.length) continue;

    const discount = new Prisma.Decimal(i % 4 === 0 ? 250 : 0);
    const shipping = new Prisma.Decimal(i % 5 === 0 ? 150 : 0);
    const grandTotal = subtotal.sub(discount).add(shipping);

    let paidAmount = grandTotal;
    let paymentStatus = PaymentStatus.PAID;
    if (i % 5 === 0) {
      paidAmount = grandTotal.mul(0.5).toDecimalPlaces(2);
      paymentStatus = PaymentStatus.PARTIAL;
    } else if (i % 7 === 0) {
      paidAmount = new Prisma.Decimal(0);
      paymentStatus = PaymentStatus.UNPAID;
    }

    const dueAmount = grandTotal.sub(paidAmount);
    const invoiceNumber = `SAL-${String(i).padStart(6, '0')}`;
    const method = paymentMethods[i % paymentMethods.length];

    const sale = await prisma.sale.create({
      data: {
        invoiceNumber,
        customerId: customer.id,
        saleDate,
        status: DocumentStatus.CONFIRMED,
        paymentStatus,
        subtotal,
        discount,
        tax: new Prisma.Decimal(0),
        shipping,
        grandTotal,
        paidAmount,
        dueAmount,
        cogs: totalCogs,
        paymentMethod: method,
        items: {
          create: itemsData,
        },
      },
    });

    // Deduct stock & create stock movements
    for (const it of itemsData) {
      const prod = await prisma.product.findUnique({ where: { id: it.productId } });
      if (prod) {
        const nextStock = prod.stock.sub(it.quantity);
        await prisma.product.update({
          where: { id: prod.id },
          data: { stock: nextStock },
        });

        await prisma.stockMovement.create({
          data: {
            productId: prod.id,
            type: MovementType.SALE,
            quantity: it.quantity.negated(),
            unitCost: it.unitCost,
            reason: `Customer invoice ${invoiceNumber}`,
            referenceType: 'SALE',
            referenceId: sale.id,
            movementDate: saleDate,
          },
        });
      }
    }

    // Update customer due balance
    if (dueAmount.gt(0)) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { balance: { increment: dueAmount } },
      });
    }

    if (paidAmount.gt(0)) {
      await prisma.payment.create({
        data: {
          partyType: PartyType.CUSTOMER,
          partyId: customer.id,
          customerId: customer.id,
          saleId: sale.id,
          amount: paidAmount,
          date: saleDate,
          method,
          reference: invoiceNumber,
          note: `Customer collection for ${invoiceNumber}`,
        },
      });
    }
  }

  // 9. Seed 60 Multi-Month Operational Expenses (Sections 26, 54)
  console.log('💳 Seeding multi-month operational expenses across 10 categories...');
  const expenseCategories = [
    { cat: 'Rent', amt: 45000, desc: 'Central office & warehouse lease' },
    { cat: 'Salary', amt: 120000, desc: 'Monthly operations & warehouse payroll' },
    { cat: 'Electricity', amt: 8500, desc: 'DESCO electricity monthly billing' },
    { cat: 'Internet', amt: 3500, desc: 'High-speed dedicated fiber connection' },
    { cat: 'Transportation', amt: 14000, desc: 'Inter-district logistics & cargo delivery' },
    { cat: 'Packaging', amt: 6500, desc: 'Carton boxes, tape, protective bubble wrap' },
    { cat: 'Marketing', amt: 18000, desc: 'Digital social media ad campaigns' },
    { cat: 'Maintenance', amt: 4500, desc: 'Facility repairs and equipment servicing' },
    { cat: 'Office', amt: 3200, desc: 'Pantry, water jars and office supplies' },
    { cat: 'Other', amt: 2500, desc: 'Miscellaneous logistics handling fees' },
  ];

  // Distribute over last 4 months (Month -3, -2, -1, current)
  for (let m = 3; m >= 0; m--) {
    for (const ec of expenseCategories) {
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() - m);
      expDate.setDate(Math.min(28, Math.floor(Math.random() * 25) + 2));

      await prisma.expense.create({
        data: {
          category: ec.cat,
          amount: new Prisma.Decimal(ec.amt * (0.9 + Math.random() * 0.2)).toDecimalPlaces(2),
          date: expDate,
          paymentMethod: PaymentMethod.BANK,
          description: `${ec.desc} (${expDate.toLocaleString('default', { month: 'short' })})`,
          note: 'Approved management expenditure',
        },
      });
    }
  }
  console.log('✅ Seeded 60+ categorized multi-month expenses.');

  console.log('✨ Seed complete! Dashboard, analytics, and reports are fully populated.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
