import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, Truck,
  DollarSign, Users, UserSquare2, BarChart3, ChevronDown,
  ChevronRight, LogOut, Menu, X, Bell, Settings, Building2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { label: string; path: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/dashboard' },
  {
    label: 'Inventory',
    icon: <Package size={18} />,
    children: [
      { label: 'Items', path: '/inventory/items' },
      { label: 'Stock Movements', path: '/inventory/movements' },
    ],
  },
  {
    label: 'Warehouse',
    icon: <Warehouse size={18} />,
    children: [
      { label: 'Warehouses', path: '/warehouse' },
    ],
  },
  {
    label: 'Sales',
    icon: <ShoppingCart size={18} />,
    children: [
      { label: 'Customers', path: '/sales/customers' },
      { label: 'Sales Orders', path: '/sales/orders' },
    ],
  },
  {
    label: 'Purchase',
    icon: <Truck size={18} />,
    children: [
      { label: 'Vendors', path: '/purchase/vendors' },
      { label: 'Purchase Orders', path: '/purchase/orders' },
    ],
  },
  {
    label: 'Finance',
    icon: <DollarSign size={18} />,
    children: [
      { label: 'Chart of Accounts', path: '/finance/accounts' },
      { label: 'Transactions', path: '/finance/transactions' },
      { label: 'Reports', path: '/finance/reports' },
    ],
  },
  {
    label: 'HR',
    icon: <Users size={18} />,
    children: [
      { label: 'Employees', path: '/hr/employees' },
      { label: 'Attendance', path: '/hr/attendance' },
    ],
  },
  {
    label: 'CRM',
    icon: <UserSquare2 size={18} />,
    children: [
      { label: 'Leads', path: '/crm/leads' },
      { label: 'Interactions', path: '/crm/interactions' },
    ],
  },
];

function NavGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);

  if (item.path) {
    return (
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          `nav-item ${isActive ? 'active' : ''}`
        }
        style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 16px', borderRadius: '8px', cursor: 'pointer',
          textDecoration: 'none', fontSize: '13.5px', fontWeight: 500,
          color: isActive ? '#fff' : 'var(--color-sidebar-text)',
          background: isActive ? 'var(--color-sidebar-active)' : 'transparent',
          transition: 'all 0.15s',
        })}
      >
        {item.icon}
        {item.label}
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 16px', borderRadius: '8px', cursor: 'pointer',
          background: 'transparent', border: 'none', width: '100%',
          color: 'var(--color-sidebar-text)', fontSize: '13.5px', fontWeight: 500,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {item.icon}
        <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div style={{ paddingLeft: '28px', marginTop: '2px' }}>
          {item.children?.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              style={({ isActive }) => ({
                display: 'block', padding: '7px 12px', borderRadius: '6px',
                textDecoration: 'none', fontSize: '13px',
                color: isActive ? '#fff' : '#94a3b8',
                background: isActive ? 'rgba(79,70,229,0.7)' : 'transparent',
                marginBottom: '1px', transition: 'all 0.15s',
              })}
              onMouseEnter={(e) => {
                if (!(e.currentTarget.style.background.includes('79,70,229')))
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                if (!(e.currentTarget.style.background.includes('79,70,229')))
                  e.currentTarget.style.background = 'transparent';
              }}
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '260px' : '0',
        minWidth: sidebarOpen ? '260px' : '0',
        background: 'var(--color-sidebar-bg)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', transition: 'width 0.25s, min-width 0.25s',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '10px', minHeight: '60px',
        }}>
          <div style={{
            width: 32, height: 32, background: 'var(--color-primary)',
            borderRadius: '8px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            <Building2 size={18} color="#fff" />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap' }}>
              ERP System
            </div>
            <div style={{ color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>
              Enterprise Suite
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_ITEMS.map((item) => (
            <NavGroup key={item.label} item={item} />
          ))}
        </nav>

        {/* User footer */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--color-primary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ color: '#64748b', fontSize: '11px' }}>{user?.role}</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '6px' }}
            title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top header */}
        <header style={{
          height: '60px', background: '#fff', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: '12px',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: '4px' }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div style={{ flex: 1 }} />
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', position: 'relative', padding: '4px' }}>
            <Bell size={18} />
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
            <Settings size={18} />
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
