import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building, Mail, Phone, MapPin, DollarSign, Calendar } from 'lucide-react';
import { purchaseApi } from '../api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import React from 'react';

const EMPTY_FORM = { code: '', name: '', email: '', phone: '', address: '', paymentTerms: 30 };

export default function VendorsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', page, search],
    queryFn: () => purchaseApi.getVendors({ page, pageSize: 20, search }),
  });

  const vendors = (data as any)?.data || [];
  const meta = (data as any)?.meta || { total: 0 };

  const mutation = useMutation({
    mutationFn: (d: any) => purchaseApi.createVendor(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      toast.success('Vendor profile created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error creating vendor'),
  });

  const columns = [
    { 
      key: 'code', 
      header: 'ID', 
      render: (r: any) => <span className="font-bold text-[#4f46e5]">{r.code}</span> 
    },
    { 
      key: 'name', 
      header: 'Vendor Name', 
      render: (r: any) => (
        <div>
          <p className="font-bold text-[#0f172a]">{r.name}</p>
          <div className="flex items-center gap-2 text-[10px] text-[#64748b] font-bold uppercase">
            <Mail size={10} /> {r.email || 'No email'}
          </div>
        </div>
      )
    },
    { 
      key: 'paymentTerms', 
      header: 'Terms', 
      render: (r: any) => (
        <div className="flex items-center gap-1 font-bold text-[#64748b] text-xs">
          <Calendar size={12} />
          {r.paymentTerms} Days Net
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: any) => <span className={`badge ${r.isActive ? 'badge-success' : 'badge-default'}`}>{r.isActive ? 'Active' : 'Inactive'}</span>
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (r: any) => (
        <button className="text-[#4f46e5] font-black text-[11px] uppercase tracking-wider hover:underline">Purchase History</button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={vendors}
        columns={columns}
        total={meta.total}
        page={page}
        onPageChange={setPage}
        onSearch={setSearch}
        loading={isLoading}
        actions={
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={18} /> New Vendor
          </button>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register New Vendor"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
              Create Profile
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Vendor Code</label>
            <input className="form-input" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} placeholder="VND-1001" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Company Name</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Enter vendor name" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Email Address</label>
            <input className="form-input" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="sales@vendor.com" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Phone Number</label>
            <input className="form-input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="+1 234 567 890" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Payment Terms (Days)</label>
            <input className="form-input" type="number" value={form.paymentTerms} onChange={(e) => setForm({...form, paymentTerms: Number(e.target.value)})} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Business Address</label>
            <textarea className="form-input min-h-[80px]" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} placeholder="Full physical address for delivery and tax..." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
