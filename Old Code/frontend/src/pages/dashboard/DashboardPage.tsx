import { useQuery } from '@tanstack/react-query';
import {
  Package, ShoppingCart, Truck, Users, TrendingUp,
  AlertTriangle, DollarSign, UserSquare2,
} from 'lucide-react';
import { salesApi, inventoryApi, hrApi, crmApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

function StatCard({
  label, value, icon, color, sub,
}: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + '1a' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{sub}</div>}
      </div>
    </div>
  );
}

// Mock chart data — replace with real API calls in production
const salesData = [
  { month: 'Jan', revenue: 42000 }, { month: 'Feb', revenue: 38000 },
  { month: 'Mar', revenue: 55000 }, { month: 'Apr', revenue: 48000 },
  { month: 'May', revenue: 62000 }, { month: 'Jun', revenue: 71000 },
];

const inventoryData = [
  { name: 'Electronics', stock: 340 }, { name: 'Office', stock: 210 },
  { name: 'Furniture', stock: 89 }, { name: 'Consumables', stock: 512 },
];

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: salesSummary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => salesApi.getSummary(),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => inventoryApi.getLowStock(),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => hrApi.getEmployees({ pageSize: 1 }),
  });

  const { data: pipeline } = useQuery({
    queryKey: ['crm-pipeline'],
    queryFn: () => crmApi.getPipeline(),
  });

  const salesData2 = (salesSummary as any)?.data || salesSummary || {};
  const lowStockItems = (lowStock as any)?.data || lowStock || [];
  const employeeCount = (employees as any)?.data?.meta?.total || 0;
  const pipelineData = (pipeline as any)?.data || pipeline || [];
  const openLeads = pipelineData.reduce((s: number, p: any) =>
    ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL'].includes(p.status) ? s + p.count : s, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {user?.firstName} 👋</h1>
          <p className="page-subtitle">Here's what's happening with your business today</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <StatCard
          label="Total Revenue"
          value={`$${Number(salesData2.totalRevenue || 0).toLocaleString()}`}
          icon={<DollarSign size={20} />}
          color="#4f46e5"
          sub="Confirmed orders"
        />
        <StatCard
          label="Active Orders"
          value={salesData2.pendingOrders || 0}
          icon={<ShoppingCart size={20} />}
          color="#0284c7"
          sub="Pending fulfillment"
        />
        <StatCard
          label="Low Stock Alerts"
          value={lowStockItems.length}
          icon={<AlertTriangle size={20} />}
          color="#d97706"
          sub="Items below minimum"
        />
        <StatCard
          label="Employees"
          value={employeeCount}
          icon={<Users size={20} />}
          color="#16a34a"
          sub="Active headcount"
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Revenue chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Revenue Overview</h3>
            <span className="badge badge-success">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`$${v.toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory by category */}
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '20px' }}>Stock by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={inventoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="stock" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Low stock items */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Low Stock Alerts</h3>
            <span className="badge badge-warning">{lowStockItems.length} items</span>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px' }}>
              <Package size={32} />
              <p>All items have sufficient stock</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lowStockItems.slice(0, 5).map((item: any) => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: '#fff7ed', borderRadius: '8px',
                  border: '1px solid #fed7aa',
                }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '13px' }}>{item.name}</div>
                    <div style={{ color: '#92400e', fontSize: '12px' }}>{item.code}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#dc2626', fontWeight: 600, fontSize: '14px' }}>{item.totalStock}</div>
                    <div style={{ color: '#92400e', fontSize: '11px' }}>Min: {item.minStockLevel}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CRM Pipeline */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>CRM Pipeline</h3>
            <span className="badge badge-info">{openLeads} open leads</span>
          </div>
          {pipelineData.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px' }}>
              <UserSquare2 size={32} />
              <p>No leads in pipeline</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pipelineData.map((stage: any) => (
                <div key={stage.status} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: '#f8fafc', borderRadius: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{stage.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span className="badge badge-default">{stage.count} leads</span>
                    <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
                      ${Number(stage.totalValue || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
