import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  const companyCode = 'GLOBAL-01';
  const email = 'admin@company.com';
  const password = 'Password123!';
  const hashedPassword = await bcrypt.hash(password, 12);

  console.log('🚀 Starting deep demo seed...');

  // 1. Create Company
  const company = await prisma.company.upsert({
    where: { code: companyCode },
    update: {},
    create: {
      name: 'Global ERP Solutions Ltd',
      code: companyCode,
      currency: 'USD',
      timezone: 'UTC',
      address: '123 Enterprise Way, Silicon Valley, CA',
      phone: '+1-555-0100',
      email: 'info@global-erp.com',
    },
  });

  // 2. Create Users (Admin & Manager)
  const admin = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email } },
    update: {},
    create: {
      email,
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      companyId: company.id,
    },
  });

  // 2. Create Users for all roles
  const roles = ['ADMIN', 'CFO', 'SALES_MANAGER', 'WAREHOUSE_HEAD', 'MANAGER', 'USER'];
  const userRecords: any[] = [];

  for (const role of roles) {
    const userEmail = `${role.toLowerCase()}@company.com`;
    const record = await prisma.user.upsert({
      where: { companyId_email: { companyId: company.id, email: userEmail } },
      update: {},
      create: {
        email: userEmail,
        password: hashedPassword,
        firstName: role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
        lastName: 'User',
        role: role as any,
        companyId: company.id,
      },
    });
    userRecords.push(record);
  }

  // 3. Posting Periods
  const now = new Date();
  const periods = [
    { name: 'February 2026', startDate: new Date(2026, 1, 1), endDate: new Date(2026, 1, 28), isClosed: true },
    { name: 'March 2026', startDate: new Date(2026, 2, 1), endDate: new Date(2026, 2, 31), isClosed: false },
    { name: 'April 2026', startDate: new Date(2026, 3, 1), endDate: new Date(2026, 3, 30), isClosed: false },
  ];

  for (const p of periods) {
    await prisma.postingPeriod.upsert({
      where: { companyId_name: { companyId: company.id, name: p.name } },
      update: {},
      create: { ...p, companyId: company.id },
    });
  }

  // 4. Chart of Accounts (Expanded)
  const accounts = [
    { code: '1000', name: 'Main Bank Account', type: 'ASSET' as const },
    { code: '1010', name: 'Petty Cash', type: 'ASSET' as const },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET' as const },
    { code: '1200', name: 'Inventory Asset', type: 'ASSET' as const },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' as const },
    { code: '2100', name: 'Sales Tax Payable', type: 'LIABILITY' as const },
    { code: '3000', name: 'Retained Earnings', type: 'EQUITY' as const },
    { code: '4000', name: 'Product Sales', type: 'REVENUE' as const },
    { code: '4100', name: 'Service Revenue', type: 'REVENUE' as const },
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' as const },
    { code: '6000', name: 'Salaries & Wages', type: 'EXPENSE' as const },
    { code: '6100', name: 'Office Rent', type: 'EXPENSE' as const },
    { code: '6200', name: 'Utilities', type: 'EXPENSE' as const },
  ];

  const accountMap = new Map();
  for (const acc of accounts) {
    const record = await prisma.account.upsert({
      where: { companyId_code: { companyId: company.id, code: acc.code } },
      update: {},
      create: { ...acc, companyId: company.id },
    });
    accountMap.set(acc.code, record);
  }

  // 5. Warehouses & Bins
  const warehouses = [
    { code: 'WH-MAIN', name: 'Central Logistics Hub', address: 'Industrial Zone A' },
    { code: 'WH-RETAIL', name: 'Downtown Retail Store', address: 'Main St 45' },
    { code: 'WH-NORTH', name: 'Northern Distribution', address: 'North Port Rd' },
  ];

  const whRecords: any[] = [];
  for (const wh of warehouses) {
    const record = await prisma.warehouse.upsert({
      where: { companyId_code: { companyId: company.id, code: wh.code } },
      update: {},
      create: { ...wh, companyId: company.id },
    });
    whRecords.push(record);
  }

  // 6. Inventory Items (Expanded to 10)
  const items = [
    { sku: 'LAP-X15', name: 'Enterprise Laptop X15', category: 'Electronics', costPrice: 850, salePrice: 1200, minStockLevel: 5 },
    { sku: 'MOU-W2', name: 'Wireless Ergonomic Mouse', category: 'Accessories', costPrice: 15, salePrice: 45, minStockLevel: 20 },
    { sku: 'MON-4K', name: '4K Ultra-Wide Monitor', category: 'Electronics', costPrice: 300, salePrice: 550, minStockLevel: 10 },
    { sku: 'KEY-MECH', name: 'Mechanical Keyboard RGB', category: 'Accessories', costPrice: 40, salePrice: 89, minStockLevel: 15 },
    { sku: 'CAB-USB', name: 'USB-C Charging Cable 2m', category: 'Accessories', costPrice: 2, salePrice: 12, minStockLevel: 50 },
    { sku: 'TAB-S10', name: 'Pro Tablet 10-inch', category: 'Electronics', costPrice: 400, salePrice: 750, minStockLevel: 8 },
    { sku: 'PRN-LSR', name: 'Laser Jet Printer', category: 'Office', costPrice: 120, salePrice: 299, minStockLevel: 3 },
    { sku: 'HD-2TB', name: 'External Hard Drive 2TB', category: 'Storage', costPrice: 45, salePrice: 95, minStockLevel: 12 },
    { sku: 'CHR-OFF', name: 'Ergonomic Office Chair', category: 'Furniture', costPrice: 180, salePrice: 350, minStockLevel: 5 },
    { sku: 'DSK-STD', name: 'Standing Desk Pro', category: 'Furniture', costPrice: 250, salePrice: 599, minStockLevel: 4 },
  ];

  const itemRecords: any[] = [];
  for (const item of items) {
    const record = await prisma.item.upsert({
      where: { companyId_sku: { companyId: company.id, sku: item.sku } },
      update: {},
      create: { ...item, companyId: company.id },
    });
    itemRecords.push(record);

    // Initial Stock levels across warehouses
    for (const wh of whRecords) {
      await prisma.stockLevel.upsert({
        where: { itemId_warehouseId: { itemId: record.id, warehouseId: wh.id } },
        update: { quantity: 50 },
        create: { itemId: record.id, warehouseId: wh.id, quantity: 50 },
      });
      
      // Create initial "IN" movements for FIFO layers
      await prisma.stockMovement.create({
        data: {
          companyId: company.id,
          itemId: record.id,
          toWarehouseId: wh.id,
          quantity: 50,
          unitCost: item.costPrice,
          movementType: 'IN',
          referenceType: 'INITIAL_SEED',
          notes: 'Initial seed inventory layer',
        }
      });
    }
  }

  // 7. Customers (Expanded)
  const customers = [
    { code: 'C-001', name: 'Tech Solutions Inc', email: 'procurement@techsol.com', creditLimit: 50000 },
    { code: 'C-002', name: 'Future Retail Group', email: 'sales@futureretail.net', creditLimit: 100000 },
    { code: 'C-003', name: 'Global Logistics Corp', email: 'ops@globallog.com', creditLimit: 25000 },
    { code: 'C-004', name: 'Innovation Hub', email: 'hello@inno-hub.io', creditLimit: 15000 },
    { code: 'C-005', name: 'Alpha Systems', email: 'admin@alphasys.com', creditLimit: 30000 },
  ];

  const customerRecords: any[] = [];
  for (const c of customers) {
    const record = await prisma.customer.upsert({
      where: { companyId_code: { companyId: company.id, code: c.code } },
      update: {},
      create: { ...c, companyId: company.id },
    });
    customerRecords.push(record);
  }

  // 8. Vendors (Expanded)
  const vendors = [
    { code: 'V-001', name: 'Prime Hardware Ltd', email: 'orders@primehw.com' },
    { code: 'V-002', name: 'Global Logistics Partners', email: 'billing@glp.com' },
    { sku: 'V-003', name: 'Electronic Components Inc', email: 'sales@elec-comp.com' },
    { sku: 'V-004', name: 'Office Supply Depot', email: 'bulk@officesupply.com' },
    { sku: 'V-005', name: 'Furniture Manufacturing Co', email: 'factory@furnitureco.com' },
  ];

  const vendorRecords: any[] = [];
  for (const v of vendors) {
    const record = await prisma.vendor.upsert({
      where: { companyId_code: { companyId: company.id, code: (v as any).code || (v as any).sku } },
      update: {},
      create: { 
        code: (v as any).code || (v as any).sku,
        name: v.name,
        email: v.email,
        companyId: company.id 
      },
    });
    vendorRecords.push(record);
  }

  // 9. Sales Orders (Multiple statuses)
  for (let i = 0; i < 8; i++) {
    const customer = customerRecords[i % customerRecords.length];
    const item = itemRecords[i % itemRecords.length];
    const statuses: any[] = ['DRAFT', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
    
    await prisma.salesOrder.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        orderNumber: `SO-2026-${String(i + 1).padStart(5, '0')}`,
        status: statuses[i % 4],
        totalAmount: Number(item.salePrice) * 2,
        lines: {
          create: [{
            itemId: item.id,
            quantity: 2,
            unitPrice: item.salePrice,
            lineTotal: Number(item.salePrice) * 2
          }]
        }
      }
    });
  }

  // 10. Purchase Orders
  for (let i = 0; i < 5; i++) {
    const vendor = vendorRecords[i % vendorRecords.length];
    const item = itemRecords[i % itemRecords.length];
    
    await prisma.purchaseOrder.create({
      data: {
        companyId: company.id,
        vendorId: vendor.id,
        orderNumber: `PO-2026-${String(i + 1).padStart(5, '0')}`,
        status: i % 2 === 0 ? 'RECEIVED' : 'CONFIRMED',
        totalAmount: Number(item.costPrice) * 10,
        lines: {
          create: [{
            itemId: item.id,
            quantity: 10,
            unitCost: item.costPrice,
            lineTotal: Number(item.costPrice) * 10
          }]
        }
      }
    });
  }

  // 11. Finance Transactions
  const period = await prisma.postingPeriod.findFirst({ where: { companyId: company.id, isClosed: false } });
  if (period) {
    await prisma.transaction.create({
      data: {
        companyId: company.id,
        postingPeriodId: period.id,
        description: 'Office Rent - March',
        totalAmount: 2500,
        status: 'POSTED',
        lines: {
          create: [
            { debitAccountId: accountMap.get('6100').id, amount: 2500 },
            { creditAccountId: accountMap.get('1000').id, amount: 2500 },
          ]
        }
      }
    });

    await prisma.transaction.create({
      data: {
        companyId: company.id,
        postingPeriodId: period.id,
        description: 'Initial Capital Investment',
        totalAmount: 50000,
        status: 'POSTED',
        lines: {
          create: [
            { debitAccountId: accountMap.get('1000').id, amount: 50000 },
            { creditAccountId: accountMap.get('3000').id, amount: 50000 },
          ]
        }
      }
    });
  }

  // 8. Employees
  const employees = [
    { employeeId: 'EMP-001', firstName: 'John', lastName: 'Doe', department: 'Sales', position: 'Senior Account Manager', hireDate: new Date('2023-01-15') },
    { employeeId: 'EMP-002', firstName: 'Jane', lastName: 'Smith', department: 'IT', position: 'Systems Architect', hireDate: new Date('2023-06-01') },
    { employeeId: 'EMP-003', firstName: 'Michael', lastName: 'Brown', department: 'Finance', position: 'Lead Accountant', hireDate: new Date('2024-02-10') },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { companyId_employeeId: { companyId: company.id, employeeId: emp.employeeId } },
      update: {},
      create: { ...emp, companyId: company.id },
    });
  }

  console.log('✅ Deep demo seed completed successfully!');
  console.log('-----------------------------------');
  console.log('Company Code:', companyCode);
  console.log('Admin Email :', email);
  console.log('Password    :', password);
  console.log('-----------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
