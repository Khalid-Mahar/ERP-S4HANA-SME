import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users, Briefcase, Mail, MapPin, Calendar, DollarSign } from 'lucide-react';
import { hrApi } from '../api';
import DataTable from '../components/DataTable';
import React from 'react';

export default function EmployeesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search],
    queryFn: () => hrApi.getEmployees({ page, pageSize: 20, search }),
  });

  const employees = (data as any)?.data || [];
  const meta = (data as any)?.meta || { total: 0 };

  const columns = [
    { 
      key: 'employeeId', 
      header: 'EMP ID', 
      render: (r: any) => <span className="font-bold text-[#4f46e5]">{r.employeeId}</span> 
    },
    { 
      key: 'name', 
      header: 'Employee Name', 
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
            {r.firstName[0]}
          </div>
          <div>
            <p className="font-bold text-[#0f172a]">{r.firstName} {r.lastName}</p>
            <p className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">{r.position || 'No Position'}</p>
          </div>
        </div>
      )
    },
    { 
      key: 'department', 
      header: 'Department', 
      render: (r: any) => <span className="text-xs font-black text-[#64748b] uppercase tracking-widest">{r.department || '—'}</span> 
    },
    { 
      key: 'hireDate', 
      header: 'Joined', 
      render: (r: any) => (
        <div className="flex items-center gap-2 text-xs text-[#64748b] font-medium">
          <Calendar size={12} />
          {new Date(r.hireDate).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: any) => {
        const colors: any = { ACTIVE: 'badge-success', INACTIVE: 'badge-default', ON_LEAVE: 'badge-warning', TERMINATED: 'badge-danger' };
        return <span className={`badge ${colors[r.status] || 'badge-default'}`}>{r.status}</span>;
      }
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      render: (r: any) => (
        <button className="text-[#4f46e5] font-black text-[11px] uppercase tracking-wider hover:underline">Manage HR</button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <DataTable
        data={employees}
        columns={columns}
        total={meta.total}
        page={page}
        onPageChange={setPage}
        onSearch={setSearch}
        loading={isLoading}
        actions={
          <button className="btn btn-primary">
            <Plus size={18} /> Onboard Employee
          </button>
        }
      />
    </div>
  );
}
