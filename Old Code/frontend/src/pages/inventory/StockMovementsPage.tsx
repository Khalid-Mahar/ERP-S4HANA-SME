// Stock Movements Page
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryApi } from '../../api';
import DataTable from '../../components/common/DataTable';
import { ArrowDown, ArrowUp, ArrowLeftRight, Settings } from 'lucide-react';

const MOVEMENT_ICONS: any = {
  IN: <ArrowDown size={14} style={{ color: '#16a34a' }} />,
  OUT: <ArrowUp size={14} style={{ color: '#dc2626' }} />,
  TRANSFER: <ArrowLeftRight size={14} style={{ color: '#0284c7' }} />,
  ADJUSTMENT: <Settings size={14} style={{ color: '#d97706' }} />,
};
const MOVEMENT_BADGE: any = {
  IN: 'badge-success', OUT: 'badge-danger',
  TRANSFER: 'badge-info', ADJUSTMENT: 'badge-warning',
};

export default function StockMovementsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['movements', page, search],
    queryFn: () => inventoryApi.getMovements({ page, pageSize: 20, search }),
  });
  const rows: any[] = (data as any)?.data?.data || [];
  const meta = (data as any)?.data?.meta || {};

  const columns = [
    { key: 'createdAt', header: 'Date', render: (r: any) => new Date(r.createdAt).toLocaleString() },
    { key: 'item', header: 'Item', render: (r: any) => <span>{r.item?.code} - {r.item?.name}</span> },
    {
      key: 'movementType', header: 'Type',
      render: (r: any) => <span className={`badge ${MOVEMENT_BADGE[r.movementType]}`} style={{ display: 'inline-flex', gap: 4 }}>{MOVEMENT_ICONS[r.movementType]} {r.movementType}</span>,
    },
    { key: 'quantity', header: 'Qty', render: (r: any) => <strong>{r.quantity}</strong> },
    { key: 'fromWarehouse', header: 'From', render: (r: any) => r.fromWarehouse?.name || '—' },
    { key: 'toWarehouse', header: 'To', render: (r: any) => r.toWarehouse?.name || '—' },
    { key: 'referenceType', header: 'Reference', render: (r: any) => r.referenceType ? <span className="badge badge-default">{r.referenceType}</span> : '—' },
    { key: 'notes', header: 'Notes', render: (r: any) => r.notes || '—' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Movements</h1>
          <p className="page-subtitle">Full audit trail of all inventory changes</p>
        </div>
      </div>
      <DataTable data={rows} columns={columns} total={meta.total} page={page} pageSize={20}
        onPageChange={setPage} onSearch={setSearch} loading={isLoading} />
    </div>
  );
}
