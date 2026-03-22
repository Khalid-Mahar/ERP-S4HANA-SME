import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users, UserPlus, Target, TrendingUp, Mail, Phone, Calendar } from 'lucide-react';
import { crmApi } from '../api';
import DataTable from '../components/DataTable';
import React from 'react';

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, search],
    queryFn: () => crmApi.getLeads({ page, pageSize: 20, search }),
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
        <button className="text-[#4f46e5] font-black text-[11px] uppercase tracking-wider hover:underline flex items-center gap-1">
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
          <button className="btn btn-primary">
            <UserPlus size={18} /> New Lead
          </button>
        }
      />
    </div>
  );
}
