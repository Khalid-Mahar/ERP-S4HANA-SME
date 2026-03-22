import { api } from './client';
export { api };

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
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'month' | 'year';
  accountId?: string;
}

export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post<{ access_token: string; user: any }>('/auth/login', data),
  me: () => api.get<any>('/auth/profile'),
};

export const inventoryApi = {
  getItems: (params?: PaginationParams) => api.get<PaginatedResponse<any>>('/inventory/items', params),
  getItem: (id: string) => api.get<any>(`/inventory/items/${id}`),
  createItem: (data: any) => api.post<any>('/inventory/items', data),
  updateItem: (id: string, data: any) => api.put<any>(`/inventory/items/${id}`, data),
  deleteItem: (id: string) => api.delete<any>(`/inventory/items/${id}`),
  getLowStock: () => api.get<any[]>('/inventory/items/low-stock'),
  adjustStock: (itemId: string, data: any) => api.post<any>(`/inventory/items/${itemId}/adjust`, data),
  recordMovement: (data: any) => api.post<any>('/inventory/movements', data),
  getMovements: (params?: PaginationParams & { itemId?: string }) => api.get<PaginatedResponse<any>>('/inventory/movements', params),
  getStockLevels: (params?: { itemId?: string; warehouseId?: string }) => api.get<any[]>('/inventory/stock-levels', params),
  getValuation: () => api.get<any>('/inventory/valuation'),
};

export const warehouseApi = {
  getWarehouses: (params?: PaginationParams) => api.get<PaginatedResponse<any>>('/warehouses', params),
  getWarehouse: (id: string) => api.get<any>(`/warehouses/${id}`),
  createWarehouse: (data: any) => api.post<any>('/warehouses', data),
  updateWarehouse: (id: string, data: any) => api.put<any>(`/warehouses/${id}`, data),
  addBin: (warehouseId: string, data: any) => api.post<any>(`/warehouses/${warehouseId}/bins`, data),
  transferStock: (data: any) => api.post<any>('/warehouses/transfer', data),
};

export const salesApi = {
  getCustomers: (params?: PaginationParams) => api.get<PaginatedResponse<any>>('/sales/customers', params),
  getCustomer: (id: string) => api.get<any>(`/sales/customers/${id}`),
  createCustomer: (data: any) => api.post<any>('/sales/customers', data),
  updateCustomer: (id: string, data: any) => api.put<any>(`/sales/customers/${id}`, data),
  getOrders: (params?: PaginationParams) => api.get<PaginatedResponse<any>>('/sales/orders', params),
  getOrder: (id: string) => api.get<any>(`/sales/orders/${id}`),
  createOrder: (data: any) => api.post<any>('/sales/orders', data),
  updateOrderStatus: (id: string, data: { status: string; warehouseId?: string }) => api.patch<any>(`/sales/orders/${id}/status`, data),
  getSummary: () => api.get<any>('/sales/orders/summary'),
};

export const purchaseApi = {
  getVendors: (params?: PaginationParams) => api.get<PaginatedResponse<any>>('/purchase/vendors', params),
  getVendor: (id: string) => api.get<any>(`/purchase/vendors/${id}`),
  createVendor: (data: any) => api.post<any>('/purchase/vendors', data),
  updateVendor: (id: string, data: any) => api.put<any>(`/purchase/vendors/${id}`, data),
  getOrders: (params?: PaginationParams) => api.get<PaginatedResponse<any>>('/purchase/orders', params),
  getOrder: (id: string) => api.get<any>(`/purchase/orders/${id}`),
  createOrder: (data: any) => api.post<any>('/purchase/orders', data),
  receiveGoods: (poId: string, data: { warehouseId: string; notes?: string }) => api.post<any>(`/purchase/orders/${poId}/receive`, data),
};

export const financeApi = {
  getAccounts: () => api.get<any[]>('/finance/accounts'),
  createAccount: (data: any) => api.post<any>('/finance/accounts', data),
  updateAccount: (id: string, data: any) => api.put<any>(`/finance/accounts/${id}`, data),
  getTransactions: (params?: PaginationParams) => api.get<PaginatedResponse<any>>('/finance/transactions', params),
  getTransaction: (id: string) => api.get<any>(`/finance/transactions/${id}`),
  createTransaction: (data: any) => api.post<any>('/finance/transactions', data),
  getIncomeStatement: (startDate: string, endDate: string) => api.get<any>('/finance/reports/income-statement', { startDate, endDate }),
  getTrialBalance: () => api.get<any>('/finance/reports/trial-balance'),
  recordPayment: (invoiceId: string, data: { amount: number; accountId: string }) => api.post<any>(`/finance/invoices/${invoiceId}/pay`, data),
};

export const hrApi = {
  getEmployees: (params?: PaginationParams) => api.get<PaginatedResponse<any>>('/hr/employees', params),
  getEmployee: (id: string) => api.get<any>(`/hr/employees/${id}`),
  createEmployee: (data: any) => api.post<any>('/hr/employees', data),
  updateEmployee: (id: string, data: any) => api.put<any>(`/hr/employees/${id}`, data),
  recordAttendance: (employeeId: string, data: any) => api.post<any>(`/hr/employees/${employeeId}/attendance`, data),
  getAttendanceReport: (month: number, year: number) => api.get<any>('/hr/attendance/report', { month, year }),
  getDepartments: () => api.get<any[]>('/hr/employees/departments'),
};

export const crmApi = {
  getLeads: (params?: PaginationParams) => api.get<PaginatedResponse<any>>('/crm/leads', params),
  getLead: (id: string) => api.get<any>(`/crm/leads/${id}`),
  createLead: (data: any) => api.post<any>('/crm/leads', data),
  updateLead: (id: string, data: any) => api.put<any>(`/crm/leads/${id}`, data),
  getPipeline: () => api.get<any[]>('/crm/leads/pipeline'),
  createInteraction: (data: any) => api.post<any>('/crm/interactions', data),
  getInteractions: (params?: PaginationParams) => api.get<PaginatedResponse<any>>('/crm/interactions', params),
};

export const usersApi = {
  getUsers: (params?: PaginationParams) => api.get<PaginatedResponse<any>>('/users', params),
  getUser: (id: string) => api.get<any>(`/users/${id}`),
  toggleActive: (id: string) => api.patch<any>(`/users/${id}/toggle-active`),
};

export const aiApi = {
  generateDescription: (data: { itemName: string; category?: string }) => api.post<string>('/ai/generate-description', data),
  analyzeTrends: (data: { prompt: string; context: any }) => api.post<any>('/ai/analyze-trends', data),
};
