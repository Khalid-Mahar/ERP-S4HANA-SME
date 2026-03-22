import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Package, AlertTriangle, Sparkles, FileText, TrendingUp } from 'lucide-react';
import { inventoryApi, aiApi } from '../api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import React from 'react';

const EMPTY_FORM = {
  sku: '', name: '', description: '', category: '',
  uom: 'PCS', costPrice: 0, salePrice: 0, minStockLevel: 0, maxStockLevel: '',
};

function StatusBadge({ isActive }: { isActive: boolean }) {
  return <span className={`badge ${isActive ? 'badge-success' : 'badge-default'}`}>{isActive ? 'Active' : 'Inactive'}</span>;
}

export default function ItemsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [valuationModalOpen, setValuationModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [aiLoading, setAiLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['items', page, search],
    queryFn: () => inventoryApi.getItems({ page, pageSize: 20, search }),
  });

  const { data: valuationData, isLoading: valuationLoading } = useQuery({
    queryKey: ['inventory-valuation'],
    queryFn: () => inventoryApi.getValuation(),
    enabled: valuationModalOpen,
  });

  const generateAiDescription = async () => {
    if (!form.name) return toast.error('Please enter a product name first');
    setAiLoading(true);
    try {
      const res = await aiApi.generateDescription({ itemName: form.name, category: form.category });
      setForm(prev => ({ ...prev, description: res.data || res as any }));
      toast.success('AI description generated');
    } catch (err) {
      toast.error('AI feature currently unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const items: any[] = (data as any)?.data || [];
  const meta = (data as any)?.meta || { total: 0 };

  const createMutation = useMutation({
    mutationFn: (d: any) => editItem ? inventoryApi.updateItem(editItem.id, d) : inventoryApi.createItem(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      setModalOpen(false);
      toast.success(editItem ? 'Item updated' : 'Item created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error saving item'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); toast.success('Item deleted'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete item'),
  });

  const openCreate = () => { setEditItem(null); setForm({ ...EMPTY_FORM }); setModalOpen(true); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ 
      sku: item.sku, 
      name: item.name, 
      description: item.description || '', 
      category: item.category || '', 
      uom: item.uom, 
      costPrice: item.costPrice, 
      salePrice: item.salePrice, 
      minStockLevel: item.minStockLevel, 
      maxStockLevel: item.maxStockLevel || '' 
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ 
      ...form, 
      costPrice: Number(form.costPrice), 
      salePrice: Number(form.salePrice), 
      minStockLevel: Number(form.minStockLevel), 
      maxStockLevel: form.maxStockLevel ? Number(form.maxStockLevel) : undefined 
    });
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const columns = [
    { 
      key: 'sku', 
      header: 'SKU', 
      render: (r: any) => <span className="font-bold text-[#4f46e5]">{r.sku}</span> 
    },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category', render: (r: any) => r.category || '—' },
    { key: 'uom', header: 'UOM' },
    { key: 'costPrice', header: 'Cost', render: (r: any) => `$${Number(r.costPrice).toFixed(2)}` },
    { key: 'salePrice', header: 'Sale Price', render: (r: any) => `$${Number(r.salePrice).toFixed(2)}` },
    {
      key: 'stock', 
      header: 'Total Stock',
      render: (r: any) => {
        const total = r.stockLevels?.reduce((s: number, sl: any) => s + Number(sl.quantity), 0) || 0;
        const low = total <= r.minStockLevel;
        return (
          <span className={`flex items-center gap-1 font-medium ${low ? 'text-red-600' : 'text-slate-700'}`}>
            {low && <AlertTriangle size={14} />}
            {total} {r.uom}
          </span>
        );
      },
    },
    { key: 'isActive', header: 'Status', render: (r: any) => <StatusBadge isActive={r.isActive} /> },
    {
      key: 'actions', 
      header: '', 
      width: '100px',
      render: (r: any) => (
        <div className="flex gap-1">
          <button className="p-2 text-[#64748b] hover:bg-gray-100 rounded-lg" onClick={() => openEdit(r)}><Edit2 size={14} /></button>
          <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg" onClick={() => { if (confirm('Delete this item?')) deleteMutation.mutate(r.id); }}><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">Inventory Items</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => setValuationModalOpen(true)}>
            <TrendingUp size={18} /> Valuation Report
          </button>
          <button className="btn btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      <DataTable
        data={items}
        columns={columns}
        total={meta.total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        onSearch={setSearch}
        searchPlaceholder="Search products..."
        loading={isLoading}
      />

      <Modal
        open={valuationModalOpen}
        onClose={() => setValuationModalOpen(false)}
        title="Inventory Valuation (FIFO)"
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Total Company Inventory Value</p>
              <p className="text-3xl font-black text-indigo-900">
                ${Number(valuationData?.data?.totalValuation || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-white rounded-2xl shadow-sm">
              <TrendingUp size={24} className="text-indigo-500" />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e2e8f0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <tr>
                  <th className="px-4 py-3 font-black text-[#0f172a] uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 font-black text-[#0f172a] uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 font-black text-[#0f172a] uppercase tracking-wider text-right">Quantity</th>
                  <th className="px-4 py-3 font-black text-[#0f172a] uppercase tracking-wider text-right">Avg Cost</th>
                  <th className="px-4 py-3 font-black text-[#0f172a] uppercase tracking-wider text-right">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {valuationLoading ? (
                  <tr><td colSpan={5} className="text-center py-8">Calculating valuation...</td></tr>
                ) : valuationData?.data?.items?.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-[#94a3b8]">No inventory found</td></tr>
                ) : valuationData?.data?.items?.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-bold text-[#4f46e5]">{item.sku}</td>
                    <td className="px-4 py-3 font-medium text-[#0f172a]">{item.name}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#64748b]">{Number(item.totalQty).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#64748b]">${Number(item.avgUnitCost).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-black text-[#0f172a]">${Number(item.valuation).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={editItem ? 'Update Product' : 'New Product Registration'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2" />}
              {editItem ? 'Save Changes' : 'Register Product'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">SKU Code</label>
            <input className="form-input" value={form.sku} onChange={f('sku')} placeholder="SKU-1001" required disabled={!!editItem} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Product Name</label>
            <input className="form-input" value={form.name} onChange={f('name')} placeholder="Enter product name" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Category</label>
            <input className="form-input" value={form.category} onChange={f('category')} placeholder="e.g. Raw Material" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Unit (UOM)</label>
            <input className="form-input" value={form.uom} onChange={f('uom')} placeholder="PCS, KG, LTR" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Cost Price ($)</label>
            <input className="form-input" type="number" min="0" step="0.01" value={form.costPrice} onChange={f('costPrice')} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Sale Price ($)</label>
            <input className="form-input" type="number" min="0" step="0.01" value={form.salePrice} onChange={f('salePrice')} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Min Stock</label>
            <input className="form-input" type="number" min="0" value={form.minStockLevel} onChange={f('minStockLevel')} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Max Stock</label>
            <input className="form-input" type="number" min="0" value={form.maxStockLevel} onChange={f('maxStockLevel')} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Description</label>
              <button 
                type="button"
                onClick={generateAiDescription}
                disabled={aiLoading}
                className="flex items-center gap-1 text-[10px] font-black text-[#4f46e5] uppercase hover:bg-indigo-50 px-2 py-1 rounded-lg transition-all"
              >
                <Sparkles size={12} className={aiLoading ? 'animate-pulse' : ''} />
                {aiLoading ? 'Thinking...' : 'AI Enhance'}
              </button>
            </div>
            <textarea className="form-input min-h-[80px]" value={form.description} onChange={f('description')} placeholder="Detailed product specifications..." />
          </div>
        </form>
      </Modal>
    </div>
  );
}
