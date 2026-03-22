import { Plus } from 'lucide-react';
export default function Page() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">Ready to implement</p>
        </div>
        <button className="btn btn-primary"><Plus size={15} /> Add New</button>
      </div>
      <div className="card" style={{padding:'60px',textAlign:'center',color:'var(--color-text-muted)'}}>
        <p style={{fontSize:16,marginBottom:8}}>🚧 Financial Reports Module</p>
        <p style={{fontSize:13}}>API: <code>financeApi.getIncomeStatement</code></p>
        <p style={{fontSize:13,marginTop:6}}>Follow <code>ItemsPage.tsx</code> as template.</p>
      </div>
    </div>
  );
}
