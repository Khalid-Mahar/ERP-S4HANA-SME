import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShoppingCart, Calendar, Clock, ArrowRight, FileText, Filter, Trash2, Package, TrendingUp, DollarSign } from 'lucide-react';
import { salesApi, inventoryApi, warehouseApi } from '../api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import React from 'react';

const EMPTY_ORDER = { customerId: '', deliveryDate: '', notes: '', lines: [{ itemId: '', quantity: 1, unitPrice: 0, discount: 0 }] };

export default function SalesOrdersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'day' | 'month' | 'year' | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_ORDER });
  const [manageForm, setManageForm] = useState({ status: '', warehouseId: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['sales-orders', page, search, period],
    queryFn: () => salesApi.getOrders({ 
      page, 
      pageSize: 20, 
      search, 
      period: period || undefined 
    }),
  });

  const { data: summaryResult } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => salesApi.getSummary(),
    enabled: reportModalOpen,
  });

  const { data: warehousesResult } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehouseApi.getWarehouses({ pageSize: 100 }),
    enabled: manageModalOpen,
  });

  const warehouses = (warehousesResult as any)?.data || [];
  const summary = (summaryResult as any)?.data || {};

  const statusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => salesApi.updateOrderStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      setManageModalOpen(false);
      toast.success('Order status updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error updating status'),
  });

  const handleManage = (order: any) => {
    setSelectedOrder(order);
    setManageForm({ status: order.status, warehouseId: '' });
    setManageModalOpen(true);
  };

  const { data: customersResult } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => salesApi.getCustomers({ pageSize: 100 }),
  });

  const { data: itemsResult } = useQuery({
    queryKey: ['items-list'],
    queryFn: () => inventoryApi.getItems({ pageSize: 100 }),
  });

  const customers = (customersResult as any)?.data || [];
  const items = (itemsResult as any)?.data || [];

  const mutation = useMutation({
    mutationFn: (d: any) => salesApi.createOrder(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      setModalOpen(false);
      setForm({ ...EMPTY_ORDER });
      toast.success('Sales Order created successfully');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error creating order'),
  });

  const addLine = () => setForm({ ...form, lines: [...form.lines, { itemId: '', quantity: 1, unitPrice: 0, discount: 0 }] });
  const removeLine = (idx: number) => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) });
  const updateLine = (idx: number, field: string, value: any) => {
    const lines = [...form.lines];
    lines[idx] = { ...lines[idx], [field]: value };
    
    if (field === 'itemId') {
      const item = items.find((i: any) => i.id === value);
      if (item) lines[idx].unitPrice = Number(item.basePrice);
    }
    setForm({ ...form, lines });
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
      key: 'customer', 
      header: 'Customer', 
      render: (r: any) => <span className="font-bold text-[#0f172a]">{r.customer?.name}</span> 
    },
    { 
      key: 'totalAmount', 
      header: 'Total Value', 
      render: (r: any) => <span className="font-black text-[#0f172a]">${Number(r.totalAmount).toLocaleString()}</span> 
    },
    { 
      key: 'createdAt', 
      header: 'Date', 
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
          CONFIRMED: 'badge-info',
          SHIPPED: 'badge-warning',
          DELIVERED: 'badge-success',
          CANCELLED: 'badge-danger'
        };
        return <span className={`badge ${colors[r.status] || 'badge-default'}`}>{r.status}</span>;
      }
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (r: any) => (
        <button 
          onClick={() => handleManage(r)}
          className="flex items-center gap-1 text-[#4f46e5] font-black text-[11px] uppercase tracking-wider hover:underline"
        >
          Manage Order <ArrowRight size={14} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">Sales Orders</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => setReportModalOpen(true)}>
            <FileText size={18} /> Reports
          </button>
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
            <Plus size={18} /> New Sales Order
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
        title="Create New Sales Order"
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={() => mutation.mutate(form)}
              disabled={mutation.isPending || !form.customerId || form.lines.some(l => !l.itemId)}
            >
              {mutation.isPending ? 'Creating...' : 'Create Order'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Customer</label>
              <select 
                className="form-input" 
                value={form.customerId} 
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              >
                <option value="">Select Customer</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Delivery Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={form.deliveryDate} 
                onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} 
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
                  <div className="col-span-5 space-y-1">
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
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase">Price</label>
                    <input 
                      type="number" 
                      className="form-input !text-xs" 
                      value={line.unitPrice} 
                      onChange={(e) => updateLine(idx, 'unitPrice', Number(e.target.value))} 
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase">Disc%</label>
                    <input 
                      type="number" 
                      className="form-input !text-xs" 
                      value={line.discount} 
                      onChange={(e) => updateLine(idx, 'discount', Number(e.target.value))} 
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
              placeholder="Shipping instructions, etc..."
            />
          </div>
        </div>
      </Modal>

      {/* Manage Order Modal */}
      <Modal
        open={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        title={`Manage Order: ${selectedOrder?.orderNumber}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setManageModalOpen(false)}>Close</button>
            <button 
              className="btn btn-primary" 
              onClick={() => statusMutation.mutate({ id: selectedOrder.id, data: manageForm })}
              disabled={statusMutation.isPending || !manageForm.status || ((manageForm.status === 'SHIPPED' || manageForm.status === 'DELIVERED') && !manageForm.warehouseId)}
            >
              Update Status
            </button>
          </>
        }
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-[#e2e8f0]">
              <div>
                <p className="text-[10px] font-bold text-[#64748b] uppercase">Current Status</p>
                <span className="badge badge-info">{selectedOrder.status}</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-[#64748b] uppercase">Total Amount</p>
                <p className="text-lg font-black text-[#0f172a]">${Number(selectedOrder.totalAmount).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">New Status</label>
                <select 
                  className="form-input"
                  value={manageForm.status}
                  onChange={(e) => setManageForm({ ...manageForm, status: e.target.value })}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="SHIPPED">SHIPPED (Reduces Stock)</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              {(manageForm.status === 'SHIPPED' || manageForm.status === 'DELIVERED') && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Dispatch Warehouse</label>
                  <select 
                    className="form-input border-orange-200 bg-orange-50/30"
                    value={manageForm.warehouseId}
                    onChange={(e) => setManageForm({ ...manageForm, warehouseId: e.target.value })}
                  >
                    <option value="">Select Warehouse to Ship From</option>
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-orange-600 font-bold uppercase italic">* Inventory will be deducted from this warehouse</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest border-b border-[#f1f5f9] pb-1">Order Items</h4>
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

      {/* Sales Reports Modal */}
      <Modal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Sales Performance Analytics"
        size="lg"
      >
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <TrendingUp size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Total Revenue</span>
              </div>
              <p className="text-2xl font-black text-indigo-900">${Number(summary.totalRevenue || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <ShoppingCart size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Orders Count</span>
              </div>
              <p className="text-2xl font-black text-emerald-900">{summary.totalOrders || 0}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <Clock size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
              </div>
              <p className="text-2xl font-black text-orange-900">{summary.pendingOrders || 0}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} className="text-[#4f46e5]" /> Recent Sales Distribution
            </h3>
            <div className="h-48 bg-gray-50 rounded-2xl border border-dashed border-[#e2e8f0] flex items-center justify-center text-[#94a3b8] text-xs font-bold italic">
              Graphical data visualization pending Chart.js integration
            </div>
          </div>

          <div className="bg-[#0f172a] p-6 rounded-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400">AI Business Insight</h4>
              <div className="px-2 py-1 bg-indigo-500/20 rounded text-[10px] font-bold text-indigo-300 uppercase">Beta</div>
            </div>
            <p className="text-sm leading-relaxed text-indigo-100/80">
              Based on your current sales velocity of <span className="text-white font-bold">{summary.totalOrders} orders</span>, 
              we recommend increasing stock levels for high-performing items before the month-end surge.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
