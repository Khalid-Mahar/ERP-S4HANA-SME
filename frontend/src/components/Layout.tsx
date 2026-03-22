import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  ShoppingCart, 
  Truck, 
  Users, 
  Briefcase, 
  TrendingUp, 
  UserCircle,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  Search,
  BookOpen,
  DollarSign,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import dashboardConfig from '../dashboard_config.json';

const IconMap: Record<string, any> = {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  Truck,
  Users,
  Briefcase,
  TrendingUp,
  UserCircle,
  BookOpen,
  DollarSign,
  FileText
};

const SidebarItem: React.FC<{ to: string; icon: string; label: string; active?: boolean }> = ({ to, icon, label, active }) => {
  const IconComponent = IconMap[icon] || LayoutDashboard;
  return (
    <Link
      to={to}
      className={`flex items-center justify-between group px-3 py-2.5 rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-[#4f46e5] text-white shadow-lg shadow-indigo-200' 
          : 'text-[#cbd5e1] hover:bg-[#1e293b] hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`${active ? 'text-white' : 'text-[#64748b] group-hover:text-indigo-400'} transition-colors`}>
          <IconComponent size={20} />
        </div>
        <span className="font-medium text-sm">{label}</span>
      </div>
      {active && <ChevronRight size={14} className="text-white/70" />}
    </Link>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();

  const roleConfig = (dashboardConfig.roles as any)[user?.role || 'USER'] || dashboardConfig.roles.USER;
  const menuItems = roleConfig.sidebar_links;

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-0 -ml-64'
        } bg-[#0f172a] text-white transition-all duration-300 flex flex-col z-30 shadow-2xl`}
      >
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">ERP S/4HANA</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-3 py-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Main Menu</p>
          {menuItems.map((item: any) => (
            <SidebarItem 
              key={item.path} 
              to={item.path}
              icon={item.icon}
              label={item.title} 
              active={location.pathname === item.path} 
            />
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="bg-[#1e293b] rounded-2xl p-3 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 font-bold">
                {user?.firstName?.[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-[#64748b] uppercase font-bold">{user?.role}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-[#64748b] rounded-lg transition-all text-xs font-bold"
            >
              <LogOut size={14} />
              Logout System
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 hover:bg-gray-100 rounded-xl text-[#64748b] transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl w-64">
              <Search size={16} className="text-[#64748b]" />
              <input type="text" placeholder="Global search..." className="bg-transparent border-none focus:ring-0 text-sm w-full" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-[#64748b] hover:bg-gray-100 rounded-xl relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-[#e2e8f0] mx-2"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-[#0f172a]">{user?.companyName}</p>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-tight">System Online</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 border-2 border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                {user?.firstName?.[0]}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">
                {menuItems.find((m: any) => m.path === location.pathname)?.title || 'Overview'}
              </h1>
              <p className="text-[#64748b] text-sm mt-1">Manage your enterprise resources and business operations.</p>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
