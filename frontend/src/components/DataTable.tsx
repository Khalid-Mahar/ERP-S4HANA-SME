import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
}

export default function DataTable<T extends { id?: string }>({
  data, columns, total = 0, page = 1, pageSize = 20,
  onPageChange, onSearch, searchPlaceholder = 'Search...',
  actions, loading, emptyMessage = 'No records found',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = (value: string) => {
    setSearch(value);
    onSearch?.(value);
  };

  return (
    <div className="card !p-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0] gap-3 flex-wrap">
        {onSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={16} />
            <input
              className="form-input !pl-10 !w-64"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          {actions}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="erp-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#4f46e5] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-[#64748b]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={(row as any).id || i}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : (row as any)[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#e2e8f0]">
          <div className="text-xs text-[#64748b]">
            Showing <span className="font-semibold text-[#0f172a]">{(page - 1) * pageSize + 1}</span> to <span className="font-semibold text-[#0f172a]">{Math.min(page * pageSize, total)}</span> of <span className="font-semibold text-[#0f172a]">{total}</span> results
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => onPageChange?.(i + 1)}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  page === i + 1 ? 'bg-[#4f46e5] text-white' : 'text-[#64748b] hover:bg-gray-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
