import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import DashboardLayout from './components/layout/DashboardLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Module pages
import DashboardPage from './pages/dashboard/DashboardPage';
import ItemsPage from './pages/inventory/ItemsPage';
import StockMovementsPage from './pages/inventory/StockMovementsPage';
import WarehousesPage from './pages/warehouse/WarehousesPage';
import CustomersPage from './pages/sales/CustomersPage';
import SalesOrdersPage from './pages/sales/SalesOrdersPage';
import VendorsPage from './pages/purchase/VendorsPage';
import PurchaseOrdersPage from './pages/purchase/PurchaseOrdersPage';
import AccountsPage from './pages/finance/AccountsPage';
import TransactionsPage from './pages/finance/TransactionsPage';
import FinanceReportsPage from './pages/finance/FinanceReportsPage';
import EmployeesPage from './pages/hr/EmployeesPage';
import AttendancePage from './pages/hr/AttendancePage';
import LeadsPage from './pages/crm/LeadsPage';
import InteractionsPage from './pages/crm/InteractionsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected routes */}
        <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Inventory */}
          <Route path="inventory/items" element={<ItemsPage />} />
          <Route path="inventory/movements" element={<StockMovementsPage />} />

          {/* Warehouse */}
          <Route path="warehouse" element={<WarehousesPage />} />

          {/* Sales */}
          <Route path="sales/customers" element={<CustomersPage />} />
          <Route path="sales/orders" element={<SalesOrdersPage />} />

          {/* Purchase */}
          <Route path="purchase/vendors" element={<VendorsPage />} />
          <Route path="purchase/orders" element={<PurchaseOrdersPage />} />

          {/* Finance */}
          <Route path="finance/accounts" element={<AccountsPage />} />
          <Route path="finance/transactions" element={<TransactionsPage />} />
          <Route path="finance/reports" element={<FinanceReportsPage />} />

          {/* HR */}
          <Route path="hr/employees" element={<EmployeesPage />} />
          <Route path="hr/attendance" element={<AttendancePage />} />

          {/* CRM */}
          <Route path="crm/leads" element={<LeadsPage />} />
          <Route path="crm/interactions" element={<InteractionsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
