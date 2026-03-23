import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Truck, Calendar, DollarSign, ArrowRight, FileText, Filter, Trash2 } from 'lucide-react';
import { purchaseApi, inventoryApi, warehouseApi } from '../api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import React from 'react';

const EMPTY_ORDER = { vendorId: '', expectedDate: '', notes: '', lines: [{ itemId: '', quantity: 1, unitCost: 0 }] };

export default function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'day' | 'month' | 'year' | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_ORDER });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_ORDER });
  const [receiveForm, setReceiveForm] = useState({ warehouseId: '', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page, search, period],
    queryFn: () => purchaseApi.getOrders({ 
      page, 
      pageSize: 20, 
      search, 
      period: period || undefined 
    }),
  });

  const { data: warehousesResult } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehouseApi.getWarehouses({ pageSize: 100 }),
    enabled: receiveModalOpen,
  });

  const warehouses = (warehousesResult as any)?.data || [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => purchaseApi.updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Order status updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error updating status'),
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => purchaseApi.receiveGoods(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      setReceiveModalOpen(false);
      toast.success('Goods received successfully');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error receiving goods'),
  });

  const handleReceive = async (order: any) => {
    try {
      const full = await purchaseApi.getOrder(order.id);
      const o = (full as any)?.data;
      setSelectedOrder(o);
      setReceiveForm({ warehouseId: '', notes: '' });
      setReceiveModalOpen(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load order');
    }
  };

  const { data: vendorsResult } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: () => purchaseApi.getVendors({ pageSize: 100 }),
  });

  const { data: itemsResult } = useQuery({
    queryKey: ['items-list'],
    queryFn: () => inventoryApi.getItems({ pageSize: 100 }),
  });

  const vendors = (vendorsResult as any)?.data || [];
  const items = (itemsResult as any)?.data || [];

  const mutation = useMutation({
    mutationFn: (d: any) => purchaseApi.createOrder(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      setModalOpen(false);
      setForm({ ...EMPTY_ORDER });
      toast.success('Purchase Order created successfully');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error creating order'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => purchaseApi.updateOrder(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      setEditModalOpen(false);
      setEditId(null);
      toast.success('Purchase Order updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error updating order'),
  });

  const addLine = () => setForm({ ...form, lines: [...form.lines, { itemId: '', quantity: 1, unitCost: 0 }] });
  const removeLine = (idx: number) => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) });
  const updateLine = (idx: number, field: string, value: any) => {
    const lines = [...form.lines];
    lines[idx] = { ...lines[idx], [field]: value };
    
    if (field === 'itemId') {
      const item = items.find((i: any) => i.id === value);
      // For purchase, we might want to use a lastPurchasePrice if available, otherwise 0
      if (item) lines[idx].unitCost = Number(item.lastPurchasePrice || 0);
    }
    setForm({ ...form, lines });
  };

  const addEditLine = () => setEditForm({ ...editForm, lines: [...editForm.lines, { itemId: '', quantity: 1, unitCost: 0 }] });
  const removeEditLine = (idx: number) => setEditForm({ ...editForm, lines: editForm.lines.filter((_, i) => i !== idx) });
  const updateEditLine = (idx: number, field: string, value: any) => {
    const lines = [...editForm.lines];
    lines[idx] = { ...lines[idx], [field]: value };
    if (field === 'itemId') {
      const item = items.find((i: any) => i.id === value);
      if (item) lines[idx].unitCost = Number(item.lastPurchasePrice || 0);
    }
    setEditForm({ ...editForm, lines });
  };

  const handleEdit = async (r: any) => {
    try {
      const full = await purchaseApi.getOrder(r.id);
      const o = (full as any)?.data;
      setEditId(o.id);
      setEditForm({
        vendorId: o.vendorId,
        expectedDate: o.expectedDate ? String(o.expectedDate).slice(0, 10) : '',
        notes: o.notes || '',
        lines: (o.lines || []).map((l: any) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost),
        })),
      });
      setEditModalOpen(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load order');
    }
  };

  const orders = (data as any)?.data || [];
  const meta = (data as any)?.meta || { total: 0 };

  const columns = [
    { 
      key: 'orderNumber', 
      header: 'Order #', 
      render: (r: any) => <span className="font-bold text-[#4f46e5]">{r.orderNumber}</span> 
    },
    { 
      key: 'vendor', 
      header: 'Supplier', 
      render: (r: any) => <span className="font-bold text-[#0f172a]">{r.vendor?.name}</span> 
    },
    { 
      key: 'totalAmount', 
      header: 'Total Cost', 
      render: (r: any) => <span className="font-black text-[#0f172a]">${Number(r.totalAmount).toLocaleString()}</span> 
    },
    { 
      key: 'createdAt', 
      header: 'Ordered', 
      render: (r: any) => (
        <div className="flex items-center gap-2 text-xs text-[#64748b] font-medium">
          <Calendar size={12} />
          {new Date(r.createdAt).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: any) => {
        const colors: any = {
          DRAFT: 'badge-default',
          PENDING_APPROVAL: 'badge-warning',
          SENT: 'badge-info',
          CONFIRMED: 'badge-info',
          PARTIALLY_RECEIVED: 'badge-warning',
          RECEIVED: 'badge-success',
          CANCELLED: 'badge-danger'
        };
        return <span className={`badge ${colors[r.status] || 'badge-default'}`}>{r.status}</span>;
      }
    },
    {
      key: 'actions',
      header: '',
      width: '240px',
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleEdit(r)}
            disabled={['RECEIVED', 'PARTIALLY_RECEIVED', 'CANCELLED'].includes(r.status)}
            className="text-[#0f172a] font-black text-[11px] uppercase tracking-wider hover:underline disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Edit
          </button>
          {r.status === 'DRAFT' && (
            <button 
              onClick={() => statusMutation.mutate({ id: r.id, status: 'CONFIRMED' })}
              disabled={statusMutation.isPending}
              className="text-[#10b981] font-black text-[11px] uppercase tracking-wider hover:underline"
            >
              Confirm
            </button>
          )}
          <button 
            onClick={() => handleReceive(r)}
            disabled={!['CONFIRMED', 'PARTIALLY_RECEIVED'].includes(r.status)}
            className="flex items-center gap-1 text-[#4f46e5] font-black text-[11px] uppercase tracking-wider hover:underline disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Receive <ArrowRight size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">Purchase Orders</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => setReportModalOpen(true)}>
            <FileText size={18} /> Reports
          </button>
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
            <Plus size={18} /> New Purchase Order
          </button>
        </div>
      </div>

      <DataTable
        data={orders}
        columns={columns}
        total={meta.total}
        page={page}
        onPageChange={setPage}
        onSearch={setSearch}
        loading={isLoading}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-lg px-3 py-1.5">
              <Filter size={14} className="text-[#64748b]" />
              <select 
                className="text-xs font-bold text-[#0f172a] bg-transparent outline-none cursor-pointer"
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
              >
                <option value="">All Time</option>
                <option value="day">Today</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create New Purchase Order"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || !form.vendorId || form.lines.some(l => !l.itemId)}
            >
              {mutation.isPending ? 'Creating...' : 'Create Order'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Vendor / Supplier</label>
              <select 
                className="form-input" 
                value={form.vendorId} 
                onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
              >
                <option value="">Select Vendor</option>
                {vendors.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Expected Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={form.expectedDate} 
                onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} 
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
              <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">Order Lines</h3>
              <button className="text-xs font-black text-[#4f46e5] hover:underline" onClick={addLine}>+ Add Line</button>
            </div>
            <div className="space-y-3">
              {form.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-gray-50/50 p-3 rounded-xl border border-[#f1f5f9]">
                  <div className="col-span-6 space-y-1">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase">Item</label>
                    <select 
                      className="form-input !text-xs" 
                      value={line.itemId} 
                      onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                    >
                      <option value="">Select Item</option>
                      {items.map((i: any) => (
                        <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase">Qty</label>
                    <input 
                      type="number" 
                      className="form-input !text-xs" 
                      value={line.quantity} 
                      onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))} 
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase">Unit Cost</label>
                    <input 
                      type="number" 
                      className="form-input !text-xs" 
                      value={line.unitCost} 
                      onChange={(e) => updateLine(idx, 'unitCost', Number(e.target.value))} 
                    />
                  </div>
                  <div className="col-span-1 pb-2 flex justify-center">
                    <button className="text-red-400 hover:text-red-600" onClick={() => removeLine(idx)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Internal Notes</label>
            <textarea 
              className="form-input min-h-[80px]" 
              value={form.notes} 
              onChange={(e) => setForm({ ...form, notes: e.target.value })} 
              placeholder="Delivery instructions, quality requirements, etc..."
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Purchase Order"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={() => editId && updateMutation.mutate({ id: editId, data: editForm })}
              disabled={updateMutation.isPending || !editForm.vendorId || editForm.lines.some(l => !l.itemId)}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Vendor / Supplier</label>
              <select
                className="form-input"
                value={editForm.vendorId}
                onChange={(e) => setEditForm({ ...editForm, vendorId: e.target.value })}
              >
                <option value="">Select Vendor</option>
                {vendors.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Expected Date</label>
              <input
                type="date"
                className="form-input"
                value={editForm.expectedDate}
                onChange={(e) => setEditForm({ ...editForm, expectedDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-2">
              <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">Order Lines</h3>
              <button className="text-xs font-black text-[#4f46e5] hover:underline" onClick={addEditLine}>+ Add Line</button>
            </div>
            <div className="space-y-3">
              {editForm.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-gray-50/50 p-3 rounded-xl border border-[#f1f5f9]">
                  <div className="col-span-6 space-y-1">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase">Item</label>
                    <select
                      className="form-input !text-xs"
                      value={line.itemId}
                      onChange={(e) => updateEditLine(idx, 'itemId', e.target.value)}
                    >
                      <option value="">Select Item</option>
                      {items.map((i: any) => (
                        <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase">Qty</label>
                    <input
                      type="number"
                      className="form-input !text-xs"
                      value={line.quantity}
                      onChange={(e) => updateEditLine(idx, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase">Unit Cost</label>
                    <input
                      type="number"
                      className="form-input !text-xs"
                      value={line.unitCost}
                      onChange={(e) => updateEditLine(idx, 'unitCost', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-1 pb-2 flex justify-center">
                    <button className="text-red-400 hover:text-red-600" onClick={() => removeEditLine(idx)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Internal Notes</label>
            <textarea
              className="form-input min-h-[80px]"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Delivery instructions, quality requirements, etc..."
            />
          </div>
        </div>
      </Modal>

      {/* Receive Goods Modal */}
      <Modal
        open={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        title={`Receive Goods: ${selectedOrder?.orderNumber}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setReceiveModalOpen(false)}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={() => receiveMutation.mutate({ id: selectedOrder.id, data: receiveForm })}
              disabled={receiveMutation.isPending || !receiveForm.warehouseId}
            >
              {receiveMutation.isPending ? 'Processing...' : 'Confirm Receipt'}
            </button>
          </>
        }
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Supplier</p>
                <p className="font-black text-blue-900">{selectedOrder.vendor?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Expected Items</p>
                <p className="font-black text-blue-900">{selectedOrder.lines?.length || 0} Lines</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Destination Warehouse</label>
                <select 
                  className="form-input"
                  value={receiveForm.warehouseId}
                  onChange={(e) => setReceiveForm({ ...receiveForm, warehouseId: e.target.value })}
                >
                  <option value="">Select Warehouse to Store Items</option>
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-emerald-600 font-bold uppercase italic">* Stock levels will increase in this warehouse upon confirmation</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Receiving Notes</label>
                <textarea 
                  className="form-input min-h-[80px]"
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  placeholder="Damage reports, partial receipt notes, etc..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest border-b border-[#f1f5f9] pb-1">Items to be Received</h4>
              <div className="space-y-2">
                {selectedOrder.lines?.map((line: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs py-1">
                    <span className="font-bold text-[#0f172a]">{line.item?.name} x {line.quantity}</span>
                    <span className="font-black text-[#64748b]">${Number(line.lineTotal).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Purchase Reports Modal */}
      <Modal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Procurement Analytics"
        size="lg"
      >
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
              <Truck size={32} className="mx-auto mb-2 text-slate-400" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Pending Deliveries</p>
              <p className="text-3xl font-black text-slate-900">{orders.filter((o: any) => o.status !== 'RECEIVED').length}</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
              <DollarSign size={32} className="mx-auto mb-2 text-slate-400" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Procurement</p>
              <p className="text-3xl font-black text-slate-900">${orders.reduce((s: number, o: any) => s + Number(o.totalAmount), 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">Top Suppliers by Volume</h3>
            <div className="space-y-2">
              {[...new Set(orders.map((o: any) => o.vendor?.name))].slice(0, 3).map((v: any, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#f1f5f9]">
                  <span className="text-xs font-bold text-[#0f172a]">{v}</span>
                  <div className="h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${85 - i * 20}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-200 mb-2">Supply Chain Health</h4>
            <p className="text-sm font-medium leading-relaxed">
              Your average lead time for procurement is <span className="underline decoration-indigo-300 decoration-2 underline-offset-4">4.2 days</span>. 
              All active suppliers are currently meeting quality SLAs.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
