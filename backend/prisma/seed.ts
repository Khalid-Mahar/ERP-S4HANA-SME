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

  await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'manager@company.com' } },
    update: {},
    create: {
      email: 'manager@company.com',
      password: hashedPassword,
      firstName: 'Business',
      lastName: 'Manager',
      role: 'MANAGER',
      companyId: company.id,
    },
  });

  // 3. Chart of Accounts
  const accounts = [
    { code: '1000', name: 'Main Bank Account', type: 'ASSET' as const },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET' as const },
    { code: '1200', name: 'Inventory Asset', type: 'ASSET' as const },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' as const },
    { code: '3000', name: 'Retained Earnings', type: 'EQUITY' as const },
    { code: '4000', name: 'Product Sales', type: 'REVENUE' as const },
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' as const },
    { code: '6000', name: 'Salaries & Wages', type: 'EXPENSE' as const },
  ];

  for (const acc of accounts) {
    await prisma.account.upsert({
      where: { companyId_code: { companyId: company.id, code: acc.code } },
      update: {},
      create: { ...acc, companyId: company.id },
    });
  }

  // 4. Warehouses & Bins
  const whMain = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: 'WH-MAIN' } },
    update: {},
    create: {
      code: 'WH-MAIN',
      name: 'Central Logistics Hub',
      address: 'Industrial Zone A, Building 4',
      companyId: company.id,
    },
  });

  const whRetail = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: 'WH-RETAIL' } },
    update: {},
    create: {
      code: 'WH-RETAIL',
      name: 'Downtown Retail Store',
      address: 'Main St 45, Shopping District',
      companyId: company.id,
    },
  });

  // 5. Inventory Items
  const items = [
    { sku: 'LAP-X15', name: 'Enterprise Laptop X15', category: 'Electronics', costPrice: 850, salePrice: 1200, minStockLevel: 5 },
    { sku: 'MOU-W2', name: 'Wireless Ergonomic Mouse', category: 'Accessories', costPrice: 15, salePrice: 45, minStockLevel: 20 },
    { sku: 'MON-4K', name: '4K Ultra-Wide Monitor', category: 'Electronics', costPrice: 300, salePrice: 550, minStockLevel: 10 },
    { sku: 'KEY-MECH', name: 'Mechanical Keyboard RGB', category: 'Accessories', costPrice: 40, salePrice: 89, minStockLevel: 15 },
    { sku: 'CAB-USB', name: 'USB-C Charging Cable 2m', category: 'Accessories', costPrice: 2, salePrice: 12, minStockLevel: 50 },
  ];

  const itemRecords: any[] = [];
  for (const item of items) {
    const record = await prisma.item.upsert({
      where: { companyId_sku: { companyId: company.id, sku: item.sku } },
      update: {},
      create: { ...item, companyId: company.id },
    });
    itemRecords.push(record);

    // Initial Stock levels
    await prisma.stockLevel.upsert({
      where: { itemId_warehouseId: { itemId: record.id, warehouseId: whMain.id } },
      update: { quantity: 100 },
      create: { itemId: record.id, warehouseId: whMain.id, quantity: 100 },
    });
  }

  // 6. Customers & CRM Leads
  const customers = [
    { code: 'C-001', name: 'Tech Solutions Inc', email: 'procurement@techsol.com', creditLimit: 10000 },
    { code: 'C-002', name: 'Future Retail Group', email: 'sales@futureretail.net', creditLimit: 25000 },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { companyId_code: { companyId: company.id, code: c.code } },
      update: {},
      create: { ...c, companyId: company.id },
    });
  }

  const leads = [
    { name: 'Alice Johnson', company: 'Innovation Hub', status: 'QUALIFIED' as const, value: 5000, source: 'Website' },
    { name: 'Bob Smith', company: 'Digital Nomad Co', status: 'PROPOSAL' as const, value: 12000, source: 'Referral' },
  ];

  for (const l of leads) {
    await prisma.lead.create({
      data: { ...l, companyId: company.id },
    });
  }

  // 7. Vendors
  const vendors = [
    { code: 'V-001', name: 'Prime Hardware Ltd', email: 'orders@primehw.com' },
    { code: 'V-002', name: 'Global Logistics Partners', email: 'billing@glp.com' },
  ];

  for (const v of vendors) {
    await prisma.vendor.upsert({
      where: { companyId_code: { companyId: company.id, code: v.code } },
      update: {},
      create: { ...v, companyId: company.id },
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
