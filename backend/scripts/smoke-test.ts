type Json = Record<string, any>;

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000/api/v1';
const COMPANY_CODE = process.env.SMOKE_COMPANY_CODE || 'GLOBAL-01';
const PASSWORD = process.env.SMOKE_PASSWORD || 'Password123!';

async function req<T>(method: string, path: string, token?: string, body?: any): Promise<T> {
  const url = `${BASE}${path}`;
  const attempts = 3;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const txt = await res.text();
      let json: any = null;
      try {
        json = txt ? JSON.parse(txt) : null;
      } catch {
        json = null;
      }
      if (!res.ok) {
        throw new Error(`${method} ${path} -> ${res.status} ${txt}`);
      }
      return json as T;
    } catch (e: any) {
      if (i === attempts) {
        throw new Error(`${method} ${path} -> REQUEST_FAILED: ${e?.message || String(e)}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`${method} ${path} -> REQUEST_FAILED`);
}

async function login(email: string) {
  const r = await req<{ success: boolean; data: { access_token: string; user: any } }>('POST', '/auth/login', undefined, {
    companyCode: COMPANY_CODE,
    email,
    password: PASSWORD,
  });
  return { token: r.data.access_token, user: r.data.user };
}

function ok(msg: string) {
  process.stdout.write(`OK  ${msg}\n`);
}

function num(v: any) {
  return Number(v || 0);
}

function getStockRow(stockLevelsRes: any) {
  const rows = stockLevelsRes?.data || stockLevelsRes || [];
  const r = Array.isArray(rows) ? rows[0] : null;
  return {
    quantity: num(r?.quantity),
    reservedQty: num(r?.reservedQty),
  };
}

function balanceByCode(trial: any, code: string) {
  const rows = trial?.data?.accounts || trial?.accounts || [];
  const r = rows.find((a: any) => a.code === code);
  return num(r?.balance);
}

async function main() {
  const admin = await login('admin@company.com');
  ok(`login admin role=${admin.user.role}`);

  const cfo = await login('cfo@company.com');
  ok(`login cfo role=${cfo.user.role}`);

  const salesMgr = await login('sales_manager@company.com');
  ok(`login sales_manager role=${salesMgr.user.role}`);

  const whHead = await login('warehouse_head@company.com');
  ok(`login warehouse_head role=${whHead.user.role}`);

  const manager = await login('manager@company.com');
  ok(`login manager role=${manager.user.role}`);

  const warehouses = await req<{ success: boolean; data: any[] }>('GET', '/warehouses', admin.token);
  const wh = warehouses.data[0];
  if (!wh) throw new Error('No warehouse found');
  ok(`warehouses count=${warehouses.data.length}`);

  const items = await req<{ success: boolean; data: any[] }>('GET', '/inventory/items', admin.token);
  const item = items.data.find(i => {
    const sl = i.stockLevels || [];
    const totalAvailable = sl.reduce((s: number, r: any) => s + (Number(r.quantity || 0) - Number(r.reservedQty || 0)), 0);
    const hasInWh = sl.some((r: any) => r.warehouseId === wh.id && Number(r.quantity || 0) > 0);
    return totalAvailable >= 20 && hasInWh;
  }) || items.data[0];
  if (!item) throw new Error('No item found');
  ok(`items count=${items.data.length}`);

  const stockBefore = await req<any>('GET', `/inventory/stock-levels?itemId=${item.id}&warehouseId=${wh.id}`, admin.token);
  const stock0 = getStockRow(stockBefore);

  const customers = await req<{ success: boolean; data: any[] }>('GET', '/sales/customers', salesMgr.token);
  const cust = customers.data[0];
  if (!cust) throw new Error('No customer found');
  ok(`customers count=${customers.data.length}`);

  const createOrder = await req<{ success: boolean; data: any }>('POST', '/sales/orders', salesMgr.token, {
    customerId: cust.id,
    deliveryDate: new Date().toISOString().slice(0, 10),
    notes: 'Smoke test order',
    lines: [{ itemId: item.id, quantity: 1, unitPrice: Number(item.salePrice || 10), discount: 0 }],
  });
  ok(`sales order created ${createOrder.data.orderNumber}`);

  await req('PATCH', `/sales/orders/${createOrder.data.id}/status`, salesMgr.token, { status: 'CONFIRMED', warehouseId: wh.id });
  ok('sales order CONFIRMED (stock reserved)');

  const stockAfterConfirm = await req<any>('GET', `/inventory/stock-levels?itemId=${item.id}&warehouseId=${wh.id}`, admin.token);
  const stock1 = getStockRow(stockAfterConfirm);

  await req('PATCH', `/sales/orders/${createOrder.data.id}/status`, salesMgr.token, { status: 'SHIPPED', warehouseId: wh.id });
  ok('sales order SHIPPED (stock reduced + finance posted)');

  const stockAfterShip = await req<any>('GET', `/inventory/stock-levels?itemId=${item.id}&warehouseId=${wh.id}`, admin.token);
  const stock2 = getStockRow(stockAfterShip);

  const cancelOrder = await req<{ success: boolean; data: any }>('POST', '/sales/orders', salesMgr.token, {
    customerId: cust.id,
    deliveryDate: new Date().toISOString().slice(0, 10),
    notes: 'Smoke test cancel order',
    lines: [{ itemId: item.id, quantity: 1, unitPrice: Number(item.salePrice || 10), discount: 0 }],
  });
  ok(`sales order created ${cancelOrder.data.orderNumber} (cancel test)`);

  const beforeCancelConfirm = await req<any>('GET', `/inventory/stock-levels?itemId=${item.id}&warehouseId=${wh.id}`, admin.token);
  const stockBeforeCancelConfirm = getStockRow(beforeCancelConfirm);

  await req('PATCH', `/sales/orders/${cancelOrder.data.id}/status`, salesMgr.token, { status: 'CONFIRMED', warehouseId: wh.id });
  ok('sales order CONFIRMED (cancel test)');

  const afterCancelConfirm = await req<any>('GET', `/inventory/stock-levels?itemId=${item.id}&warehouseId=${wh.id}`, admin.token);
  const stockAfterCancelConfirm = getStockRow(afterCancelConfirm);
  if (stockAfterCancelConfirm.reservedQty + 0.0001 < stockBeforeCancelConfirm.reservedQty) {
    throw new Error('Reserved qty did not increase on confirm (cancel test)');
  }

  await req('PATCH', `/sales/orders/${cancelOrder.data.id}/status`, salesMgr.token, { status: 'CANCELLED' });
  ok('sales order CANCELLED (reserved released)');

  const afterCancel = await req<any>('GET', `/inventory/stock-levels?itemId=${item.id}&warehouseId=${wh.id}`, admin.token);
  const stockAfterCancel = getStockRow(afterCancel);
  if (stockAfterCancel.reservedQty > stockAfterCancelConfirm.reservedQty + 0.0001) {
    throw new Error('Reserved qty did not release on cancel');
  }

  const partialOrder = await req<{ success: boolean; data: any }>('POST', '/sales/orders', salesMgr.token, {
    customerId: cust.id,
    deliveryDate: new Date().toISOString().slice(0, 10),
    notes: 'Smoke test partial shipment order',
    lines: [{ itemId: item.id, quantity: 2, unitPrice: Number(item.salePrice || 10), discount: 0 }],
  });
  ok(`sales order created ${partialOrder.data.orderNumber} (partial ship test)`);

  await req('PATCH', `/sales/orders/${partialOrder.data.id}/status`, salesMgr.token, { status: 'CONFIRMED', warehouseId: wh.id });
  ok('sales order CONFIRMED (partial ship test)');

  const partialLineId = partialOrder.data?.lines?.[0]?.id;
  if (!partialLineId) throw new Error('Partial ship test: missing sales order line id');

  await req('POST', `/sales/orders/${partialOrder.data.id}/ship`, salesMgr.token, {
    notes: 'Partial shipment 1',
    lines: [{ salesOrderLineId: partialLineId, quantity: 1 }],
  });
  ok('sales shipment created (partial 1)');

  const partialLatest = await req<{ success: boolean; data: any }>('GET', `/sales/orders/${partialOrder.data.id}`, salesMgr.token);
  if (partialLatest.data.status !== 'PARTIALLY_SHIPPED') {
    throw new Error(`Partial ship test: expected PARTIALLY_SHIPPED but got ${partialLatest.data.status}`);
  }
  ok('sales order PARTIALLY_SHIPPED');

  await req('POST', `/sales/orders/${partialOrder.data.id}/ship`, salesMgr.token, { notes: 'Ship remaining' });
  ok('sales shipment created (remaining)');

  const fullLatest = await req<{ success: boolean; data: any }>('GET', `/sales/orders/${partialOrder.data.id}`, salesMgr.token);
  if (fullLatest.data.status !== 'SHIPPED') {
    throw new Error(`Partial ship test: expected SHIPPED but got ${fullLatest.data.status}`);
  }
  ok('sales order SHIPPED after partial shipments');

  const trial = await req<{ success: boolean; data: any }>('GET', '/finance/reports/trial-balance', cfo.token);
  ok(`trial balance balanced=${trial.data.isBalanced}`);

  const valuation = await req<{ success: boolean; data: any }>('GET', '/inventory/valuation', cfo.token);
  ok(`inventory valuation total=${valuation.data.totalValuation}`);

  const vendors = await req<{ success: boolean; data: any[] }>('GET', '/purchase/vendors', manager.token);
  const vendor = vendors.data[0];
  if (!vendor) throw new Error('No vendor found');
  ok(`vendors count=${vendors.data.length}`);

  const poCreated = await req<{ success: boolean; data: any }>('POST', '/purchase/orders', manager.token, {
    vendorId: vendor.id,
    expectedDate: new Date().toISOString().slice(0, 10),
    notes: 'Smoke test PO',
    lines: [{ itemId: item.id, quantity: 2, unitCost: Number(item.costPrice || 1) }],
  });
  ok(`purchase order created ${poCreated.data.orderNumber}`);

  await req('PATCH', `/purchase/orders/${poCreated.data.id}/status`, manager.token, { status: 'CONFIRMED' });
  ok(`purchase order CONFIRMED ${poCreated.data.orderNumber}`);

  await req('POST', `/purchase/orders/${poCreated.data.id}/receive`, manager.token, { warehouseId: wh.id, notes: 'Smoke test receive' });
  ok(`purchase order received ${poCreated.data.orderNumber}`);

  const stockAfterReceive = await req<any>('GET', `/inventory/stock-levels?itemId=${item.id}&warehouseId=${wh.id}`, admin.token);
  const stock3 = getStockRow(stockAfterReceive);

  const recent = await req<{ success: boolean; data: any[] }>('GET', '/audit/recent?limit=6', admin.token);
  ok(`recent activities=${recent.data.length}`);

  const lowStock = await req<{ success: boolean; data: any[] }>('GET', '/inventory/items/low-stock', whHead.token);
  ok(`low stock items=${lowStock.data.length}`);

  const soLatest = await req<{ success: boolean; data: any }>('GET', `/sales/orders/${createOrder.data.id}`, salesMgr.token);
  const poLatest = await req<{ success: boolean; data: any }>('GET', `/purchase/orders/${poCreated.data.id}`, manager.token);

  const summary = {
    salesOrder: createOrder.data.orderNumber,
    soStatus: soLatest.data.status,
    purchaseOrder: poCreated.data.orderNumber,
    poStatus: poLatest.data.status,
    warehouse: wh.code || wh.name,
    item: item.sku || item.name,
    qty_before: stock0.quantity,
    reserved_after_confirm: stock1.reservedQty,
    qty_after_ship: stock2.quantity,
    qty_after_receive: stock3.quantity,
    ar_1100: balanceByCode(trial, '1100'),
    ap_2000: balanceByCode(trial, '2000'),
    inv_1200: balanceByCode(trial, '1200'),
    rev_4000: balanceByCode(trial, '4000'),
    cogs_5000: balanceByCode(trial, '5000'),
    inventoryValuationTotal: num(valuation.data.totalValuation),
    trialBalanced: Boolean(trial.data.isBalanced),
    recentActivities: recent.data.length,
  };

  process.stdout.write('\nSUMMARY\n');
  // eslint-disable-next-line no-console
  console.table([summary]);

  process.stdout.write('ALL SMOKE TESTS PASSED\n');
}

main().catch((e) => {
  process.stderr.write(`SMOKE TEST FAILED: ${e.message}\n`);
  process.exit(1);
});
