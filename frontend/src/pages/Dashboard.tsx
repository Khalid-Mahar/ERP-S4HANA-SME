import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  DollarSign,
  BookOpen,
  AlertTriangle,
  ClipboardList,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Boxes,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import React from 'react';

const fmtMoney = (n: any) => `$${Number(n || 0).toLocaleString()}`;

const colorMap: Record<string, { bg: string; border: string; text: string; soft: string }> = {
  indigo: { bg: 'bg-indigo-600', border: 'border-indigo-200', text: 'text-indigo-700', soft: 'bg-indigo-50' },
  emerald: { bg: 'bg-emerald-600', border: 'border-emerald-200', text: 'text-emerald-700', soft: 'bg-emerald-50' },
  orange: { bg: 'bg-orange-600', border: 'border-orange-200', text: 'text-orange-700', soft: 'bg-orange-50' },
  red: { bg: 'bg-red-600', border: 'border-red-200', text: 'text-red-700', soft: 'bg-red-50' },
  blue: { bg: 'bg-blue-600', border: 'border-blue-200', text: 'text-blue-700', soft: 'bg-blue-50' },
  slate: { bg: 'bg-slate-700', border: 'border-slate-200', text: 'text-slate-700', soft: 'bg-slate-50' },
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const c = colorMap[color] || colorMap.indigo;
  const pts = useMemo(() => {
    const w = 120;
    const h = 28;
    if (!values || values.length === 0) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return values
      .map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * w;
        const y = h - ((v - min) / span) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [values]);

  return (
    <svg width="120" height="28" viewBox="0 0 120 28">
      <polyline fill="none" strokeWidth="2.5" stroke="currentColor" className={c.text} points={pts} />
    </svg>
  );
}

function KPI({
  title,
  value,
  trend,
  icon,
  color = 'indigo',
  actionLabel,
  onAction,
  sparkline,
}: {
  title: string;
  value: string;
  trend?: { value: number; label: string };
  icon: React.ReactNode;
  color?: keyof typeof colorMap;
  actionLabel?: string;
  onAction?: () => void;
  sparkline?: number[];
}) {
  const c = colorMap[color] || colorMap.indigo;
  return (
    <div className={`bg-white border ${c.border} rounded-2xl p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-[#0f172a]">{title}</p>
          <p className="text-3xl font-black text-[#0f172a] mt-2">{value}</p>
          {trend && (
            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-black ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.value >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(trend.value)}% <span className="text-[#64748b] font-bold">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`w-11 h-11 ${c.soft} rounded-2xl flex items-center justify-center ${c.text}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        {sparkline ? <Sparkline values={sparkline} color={String(color)} /> : <div />}
        {actionLabel && (
          <button onClick={onAction} className={`px-4 py-2 rounded-xl text-xs font-black text-white ${c.bg}`}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function BarComboChart({ series }: { series: Array<{ month: string; revenue: number; orders: number }> }) {
  const maxRev = Math.max(...series.map((s) => s.revenue), 1);
  const maxOrders = Math.max(...series.map((s) => s.orders), 1);
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 h-56">
        {series.map((s) => (
          <div key={s.month} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex items-end justify-center gap-1 h-48">
              <div
                className="w-[46%] bg-indigo-500 rounded-t-lg"
                style={{ height: `${(s.revenue / maxRev) * 100}%` }}
              />
              <div
                className="w-[46%] bg-blue-300 rounded-t-lg"
                style={{ height: `${(s.orders / maxOrders) * 100}%` }}
              />
            </div>
            <div className="text-[10px] font-black text-[#64748b] uppercase">{s.month}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-[11px] font-black text-[#64748b]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-indigo-500" /> Revenue
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-blue-300" /> Orders
        </div>
      </div>
    </div>
  );
}

function Donut({ criticalLow, reorderSoon, inStock }: { criticalLow: number; reorderSoon: number; inStock: number }) {
  const total = Math.max(criticalLow + reorderSoon + inStock, 1);
  const seg = [
    { v: criticalLow, c: '#ef4444' },
    { v: reorderSoon, c: '#f59e0b' },
    { v: inStock, c: '#22c55e' },
  ];
  let acc = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width="170" height="170" viewBox="0 0 42 42" className="shrink-0">
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="6" />
        {seg.map((s, i) => {
          const pct = (s.v / total) * 100;
          const dash = `${pct} ${100 - pct}`;
          const offset = 25 - acc;
          acc += pct;
          return (
            <circle
              key={i}
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={s.c}
              strokeWidth="6"
              strokeDasharray={dash}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <div className="space-y-2">
        <Legend color="bg-red-500" label={`Critical Low (${criticalLow})`} />
        <Legend color="bg-amber-500" label={`Reorder Soon (${reorderSoon})`} />
        <Legend color="bg-green-500" label={`In Stock (${inStock})`} />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-[#0f172a]">
      <span className={`w-3 h-3 rounded-full ${color}`} />
      {label}
    </div>
  );
}

function ActivityIcon({ module }: { module: string }) {
  if (module === 'SALES') return <ShoppingCart size={16} className="text-indigo-600" />;
  if (module === 'PURCHASE') return <ClipboardList size={16} className="text-blue-600" />;
  if (module === 'FINANCE') return <DollarSign size={16} className="text-emerald-600" />;
  if (module === 'INVENTORY') return <Boxes size={16} className="text-orange-600" />;
  return <Activity size={16} className="text-slate-600" />;
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const role = (user?.role || 'USER') as string;
  const fast = 5000;
  const slow = 15000;

  const { data: salesSummaryRes } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => api.get<any>('/sales/orders/summary'),
    retry: false,
    enabled: ['ADMIN', 'MANAGER', 'SALES_MANAGER'].includes(role),
    refetchInterval: fast,
    refetchOnWindowFocus: true,
  });

  const { data: pendingPoRes } = useQuery({
    queryKey: ['pending-pos'],
    queryFn: () => api.get<any>('/purchase/kpi/pending-pos'),
    retry: false,
    enabled: ['ADMIN', 'MANAGER', 'WAREHOUSE_HEAD', 'CFO'].includes(role),
    refetchInterval: fast,
    refetchOnWindowFocus: true,
  });

  const { data: lowStockRes } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => api.get<any>('/inventory/items/low-stock'),
    retry: false,
    enabled: ['ADMIN', 'MANAGER', 'WAREHOUSE_HEAD', 'CFO'].includes(role),
    refetchInterval: fast,
    refetchOnWindowFocus: true,
  });

  const { data: netProfitRes } = useQuery({
    queryKey: ['net-profit'],
    queryFn: () => api.get<any>('/finance/kpi/net-profit'),
    retry: false,
    enabled: ['ADMIN', 'MANAGER', 'CFO'].includes(role),
    refetchInterval: slow,
    refetchOnWindowFocus: true,
  });

  const { data: monthlyRevenueRes } = useQuery({
    queryKey: ['monthly-revenue'],
    queryFn: () => api.get<any[]>('/sales/analytics/monthly-revenue', { months: 6 }),
    retry: false,
    enabled: ['ADMIN', 'MANAGER', 'SALES_MANAGER', 'CFO'].includes(role),
    refetchInterval: slow,
    refetchOnWindowFocus: true,
  });

  const { data: invStatusRes } = useQuery({
    queryKey: ['inventory-status'],
    queryFn: () => api.get<any>('/inventory/kpi/status-breakdown'),
    retry: false,
    enabled: ['ADMIN', 'MANAGER', 'WAREHOUSE_HEAD', 'CFO'].includes(role),
    refetchInterval: fast,
    refetchOnWindowFocus: true,
  });

  const { data: topProductsRes } = useQuery({
    queryKey: ['top-products'],
    queryFn: () => api.get<any[]>('/sales/analytics/top-products'),
    retry: false,
    enabled: ['ADMIN', 'MANAGER', 'SALES_MANAGER', 'CFO'].includes(role),
    refetchInterval: slow,
    refetchOnWindowFocus: true,
  });

  const { data: trialBalanceRes } = useQuery({
    queryKey: ['trial-balance'],
    queryFn: () => api.get<any>('/finance/reports/trial-balance'),
    retry: false,
    enabled: ['ADMIN', 'MANAGER', 'CFO'].includes(role),
    refetchInterval: slow,
    refetchOnWindowFocus: true,
  });

  const { data: recentRes } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => api.get<any[]>('/audit/recent', { limit: 6 }),
    retry: false,
    enabled: !!user,
    refetchInterval: fast,
    refetchOnWindowFocus: true,
  });

  const salesSummary = salesSummaryRes?.data || { totalRevenue: 0, totalOrders: 0, pendingOrders: 0 };
  const pendingPos = pendingPoRes?.data?.value ?? 0;
  const lowStock = lowStockRes?.data || [];
  const netProfit = netProfitRes?.data?.value ?? 0;
  const monthly = monthlyRevenueRes?.data || [];
  const invStatus = invStatusRes?.data || { criticalLow: 0, reorderSoon: 0, inStock: 0 };
  const topProducts = topProductsRes?.data || [];
  const trialBalance = trialBalanceRes?.data || { accounts: [] };
  const recent = recentRes?.data || [];

  const getBalanceByCode = (code: string) => {
    const row = (trialBalance.accounts || []).find((a: any) => a.code === code);
    return row ? Number(row.balance) : 0;
  };

  const ar = getBalanceByCode('1100');
  const ap = getBalanceByCode('2000');
  const inventoryAsset = getBalanceByCode('1200');

  type KPIModel = {
    title: string;
    value: string;
    trend?: { value: number; label: string };
    icon: React.ReactNode;
    color: keyof typeof colorMap;
    actionLabel?: string;
    onAction?: () => void;
    sparkline?: number[];
  };

  const kpis: KPIModel[] = (() => {
    if (role === 'CFO') {
      return [
        {
          title: 'Net Profit',
          value: fmtMoney(netProfit),
          trend: { value: 8, label: 'Increase' },
          icon: <TrendingUp size={20} />,
          color: 'emerald' as const,
          actionLabel: 'View P&L',
          onAction: () => nav('/finance'),
          sparkline: monthly.map((m: any) => Number(m.revenue || 0)),
        },
        {
          title: 'Accounts Receivable',
          value: fmtMoney(ar),
          icon: <BookOpen size={20} />,
          color: 'indigo' as const,
          actionLabel: 'View Ledger',
          onAction: () => nav('/finance'),
          sparkline: [ar * 0.8, ar * 0.9, ar * 0.85, ar],
        },
        {
          title: 'Accounts Payable',
          value: fmtMoney(Math.abs(ap)),
          icon: <ClipboardList size={20} />,
          color: 'orange' as const,
          actionLabel: 'Review POs',
          onAction: () => nav('/purchase'),
          sparkline: [Math.abs(ap) * 0.6, Math.abs(ap) * 0.8, Math.abs(ap) * 0.75, Math.abs(ap)],
        },
        {
          title: 'Inventory Value',
          value: fmtMoney(inventoryAsset),
          icon: <Package size={20} />,
          color: 'blue' as const,
          actionLabel: 'View Items',
          onAction: () => nav('/inventory'),
          sparkline: [inventoryAsset * 0.9, inventoryAsset, inventoryAsset * 1.05, inventoryAsset],
        },
      ];
    }

    if (role === 'WAREHOUSE_HEAD') {
      return [
        {
          title: 'Low Stock Alerts',
          value: String(lowStock.length),
          icon: <AlertTriangle size={20} />,
          color: 'red' as const,
          actionLabel: 'View Items',
          onAction: () => nav('/inventory'),
          sparkline: [6, 5, 7, lowStock.length],
        },
        {
          title: 'Pending POs',
          value: String(pendingPos),
          icon: <ClipboardList size={20} />,
          color: 'orange' as const,
          actionLabel: 'Review Orders',
          onAction: () => nav('/purchase'),
          sparkline: [pendingPos + 2, pendingPos + 1, pendingPos, pendingPos],
        },
        {
          title: 'In Stock Items',
          value: String(invStatus.inStock || 0),
          icon: <Boxes size={20} />,
          color: 'emerald' as const,
          actionLabel: 'Warehouses',
          onAction: () => nav('/warehouse'),
          sparkline: [invStatus.inStock - 2, invStatus.inStock - 1, invStatus.inStock, invStatus.inStock],
        },
        {
          title: 'Reorder Soon',
          value: String(invStatus.reorderSoon || 0),
          icon: <Package size={20} />,
          color: 'blue' as const,
          actionLabel: 'Open Report',
          onAction: () => nav('/inventory'),
          sparkline: [invStatus.reorderSoon + 1, invStatus.reorderSoon, invStatus.reorderSoon + 2, invStatus.reorderSoon],
        },
      ];
    }

    if (role === 'SALES_MANAGER') {
      return [
        {
          title: 'Total Sales',
          value: fmtMoney(salesSummary.totalRevenue),
          trend: { value: 12, label: 'This Month' },
          icon: <TrendingUp size={20} />,
          color: 'indigo' as const,
          actionLabel: 'View Orders',
          onAction: () => nav('/sales'),
          sparkline: monthly.map((m: any) => Number(m.revenue || 0)),
        },
        {
          title: 'Orders',
          value: String(salesSummary.totalOrders),
          icon: <ShoppingCart size={20} />,
          color: 'blue' as const,
          actionLabel: 'Manage Orders',
          onAction: () => nav('/sales'),
          sparkline: monthly.map((m: any) => Number(m.orders || 0)),
        },
        {
          title: 'Pending Orders',
          value: String(salesSummary.pendingOrders),
          icon: <ClipboardList size={20} />,
          color: 'orange' as const,
          actionLabel: 'Review',
          onAction: () => nav('/sales'),
          sparkline: [salesSummary.pendingOrders + 2, salesSummary.pendingOrders + 1, salesSummary.pendingOrders, salesSummary.pendingOrders],
        },
        {
          title: 'Top Products',
          value: String(topProducts.length),
          icon: <Package size={20} />,
          color: 'emerald' as const,
          actionLabel: 'Customers',
          onAction: () => nav('/customers'),
          sparkline: [2, 3, 4, topProducts.length],
        },
      ];
    }

    return [
      {
        title: 'Total Sales',
        value: fmtMoney(salesSummary.totalRevenue),
        trend: { value: 12, label: 'This Month' },
        icon: <TrendingUp size={20} />,
        color: 'indigo' as const,
        actionLabel: 'View Orders',
        onAction: () => nav('/sales'),
        sparkline: monthly.map((m: any) => Number(m.revenue || 0)),
      },
      {
        title: 'Pending POs',
        value: String(pendingPos),
        icon: <ClipboardList size={20} />,
        color: 'orange' as const,
        actionLabel: 'Review Orders',
        onAction: () => nav('/purchase'),
        sparkline: [pendingPos + 2, pendingPos + 1, pendingPos, pendingPos],
      },
      {
        title: 'Low Stock Alerts',
        value: String(lowStock.length),
        icon: <AlertTriangle size={20} />,
        color: 'red' as const,
        actionLabel: 'View Items',
        onAction: () => nav('/inventory'),
        sparkline: [6, 5, 7, lowStock.length],
      },
      {
        title: 'Net Profit',
        value: fmtMoney(netProfit),
        trend: { value: 8, label: 'Increase' },
        icon: <DollarSign size={20} />,
        color: 'emerald' as const,
        actionLabel: 'Open Finance',
        onAction: () => nav('/finance'),
        sparkline: monthly.map((m: any) => Number(m.revenue || 0)),
      },
    ];
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KPI
            key={k.title}
            title={k.title}
            value={k.value}
            trend={k.trend}
            icon={k.icon}
            color={k.color as any}
            actionLabel={k.actionLabel}
            onAction={k.onAction}
            sparkline={k.sparkline}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">Sales Overview</h3>
            <button onClick={() => nav('/sales')} className="text-xs font-black text-indigo-600 hover:underline">
              View Analytics
            </button>
          </div>
          <div className="p-6">
            <BarComboChart series={monthly.length ? monthly : [{ month: 'Jan', revenue: 0, orders: 0 }]} />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">Recent Activities</h3>
            <button onClick={() => nav('/dashboard')} className="text-xs font-black text-indigo-600 hover:underline">
              Refresh
            </button>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {recent.length ? (
              recent.slice(0, 6).map((a: any) => (
                <div key={a.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                    <ActivityIcon module={a.module} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#0f172a] truncate">
                      {a.module}: {a.action}
                    </p>
                    <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-xs font-bold text-[#94a3b8]">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">Inventory Status</h3>
            <button onClick={() => nav('/inventory')} className="text-xs font-black text-indigo-600 hover:underline">
              View Items
            </button>
          </div>
          <div className="p-6">
            <Donut criticalLow={invStatus.criticalLow || 0} reorderSoon={invStatus.reorderSoon || 0} inStock={invStatus.inStock || 0} />
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">Top Products</h3>
            <button onClick={() => nav('/sales')} className="text-xs font-black text-indigo-600 hover:underline">
              Sales
            </button>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {topProducts.length ? (
              topProducts.slice(0, 5).map((p: any, idx: number) => (
                <div key={idx} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-700 font-black text-xs">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#0f172a] truncate">{p.name || '—'}</p>
                      <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Revenue</p>
                    </div>
                  </div>
                  <div className="text-xs font-black text-[#0f172a]">{fmtMoney(p.value)}</div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-xs font-bold text-[#94a3b8]">No data yet</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">Financial Summary</h3>
            <button onClick={() => nav('/finance')} className="text-xs font-black text-indigo-600 hover:underline">
              View Finance
            </button>
          </div>
          <div className="p-6 space-y-3">
            <Row label="Accounts Receivable" value={fmtMoney(ar)} />
            <Row label="Accounts Payable" value={fmtMoney(Math.abs(ap))} />
            <Row label="Inventory Value" value={fmtMoney(inventoryAsset)} />
            <div className="pt-2">
              <button onClick={() => nav('/finance')} className="w-full px-4 py-2 rounded-xl text-xs font-black text-white bg-indigo-600">
                Open Ledger
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs font-black text-[#0f172a]">{label}</div>
      <div className="text-xs font-black text-indigo-700">{value}</div>
    </div>
  );
}
