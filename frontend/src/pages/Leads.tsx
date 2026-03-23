import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, UserPlus, Target, TrendingUp, Mail, Phone, Calendar } from 'lucide-react';
import { crmApi } from '../api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import React from 'react';

const EMPTY_FORM = { name: '', company: '', email: '', phone: '', status: 'NEW', value: 0, source: 'Manual' };

export default function LeadsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, search],
    queryFn: () => crmApi.getLeads({ page, pageSize: 20, search }),
  });

  const mutation = useMutation({
    mutationFn: (d: any) => crmApi.createLead(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      toast.success('New lead registered in pipeline');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error creating lead'),
  });

  const leads = (data as any)?.data || [];
  const meta = (data as any)?.meta || { total: 0 };

  const columns = [
    { 
      key: 'name', 
      header: 'Lead / Company', 
      render: (r: any) => (
        <div>
          <p className="font-bold text-[#0f172a]">{r.name}</p>
          <p className="text-[10px] text-[#64748b] font-bold uppercase tracking-widest">{r.company || 'Private Individual'}</p>
        </div>
      )
    },
    { 
      key: 'contact', 
      header: 'Contact Info', 
      render: (r: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#64748b] font-medium">
            <Mail size={12} /> {r.email || '—'}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#64748b] font-medium">
            <Phone size={12} /> {r.phone || '—'}
          </div>
        </div>
      )
    },
    { 
      key: 'value', 
      header: 'Deal Value', 
      render: (r: any) => <span className="font-black text-[#0f172a]">${Number(r.value || 0).toLocaleString()}</span> 
    },
    {
      key: 'status',
      header: 'Pipeline Stage',
      render: (r: any) => {
        const colors: any = { NEW: 'badge-default', CONTACTED: 'badge-info', QUALIFIED: 'badge-warning', PROPOSAL: 'badge-info', NEGOTIATION: 'badge-warning', WON: 'badge-success', LOST: 'badge-danger' };
        return <span className={`badge ${colors[r.status] || 'badge-default'}`}>{r.status}</span>;
      }
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (r: any) => (
        <button 
          onClick={() => toast(`Progressing lead: ${r.name}`)}
          className="text-[#4f46e5] font-black text-[11px] uppercase tracking-wider hover:underline flex items-center gap-1"
        >
          <TrendingUp size={12} /> Progress Lead
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={leads}
        columns={columns}
        total={meta.total}
        page={page}
        onPageChange={setPage}
        onSearch={setSearch}
        loading={isLoading}
        actions={
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <UserPlus size={18} /> New Lead
          </button>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register New Sales Lead"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
              Add to CRM
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Contact Name</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="John Doe" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Company Name</label>
            <input className="form-input" value={form.company} onChange={(e) => setForm({...form, company: e.target.value})} placeholder="Acme Corp" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Email Address</label>
            <input className="form-input" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="john@company.com" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Expected Value ($)</label>
            <input className="form-input" type="number" value={form.value} onChange={(e) => setForm({...form, value: Number(e.target.value)})} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Pipeline Stage</label>
            <select className="form-input" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
              <option value="NEW">New Lead</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="PROPOSAL">Proposal</option>
              <option value="NEGOTIATION">Negotiation</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Lead Source</label>
            <input className="form-input" value={form.source} onChange={(e) => setForm({...form, source: e.target.value})} placeholder="Website, Referral..." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
