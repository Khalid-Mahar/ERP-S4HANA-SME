import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Warehouses from './pages/Warehouses';
import Customers from './pages/Customers';
import SalesOrders from './pages/SalesOrders';
import Vendors from './pages/Vendors';
import PurchaseOrders from './pages/PurchaseOrders';
import Accounts from './pages/Accounts';
import Employees from './pages/Employees';
import Leads from './pages/Leads';
import Users from './pages/Users';
import ModulePlaceholder from './pages/ModulePlaceholder';
import React from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth();
  
  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#4f46e5] border-r-transparent" />
        <p className="text-[#64748b] font-bold animate-pulse">Initializing ERP S/4HANA...</p>
      </div>
    </div>
  );
  
  if (!token) return <Navigate to="/login" />;
  
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/warehouse" element={<ProtectedRoute><Warehouses /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute><SalesOrders /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/purchase" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute><Vendors /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
            <Route path="/hr" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
            <Route path="/crm" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
