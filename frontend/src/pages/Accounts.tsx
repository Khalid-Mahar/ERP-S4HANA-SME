import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wallet, FileText, ChevronRight, Hash, Type, ArrowRight, ArrowLeftRight, PieChart } from 'lucide-react';
import { financeApi } from '../api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import React from 'react';

const EMPTY_FORM = { code: '', name: '', type: 'ASSET', parentId: '' };

export default function AccountsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: accountsResult, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => financeApi.getAccounts(),
  });

  const { data: ledgerResult, isLoading: ledgerLoading } = useQuery({
    queryKey: ['ledger', selectedAccount?.id],
    queryFn: () => financeApi.getTransactions({ accountId: selectedAccount?.id, pageSize: 50 }),
    enabled: !!selectedAccount && ledgerModalOpen,
  });

  const { data: trialBalanceResult } = useQuery({
    queryKey: ['trial-balance'],
    queryFn: () => financeApi.getTrialBalance(),
    enabled: reportModalOpen,
  });

  const trialBalance = (trialBalanceResult as any)?.data || { accounts: [], totals: {} };
  const transactions = (ledgerResult as any)?.data || [];
  const accounts = (accountsResult as any)?.data || [];

  const handleViewLedger = (acc: any) => {
     setSelectedAccount(acc);
     setLedgerModalOpen(true);
   };

   const mutation = useMutation({
    mutationFn: (d: any) => financeApi.createAccount(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      toast.success('Account added to Chart of Accounts');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error creating account'),
  });

  const columns = [
    { 
      key: 'code', 
      header: 'Account Code', 
      render: (r: any) => <span className="font-bold text-[#4f46e5] tracking-widest">{r.code}</span> 
    },
    { 
      key: 'name', 
      header: 'Account Name', 
      render: (r: any) => (
        <div className="flex items-center gap-2">
          <Wallet size={14} className="text-[#94a3b8]" />
          <span className="font-bold text-[#0f172a]">{r.name}</span>
        </div>
      )
    },
    { 
      key: 'type', 
      header: 'Category', 
      render: (r: any) => {
        const colors: any = { ASSET: 'badge-info', LIABILITY: 'badge-warning', EQUITY: 'badge-default', REVENUE: 'badge-success', EXPENSE: 'badge-danger' };
        return <span className={`badge ${colors[r.type]}`}>{r.type}</span>;
      }
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (r: any) => (
        <button 
          onClick={() => handleViewLedger(r)}
          className="text-[#4f46e5] font-black text-[11px] uppercase tracking-wider hover:underline"
        >
          View Ledger
        </button>
      )
    }
  ];

   const flatAccounts = (accountsList: any[] = []): any[] => {
    let result: any[] = [];
    accountsList.forEach(acc => {
      result.push(acc);
      if (acc.children?.length > 0) result = [...result, ...flatAccounts(acc.children)];
    });
    return result;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">Chart of Accounts</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => setReportModalOpen(true)}>
            <FileText size={18} /> Financial Reports
          </button>
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
            <Plus size={18} /> New Account
          </button>
        </div>
      </div>

      <DataTable
        data={flatAccounts(accounts)}
        columns={columns}
        loading={isLoading}
      />

      <Modal
        open={ledgerModalOpen}
        onClose={() => setLedgerModalOpen(false)}
        title={`Account Ledger: ${selectedAccount?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#f8fafc] p-6 rounded-3xl border border-[#e2e8f0]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#4f46e5]">
                <ArrowLeftRight size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest">Account Balance</p>
                <p className="text-2xl font-black text-[#0f172a]">
                  ${transactions.reduce((s: number, t: any) => {
                    const line = t.lines.find((l: any) => l.debitAccountId === selectedAccount?.id || l.creditAccountId === selectedAccount?.id);
                    return s + (line?.debitAccountId === selectedAccount?.id ? Number(line.amount) : -Number(line.amount));
                  }, 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="badge badge-info">{selectedAccount?.type}</span>
              <p className="text-xs font-bold text-[#64748b] mt-1">{selectedAccount?.code}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e2e8f0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <tr>
                  <th className="px-4 py-3 font-black text-[#0f172a] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 font-black text-[#0f172a] uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 font-black text-[#0f172a] uppercase tracking-wider text-right">Debit</th>
                  <th className="px-4 py-3 font-black text-[#0f172a] uppercase tracking-wider text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {ledgerLoading ? (
                  <tr><td colSpan={4} className="text-center py-8">Loading transactions...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-[#94a3b8]">No transactions found for this account</td></tr>
                ) : transactions.map((t: any, i: number) => {
                  const line = t.lines.find((l: any) => l.debitAccountId === selectedAccount?.id || l.creditAccountId === selectedAccount?.id);
                  return (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-[#64748b] font-medium">{new Date(t.transactionDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-bold text-[#0f172a]">{t.description}</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-600">
                        {line?.debitAccountId === selectedAccount?.id ? `$${Number(line.amount).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-red-600">
                        {line?.creditAccountId === selectedAccount?.id ? `$${Number(line.amount).toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Financial Statements & Reports"
        size="lg"
      >
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="card !bg-[#0f172a] !border-none p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500 rounded-xl"><PieChart size={20} /></div>
                <h3 className="font-black uppercase tracking-widest text-xs">Trial Balance Summary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-indigo-200">Total Debits</span>
                  <span className="font-black">${Number(trialBalance.totals?.debits || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/10 pb-3">
                  <span className="text-indigo-200">Total Credits</span>
                  <span className="font-black">${Number(trialBalance.totals?.credits || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest">Status</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${trialBalance.isBalanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {trialBalance.isBalanced ? 'Balanced' : 'Unbalanced'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em]">Quick Actions</h4>
              <div className="grid grid-cols-1 gap-2">
                <button className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-[#e2e8f0] hover:border-[#4f46e5] group transition-all">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-[#4f46e5]" />
                    <span className="text-xs font-bold text-[#0f172a]">Download Income Statement</span>
                  </div>
                  <ArrowRight size={14} className="text-[#94a3b8] group-hover:text-[#4f46e5]" />
                </button>
                <button className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-[#e2e8f0] hover:border-[#4f46e5] group transition-all">
                  <div className="flex items-center gap-3">
                    <PieChart size={18} className="text-[#4f46e5]" />
                    <span className="text-xs font-bold text-[#0f172a]">Generate Balance Sheet</span>
                  </div>
                  <ArrowRight size={14} className="text-[#94a3b8] group-hover:text-[#4f46e5]" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">Chart of Accounts Health</h3>
             <div className="h-32 bg-[#f8fafc] rounded-3xl border border-[#e2e8f0] flex items-center justify-center">
                <p className="text-xs font-bold text-[#94a3b8] italic">Financial health score and variance analysis will be visible here</p>
             </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Chart of Accounts Registration"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
              Create Account
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Account Code</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
              <input className="form-input !pl-10" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} placeholder="e.g. 1010" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Account Name</label>
            <div className="relative">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
              <input className="form-input !pl-10" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g. Petty Cash" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Account Type</label>
            <select className="form-input" value={form.type} onChange={(e) => setForm({...form, type: e.target.value as any})}>
              <option value="ASSET">ASSET</option>
              <option value="LIABILITY">LIABILITY</option>
              <option value="EQUITY">EQUITY</option>
              <option value="REVENUE">REVENUE</option>
              <option value="EXPENSE">EXPENSE</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
