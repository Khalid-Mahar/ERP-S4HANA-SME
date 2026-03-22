import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, ShoppingCart, Truck, Users, 
  ArrowUpRight, ArrowDownRight, Clock, Package 
} from 'lucide-react';
import { salesApi, inventoryApi } from '../api';
import React from 'react';

const StatCard = ({ label, value, icon, trend, color }: any) => (
  <div className="card group hover:border-[#4f46e5] transition-all duration-300">
    <div className="flex items-start justify-between">
      <div className={`p-3 rounded-2xl ${color} text-white shadow-lg`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-bold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-xs font-bold text-[#64748b] uppercase tracking-widest">{label}</p>
      <h3 className="text-2xl font-black text-[#0f172a] mt-1">{value}</h3>
    </div>
  </div>
);

export default function Dashboard() {
  const { data: salesSummary } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: () => salesApi.getSummary(),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => inventoryApi.getLowStock(),
  });

  const stats = [
    { label: 'Total Revenue', value: `$${Number(salesSummary?.data?.totalRevenue || 0).toLocaleString()}`, icon: <TrendingUp size={20} />, trend: +12.5, color: 'bg-[#4f46e5]' },
    { label: 'Sales Orders', value: salesSummary?.data?.totalOrders || 0, icon: <ShoppingCart size={20} />, trend: +8.2, color: 'bg-[#0284c7]' },
    { label: 'Pending Orders', value: salesSummary?.data?.pendingOrders || 0, icon: <Clock size={20} />, trend: -3.1, color: 'bg-[#d97706]' },
    { label: 'Active Customers', value: '1,284', icon: <Users size={20} />, trend: +5.4, color: 'bg-[#16a34a]' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => <StatCard key={i} {...stat} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">Business Overview</h3>
            <button className="text-xs font-bold text-[#4f46e5] hover:underline">View Analytics</button>
          </div>
          <div className="p-6 h-[300px] flex items-center justify-center text-[#64748b] bg-gray-50/50">
            <div className="text-center">
              <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">Real-time charts will appear here</p>
              <p className="text-xs mt-1">Integration with Chart.js pending data population</p>
            </div>
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="card !p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e2e8f0] bg-red-50/50">
            <h3 className="text-sm font-black text-red-700 uppercase tracking-wider flex items-center gap-2">
              <Package size={16} /> Critical Stock Alerts
            </h3>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {lowStock?.data && lowStock.data.length > 0 ? (
              lowStock.data.slice(0, 6).map((item: any) => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 font-bold text-xs">
                      {item.sku.slice(-2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0f172a] truncate w-32">{item.name}</p>
                      <p className="text-[10px] font-bold text-[#64748b] uppercase">{item.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-red-600">{item.totalStock} {item.uom}</p>
                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase">Min: {item.minStockLevel}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-[#64748b]">
                <Package size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs font-bold">All stock levels are optimal</p>
              </div>
            )}
          </div>
          {lowStock?.data && lowStock.data.length > 0 && (
            <div className="p-4 bg-gray-50 border-t border-[#e2e8f0] text-center">
              <button className="text-xs font-black text-[#4f46e5] hover:underline uppercase tracking-widest">
                Manage Replenishment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
