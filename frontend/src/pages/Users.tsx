import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserCheck, UserX, Mail, Shield, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';
import { usersApi } from '../api';
import DataTable from '../components/DataTable';
import toast from 'react-hot-toast';
import React from 'react';

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersApi.getUsers({ page, pageSize: 20, search }),
  });

  const users = (data as any)?.data || [];
  const meta = (data as any)?.meta || { total: 0 };

  const toggleMutation = useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
  });

  const columns = [
    { 
      key: 'name', 
      header: 'System User', 
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f1f5f9] rounded-lg flex items-center justify-center text-[#64748b] font-bold text-xs">
            {r.firstName[0]}{r.lastName[0]}
          </div>
          <div>
            <p className="font-bold text-[#0f172a]">{r.firstName} {r.lastName}</p>
            <p className="text-[10px] text-[#64748b] font-bold uppercase tracking-widest flex items-center gap-1">
              <Mail size={10} /> {r.email}
            </p>
          </div>
        </div>
      )
    },
    { 
      key: 'role', 
      header: 'Access Level', 
      render: (r: any) => {
        const icons: any = { ADMIN: <ShieldAlert size={14} />, MANAGER: <ShieldCheck size={14} />, USER: <Shield size={14} /> };
        return (
          <div className="flex items-center gap-2 font-black text-[11px] uppercase tracking-widest text-[#0f172a]">
            {icons[r.role]} {r.role}
          </div>
        );
      }
    },
    { 
      key: 'lastLoginAt', 
      header: 'Last Activity', 
      render: (r: any) => (
        <div className="flex items-center gap-2 text-xs text-[#64748b] font-medium">
          <Clock size={12} />
          {r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString() : 'Never'}
        </div>
      )
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (r: any) => <span className={`badge ${r.isActive ? 'badge-success' : 'badge-default'}`}>{r.isActive ? 'Online' : 'Disabled'}</span>
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (r: any) => (
        <button 
          onClick={() => toggleMutation.mutate(r.id)}
          className={`flex items-center gap-1 font-black text-[11px] uppercase tracking-wider hover:underline ${r.isActive ? 'text-red-500' : 'text-green-600'}`}
        >
          {r.isActive ? <><UserX size={12} /> Disable Access</> : <><UserCheck size={12} /> Enable Access</>}
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={users}
        columns={columns}
        total={meta.total}
        page={page}
        onPageChange={setPage}
        onSearch={setSearch}
        loading={isLoading}
      />
    </div>
  );
}
