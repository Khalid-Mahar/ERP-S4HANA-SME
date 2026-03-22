import { api } from './client';

// ── Types ──────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Auth API ───────────────────────────────────────────────────
export const authApi = {
  register: (data: {
    companyName: string; companyCode: string;
    email: string; firstName: string; lastName: string; password: string;
  }) => api.post('/auth/register', data),

  login: (data: { email: string; password: string; companyCode: string }) =>
    api.post<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', data),

  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),

  me: () => api.get<any>('/auth/me'),

  createUser: (data: any) => api.post('/auth/users', data),
};

// ── Inventory API ──────────────────────────────────────────────
export const inventoryApi = {
  // Items
  getItems: (params?: PaginationParams) =>
    api.get<PaginatedResponse<any>>('/inventory/items', params),

  getItem: (id: string) => api.get<any>(`/inventory/items/${id}`),

  createItem: (data: any) => api.post<any>('/inventory/items', data),

  updateItem: (id: string, data: any) => api.put<any>(`/inventory/items/${id}`, data),

  deleteItem: (id: string) => api.delete<any>(`/inventory/items/${id}`),

  getLowStock: () => api.get<any[]>('/inventory/items/low-stock'),

  adjustStock: (itemId: string, data: { warehouseId: string; quantity: number; notes?: string }) =>
    api.patch<any>(`/inventory/items/${itemId}/adjust-stock`, data),

  // Stock
  getStockLevels: (params?: { itemId?: string; warehouseId?: string }) =>
    api.get<any[]>('/inventory/stock', params),

  // Movements
  getMovements: (params?: PaginationParams & { itemId?: string }) =>
    api.get<PaginatedResponse<any>>('/inventory/movements', params),

  recordMovement: (data: any) => api.post<any>('/inventory/movements', data),
};

// ── Warehouse API ──────────────────────────────────────────────
export const warehouseApi = {
  getWarehouses: (params?: PaginationParams) =>
    api.get<PaginatedResponse<any>>('/warehouses', params),

  getWarehouse: (id: string) => api.get<any>(`/warehouses/${id}`),

  createWarehouse: (data: any) => api.post<any>('/warehouses', data),

  updateWarehouse: (id: string, data: any) => api.put<any>(`/warehouses/${id}`, data),

  getBins: (warehouseId: string) => api.get<any[]>(`/warehouses/${warehouseId}/bins`),

  addBin: (warehouseId: string, data: any) =>
    api.post<any>(`/warehouses/${warehouseId}/bins`, data),

  transferStock: (data: any) => api.post<any>('/warehouses/transfer', data),
};

// ── Sales API ──────────────────────────────────────────────────
export const salesApi = {
  // Customers
  getCustomers: (params?: PaginationParams) =>
    api.get<PaginatedResponse<any>>('/sales/customers', params),
  getCustomer: (id: string) => api.get<any>(`/sales/customers/${id}`),
  createCustomer: (data: any) => api.post<any>('/sales/customers', data),
  updateCustomer: (id: string, data: any) => api.put<any>(`/sales/customers/${id}`, data),

  // Orders
  getOrders: (params?: PaginationParams) =>
    api.get<PaginatedResponse<any>>('/sales/orders', params),
  getOrder: (id: string) => api.get<any>(`/sales/orders/${id}`),
  createOrder: (data: any) => api.post<any>('/sales/orders', data),
  updateOrderStatus: (id: string, status: string, warehouseId?: string) =>
    api.patch<any>(
      `/sales/orders/${id}/status${warehouseId ? `?warehouseId=${warehouseId}` : ''}`,
      { status },
    ),
  getSummary: () => api.get<any>('/sales/orders/summary'),
};

// ── Purchase API ───────────────────────────────────────────────
export const purchaseApi = {
  getVendors: (params?: PaginationParams) =>
    api.get<PaginatedResponse<any>>('/purchase/vendors', params),
  getVendor: (id: string) => api.get<any>(`/purchase/vendors/${id}`),
  createVendor: (data: any) => api.post<any>('/purchase/vendors', data),
  updateVendor: (id: string, data: any) => api.put<any>(`/purchase/vendors/${id}`, data),

  getOrders: (params?: PaginationParams) =>
    api.get<PaginatedResponse<any>>('/purchase/orders', params),
  getOrder: (id: string) => api.get<any>(`/purchase/orders/${id}`),
  createOrder: (data: any) => api.post<any>('/purchase/orders', data),
  receiveGoods: (poId: string, data: { warehouseId: string; notes?: string }) =>
    api.post<any>(`/purchase/orders/${poId}/receive`, data),
};

// ── Finance API ────────────────────────────────────────────────
export const financeApi = {
  getAccounts: () => api.get<any[]>('/finance/accounts'),
  createAccount: (data: any) => api.post<any>('/finance/accounts', data),
  updateAccount: (id: string, data: any) => api.put<any>(`/finance/accounts/${id}`, data),

  getTransactions: (params?: PaginationParams) =>
    api.get<PaginatedResponse<any>>('/finance/transactions', params),
  getTransaction: (id: string) => api.get<any>(`/finance/transactions/${id}`),
  createTransaction: (data: any) => api.post<any>('/finance/transactions', data),

  getIncomeStatement: (startDate: string, endDate: string) =>
    api.get<any>('/finance/reports/income-statement', { startDate, endDate }),
  getTrialBalance: () => api.get<any>('/finance/reports/trial-balance'),
};

// ── HR API ─────────────────────────────────────────────────────
export const hrApi = {
  getEmployees: (params?: PaginationParams) =>
    api.get<PaginatedResponse<any>>('/hr/employees', params),
  getEmployee: (id: string) => api.get<any>(`/hr/employees/${id}`),
  createEmployee: (data: any) => api.post<any>('/hr/employees', data),
  updateEmployee: (id: string, data: any) => api.put<any>(`/hr/employees/${id}`, data),
  recordAttendance: (employeeId: string, data: any) =>
    api.post<any>(`/hr/employees/${employeeId}/attendance`, data),
  getAttendanceReport: (month: number, year: number) =>
    api.get<any>('/hr/attendance/report', { month, year }),
  getDepartments: () => api.get<any[]>('/hr/employees/departments'),
};

// ── CRM API ────────────────────────────────────────────────────
export const crmApi = {
  getLeads: (params?: PaginationParams) =>
    api.get<PaginatedResponse<any>>('/crm/leads', params),
  getLead: (id: string) => api.get<any>(`/crm/leads/${id}`),
  createLead: (data: any) => api.post<any>('/crm/leads', data),
  updateLead: (id: string, data: any) => api.put<any>(`/crm/leads/${id}`, data),
  getPipeline: () => api.get<any[]>('/crm/leads/pipeline'),
  createInteraction: (data: any) => api.post<any>('/crm/interactions', data),
  getInteractions: (params?: PaginationParams) =>
    api.get<PaginatedResponse<any>>('/crm/interactions', params),
};
