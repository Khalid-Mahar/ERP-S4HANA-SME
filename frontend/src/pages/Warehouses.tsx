import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Warehouse as WarehouseIcon, MapPin, Box } from 'lucide-react';
import { warehouseApi } from '../api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import React from 'react';

const EMPTY_FORM = { code: '', name: '', address: '' };

export default function WarehousesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', page, search],
    queryFn: () => warehouseApi.getWarehouses({ page, pageSize: 20, search }),
  });

  const warehouses = (data as any)?.data || [];
  const meta = (data as any)?.meta || { total: 0 };

  const mutation = useMutation({
    mutationFn: (d: any) => warehouseApi.createWarehouse(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      toast.success('Warehouse created successfully');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error creating warehouse'),
  });

  const columns = [
    { 
      key: 'code', 
      header: 'Code', 
      render: (r: any) => <span className="font-bold text-[#4f46e5]">{r.code}</span> 
    },
    { key: 'name', header: 'Warehouse Name' },
    { 
      key: 'address', 
      header: 'Location', 
      render: (r: any) => (
        <div className="flex items-center gap-2 text-[#64748b]">
          <MapPin size={14} />
          <span>{r.address || 'No address'}</span>
        </div>
      )
    },
    { 
      key: 'bins', 
      header: 'Bins', 
      render: (r: any) => <span className="badge badge-info">{r.bins?.length || 0} Locations</span> 
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (r: any) => (
        <button className="p-2 text-[#4f46e5] hover:bg-indigo-50 rounded-lg font-bold text-xs uppercase">Details</button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={warehouses}
        columns={columns}
        total={meta.total}
        page={page}
        onPageChange={setPage}
        onSearch={setSearch}
        loading={isLoading}
        actions={
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={18} /> New Warehouse
          </button>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register New Warehouse"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
              Confirm Registration
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Warehouse Code</label>
            <input 
              className="form-input" 
              value={form.code} 
              onChange={(e) => setForm({...form, code: e.target.value})} 
              placeholder="e.g. WH-NORTH" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Name</label>
            <input 
              className="form-input" 
              value={form.name} 
              onChange={(e) => setForm({...form, name: e.target.value})} 
              placeholder="e.g. Northern Distribution Center" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Physical Address</label>
            <textarea 
              className="form-input min-h-[80px]" 
              value={form.address} 
              onChange={(e) => setForm({...form, address: e.target.value})} 
              placeholder="Full warehouse address..." 
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
