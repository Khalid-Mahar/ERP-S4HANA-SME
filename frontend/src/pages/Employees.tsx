import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Briefcase, Mail, MapPin, Calendar, DollarSign } from 'lucide-react';
import { hrApi } from '../api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import React from 'react';

const EMPTY_FORM = { employeeId: '', firstName: '', lastName: '', email: '', department: '', position: '', salary: 0, hireDate: new Date().toISOString().split('T')[0] };

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search],
    queryFn: () => hrApi.getEmployees({ page, pageSize: 20, search }),
  });

  const mutation = useMutation({
    mutationFn: (d: any) => hrApi.createEmployee(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      toast.success('Employee onboarded successfully');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error onboarding employee'),
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
        <button 
          onClick={() => toast(`Managing HR for ${r.firstName}`)}
          className="text-[#4f46e5] font-black text-[11px] uppercase tracking-wider hover:underline"
        >
          Manage HR
        </button>
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
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={18} /> Onboard Employee
          </button>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Employee Onboarding"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
              Complete Onboarding
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Employee ID</label>
            <input className="form-input" value={form.employeeId} onChange={(e) => setForm({...form, employeeId: e.target.value})} placeholder="EMP-1001" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">First Name</label>
            <input className="form-input" value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} placeholder="John" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Last Name</label>
            <input className="form-input" value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} placeholder="Doe" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Email Address</label>
            <input className="form-input" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="john.doe@company.com" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Department</label>
            <input className="form-input" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} placeholder="IT, Sales, HR..." />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Position</label>
            <input className="form-input" value={form.position} onChange={(e) => setForm({...form, position: e.target.value})} placeholder="Senior Analyst..." />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Monthly Salary ($)</label>
            <input className="form-input" type="number" value={form.salary} onChange={(e) => setForm({...form, salary: Number(e.target.value)})} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Hire Date</label>
            <input className="form-input" type="date" value={form.hireDate} onChange={(e) => setForm({...form, hireDate: e.target.value})} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
