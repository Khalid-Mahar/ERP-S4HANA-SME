import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Company ────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { code: 'DEMO' },
    update: {},
    create: {
      name: 'Demo Company Ltd',
      code: 'DEMO',
      email: 'info@demo.com',
      phone: '+1-555-0100',
      address: '123 Business Ave, New York, NY 10001',
      currency: 'USD',
    },
  });
  console.log(`✅ Company: ${company.name}`);

  // ── Admin User ─────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Admin@1234', 12);
  const admin = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      companyId: company.id,
      email: 'admin@demo.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'manager@demo.com' } },
    update: {},
    create: {
      companyId: company.id,
      email: 'manager@demo.com',
      password: await bcrypt.hash('Manager@1234', 12),
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'MANAGER',
    },
  });
  console.log(`✅ Users: ${admin.email}, ${manager.email}`);

  // ── Chart of Accounts ──────────────────────────────────────────
  const accountsData = [
    { code: '1000', name: 'Cash and Cash Equivalents', type: 'ASSET' as const },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET' as const },
    { code: '1200', name: 'Inventory', type: 'ASSET' as const },
    { code: '1300', name: 'Prepaid Expenses', type: 'ASSET' as const },
    { code: '1500', name: 'Fixed Assets', type: 'ASSET' as const },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' as const },
    { code: '2100', name: 'Accrued Liabilities', type: 'LIABILITY' as const },
    { code: '2500', name: 'Long-term Debt', type: 'LIABILITY' as const },
    { code: '3000', name: 'Owner Equity', type: 'EQUITY' as const },
    { code: '3100', name: 'Retained Earnings', type: 'EQUITY' as const },
    { code: '4000', name: 'Sales Revenue', type: 'REVENUE' as const },
    { code: '4100', name: 'Service Revenue', type: 'REVENUE' as const },
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' as const },
    { code: '6000', name: 'Salaries & Wages', type: 'EXPENSE' as const },
    { code: '6100', name: 'Rent Expense', type: 'EXPENSE' as const },
    { code: '6200', name: 'Utilities', type: 'EXPENSE' as const },
    { code: '6300', name: 'Marketing & Advertising', type: 'EXPENSE' as const },
    { code: '6400', name: 'Office Supplies', type: 'EXPENSE' as const },
  ];

  for (const acc of accountsData) {
    await prisma.account.upsert({
      where: { companyId_code: { companyId: company.id, code: acc.code } },
      update: {},
      create: { ...acc, companyId: company.id },
    });
  }
  console.log(`✅ Chart of Accounts: ${accountsData.length} accounts`);

  // ── Warehouses ─────────────────────────────────────────────────
  const mainWH = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: 'WH-MAIN' } },
    update: {},
    create: {
      companyId: company.id,
      code: 'WH-MAIN',
      name: 'Main Warehouse',
      address: '456 Storage Blvd, Brooklyn, NY 11201',
    },
  });

  const secWH = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: 'WH-EAST' } },
    update: {},
    create: {
      companyId: company.id,
      code: 'WH-EAST',
      name: 'East Distribution Center',
      address: '789 Logistics Way, Queens, NY 11354',
    },
  });

  // Bin locations
  const bins = ['A-01', 'A-02', 'A-03', 'B-01', 'B-02', 'C-01'];
  for (const bin of bins) {
    await prisma.binLocation.upsert({
      where: { warehouseId_code: { warehouseId: mainWH.id, code: bin } },
      update: {},
      create: { warehouseId: mainWH.id, code: bin, name: `Bin ${bin}` },
    });
  }
  console.log(`✅ Warehouses: Main + East, ${bins.length} bins`);

  // ── Inventory Items ────────────────────────────────────────────
  const itemsData = [
    { code: 'LAPTOP-001', name: 'Dell XPS 15 Laptop', category: 'Electronics', uom: 'PCS', costPrice: 850, salePrice: 1299, minStockLevel: 5 },
    { code: 'LAPTOP-002', name: 'MacBook Pro 14"', category: 'Electronics', uom: 'PCS', costPrice: 1600, salePrice: 2199, minStockLevel: 3 },
    { code: 'MONITOR-001', name: '27" 4K Monitor', category: 'Electronics', uom: 'PCS', costPrice: 320, salePrice: 499, minStockLevel: 8 },
    { code: 'CHAIR-001', name: 'Ergonomic Office Chair', category: 'Furniture', uom: 'PCS', costPrice: 180, salePrice: 329, minStockLevel: 10 },
    { code: 'DESK-001', name: 'Standing Desk 60"', category: 'Furniture', uom: 'PCS', costPrice: 420, salePrice: 699, minStockLevel: 5 },
    { code: 'PAPER-A4', name: 'A4 Paper (500 sheets)', category: 'Office Supplies', uom: 'REAM', costPrice: 4.5, salePrice: 8.99, minStockLevel: 50 },
    { code: 'PEN-BLK', name: 'Black Ballpoint Pens (Box)', category: 'Office Supplies', uom: 'BOX', costPrice: 3, salePrice: 6.99, minStockLevel: 20 },
    { code: 'MOUSE-001', name: 'Wireless Mouse', category: 'Accessories', uom: 'PCS', costPrice: 25, salePrice: 49, minStockLevel: 15 },
    { code: 'KB-001', name: 'Mechanical Keyboard', category: 'Accessories', uom: 'PCS', costPrice: 65, salePrice: 119, minStockLevel: 10 },
    { code: 'HDMI-CBL', name: 'HDMI Cable 2m', category: 'Accessories', uom: 'PCS', costPrice: 5, salePrice: 14.99, minStockLevel: 30 },
  ];

  const items: any[] = [];
  for (const item of itemsData) {
    const created = await prisma.item.upsert({
      where: { companyId_code: { companyId: company.id, code: item.code } },
      update: {},
      create: { ...item, companyId: company.id },
    });
    items.push(created);

    // Set initial stock levels
    const qty = Math.floor(Math.random() * 80) + 20;
    await prisma.stockLevel.upsert({
      where: { itemId_warehouseId_binLocationId: { itemId: created.id, warehouseId: mainWH.id, binLocationId: null } },
      update: {},
      create: { itemId: created.id, warehouseId: mainWH.id, quantity: qty },
    });

    // Record initial stock movement
    await prisma.stockMovement.create({
      data: {
        itemId: created.id,
        toWarehouseId: mainWH.id,
        quantity: qty,
        movementType: 'IN',
        referenceType: 'ADJUSTMENT',
        notes: 'Opening stock balance',
      },
    });
  }
  console.log(`✅ Items: ${items.length} products with initial stock`);

  // ── Customers ──────────────────────────────────────────────────
  const customersData = [
    { code: 'CUST-001', name: 'TechCorp Solutions', email: 'procurement@techcorp.com', phone: '+1-555-0201', creditLimit: 50000 },
    { code: 'CUST-002', name: 'Global Offices Inc', email: 'orders@globaloffices.com', phone: '+1-555-0202', creditLimit: 30000 },
    { code: 'CUST-003', name: 'Startup Hub LLC', email: 'admin@startuphub.com', phone: '+1-555-0203', creditLimit: 15000 },
    { code: 'CUST-004', name: 'Enterprise Systems Corp', email: 'purchasing@enterprise.com', phone: '+1-555-0204', creditLimit: 100000 },
    { code: 'CUST-005', name: 'Creative Agency NY', email: 'ops@creativeagency.com', phone: '+1-555-0205', creditLimit: 20000 },
  ];

  const customers: any[] = [];
  for (const cust of customersData) {
    const c = await prisma.customer.upsert({
      where: { companyId_code: { companyId: company.id, code: cust.code } },
      update: {},
      create: { ...cust, companyId: company.id },
    });
    customers.push(c);
  }
  console.log(`✅ Customers: ${customers.length}`);

  // ── Vendors ────────────────────────────────────────────────────
  const vendorsData = [
    { code: 'VEND-001', name: 'Dell Technologies', email: 'sales@dell.com', paymentTerms: 30 },
    { code: 'VEND-002', name: 'Apple Inc', email: 'business@apple.com', paymentTerms: 15 },
    { code: 'VEND-003', name: 'Office Depot', email: 'b2b@officedepot.com', paymentTerms: 45 },
    { code: 'VEND-004', name: 'Herman Miller', email: 'commercial@hermanmiller.com', paymentTerms: 30 },
  ];

  const vendors: any[] = [];
  for (const vend of vendorsData) {
    const v = await prisma.vendor.upsert({
      where: { companyId_code: { companyId: company.id, code: vend.code } },
      update: {},
      create: { ...vend, companyId: company.id },
    });
    vendors.push(v);
  }
  console.log(`✅ Vendors: ${vendors.length}`);

  // ── Employees ──────────────────────────────────────────────────
  const employeesData = [
    { employeeId: 'EMP-001', firstName: 'Alice', lastName: 'Johnson', email: 'alice@demo.com', department: 'Engineering', position: 'Lead Developer', salary: 95000 },
    { employeeId: 'EMP-002', firstName: 'Bob', lastName: 'Martinez', email: 'bob@demo.com', department: 'Sales', position: 'Sales Manager', salary: 75000 },
    { employeeId: 'EMP-003', firstName: 'Carol', lastName: 'Davis', email: 'carol@demo.com', department: 'Finance', position: 'Accountant', salary: 65000 },
    { employeeId: 'EMP-004', firstName: 'David', lastName: 'Wilson', email: 'david@demo.com', department: 'HR', position: 'HR Specialist', salary: 58000 },
    { employeeId: 'EMP-005', firstName: 'Emma', lastName: 'Brown', email: 'emma@demo.com', department: 'Operations', position: 'Warehouse Manager', salary: 60000 },
  ];

  for (const emp of employeesData) {
    await prisma.employee.upsert({
      where: { companyId_employeeId: { companyId: company.id, employeeId: emp.employeeId } },
      update: {},
      create: { ...emp, companyId: company.id, hireDate: new Date('2022-01-15') },
    });
  }
  console.log(`✅ Employees: ${employeesData.length}`);

  // ── CRM Leads ──────────────────────────────────────────────────
  const leadsData = [
    { name: 'James Wilson', email: 'james@prospectco.com', company: 'ProspectCo', status: 'NEW' as const, value: 15000, source: 'Website' },
    { name: 'Sarah Chen', email: 'sarah@techstart.io', company: 'TechStart', status: 'QUALIFIED' as const, value: 45000, source: 'Referral' },
    { name: 'Michael Ross', email: 'm.ross@bigfirm.com', company: 'BigFirm Inc', status: 'PROPOSAL' as const, value: 120000, source: 'Cold Call' },
    { name: 'Lisa Park', email: 'lisa@innovate.co', company: 'Innovate Co', status: 'CONTACTED' as const, value: 8000, source: 'LinkedIn' },
    { name: 'Tom Bradley', email: 'tom@megacorp.com', company: 'MegaCorp', status: 'NEGOTIATION' as const, value: 250000, source: 'Trade Show' },
  ];

  for (const lead of leadsData) {
    await prisma.lead.create({
      data: { ...lead, companyId: company.id },
    });
  }
  console.log(`✅ Leads: ${leadsData.length}`);

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('─────────────────────────────────────');
  console.log('  Login Credentials:');
  console.log('  Company Code : DEMO');
  console.log('  Admin        : admin@demo.com / Admin@1234');
  console.log('  Manager      : manager@demo.com / Manager@1234');
  console.log('─────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
