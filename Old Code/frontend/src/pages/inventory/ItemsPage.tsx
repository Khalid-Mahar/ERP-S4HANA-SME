import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react';
import { inventoryApi } from '../../api';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  code: '', name: '', description: '', category: '',
  uom: 'PCS', costPrice: 0, salePrice: 0, minStockLevel: 0, maxStockLevel: '',
};

function statusBadge(isActive: boolean) {
  return <span className={`badge ${isActive ? 'badge-success' : 'badge-default'}`}>{isActive ? 'Active' : 'Inactive'}</span>;
}

export default function ItemsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data, isLoading } = useQuery({
    queryKey: ['items', page, search],
    queryFn: () => inventoryApi.getItems({ page, pageSize: 20, search }),
  });

  const items: any[] = (data as any)?.data?.data || [];
  const meta = (data as any)?.data?.meta || {};

  const createMutation = useMutation({
    mutationFn: (d: any) => editItem ? inventoryApi.updateItem(editItem.id, d) : inventoryApi.createItem(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      setModalOpen(false);
      toast.success(editItem ? 'Item updated' : 'Item created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); toast.success('Item deleted'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete item'),
  });

  const openCreate = () => { setEditItem(null); setForm({ ...EMPTY_FORM }); setModalOpen(true); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ code: item.code, name: item.name, description: item.description || '', category: item.category || '', uom: item.uom, costPrice: item.costPrice, salePrice: item.salePrice, minStockLevel: item.minStockLevel, maxStockLevel: item.maxStockLevel || '' });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, costPrice: Number(form.costPrice), salePrice: Number(form.salePrice), minStockLevel: Number(form.minStockLevel), maxStockLevel: form.maxStockLevel ? Number(form.maxStockLevel) : undefined });
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const columns = [
    { key: 'code', header: 'Code', render: (r: any) => <span style={{ fontWeight: 600, color: '#4f46e5' }}>{r.code}</span> },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category', render: (r: any) => r.category || '—' },
    { key: 'uom', header: 'UOM' },
    { key: 'costPrice', header: 'Cost', render: (r: any) => `$${Number(r.costPrice).toFixed(2)}` },
    { key: 'salePrice', header: 'Sale Price', render: (r: any) => `$${Number(r.salePrice).toFixed(2)}` },
    {
      key: 'stock', header: 'Total Stock',
      render: (r: any) => {
        const total = r.stockLevels?.reduce((s: number, sl: any) => s + Number(sl.quantity), 0) || 0;
        const low = total <= r.minStockLevel;
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: low ? '#dc2626' : 'inherit' }}>
            {low && <AlertTriangle size={13} />}
            {total} {r.uom}
          </span>
        );
      },
    },
    { key: 'isActive', header: 'Status', render: (r: any) => statusBadge(r.isActive) },
    {
      key: 'actions', header: '', width: '80px',
      render: (r: any) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(r)} title="Edit"><Edit2 size={14} /></button>
          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#dc2626' }} onClick={() => { if (confirm('Delete this item?')) deleteMutation.mutate(r.id); }} title="Delete"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Items</h1>
          <p className="page-subtitle">Manage your product catalog and stock levels</p>
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
        searchPlaceholder="Search items..."
        loading={isLoading}
        actions={
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} /> New Item
          </button>
        }
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Item' : 'Create Item'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
              {editItem ? 'Save Changes' : 'Create Item'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label required">Item Code</label>
            <input className="form-input" value={form.code} onChange={f('code')} placeholder="ITEM-001" required disabled={!!editItem} />
          </div>
          <div className="form-group">
            <label className="form-label required">Name</label>
            <input className="form-input" value={form.name} onChange={f('name')} placeholder="Product name" required />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <input className="form-input" value={form.category} onChange={f('category')} placeholder="Electronics" />
          </div>
          <div className="form-group">
            <label className="form-label">Unit of Measure</label>
            <input className="form-input" value={form.uom} onChange={f('uom')} placeholder="PCS" />
          </div>
          <div className="form-group">
            <label className="form-label">Cost Price ($)</label>
            <input className="form-input" type="number" min="0" step="0.01" value={form.costPrice} onChange={f('costPrice')} />
          </div>
          <div className="form-group">
            <label className="form-label">Sale Price ($)</label>
            <input className="form-input" type="number" min="0" step="0.01" value={form.salePrice} onChange={f('salePrice')} />
          </div>
          <div className="form-group">
            <label className="form-label">Min Stock Level</label>
            <input className="form-input" type="number" min="0" value={form.minStockLevel} onChange={f('minStockLevel')} />
          </div>
          <div className="form-group">
            <label className="form-label">Max Stock Level</label>
            <input className="form-input" type="number" min="0" value={form.maxStockLevel} onChange={f('maxStockLevel')} placeholder="Optional" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={f('description')} placeholder="Optional description" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
