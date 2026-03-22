import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Building2 } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    companyName: '', companyCode: '',
    firstName: '', lastName: '', email: '', password: '',
  });
  const [loading, setLoading] = useState(false);
  const { setTokens } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.register(form) as any;
      const data = res.data || res;
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setTokens(data.accessToken, data.refreshToken);
      useAuthStore.setState({ user: data.user, isAuthenticated: true });
      toast.success('Company registered! Welcome aboard.');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: 52, height: 52, background: '#4f46e5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Building2 size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Register your company</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Create your ERP workspace</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">Company Name</label>
              <input className="form-input" placeholder="Acme Corporation" value={form.companyName} onChange={handleChange('companyName')} required />
            </div>
            <div className="form-group">
              <label className="form-label required">Company Code</label>
              <input className="form-input" placeholder="ACME" value={form.companyCode}
                onChange={(e) => setForm((f) => ({ ...f, companyCode: e.target.value.toUpperCase() }))} maxLength={10} required />
              <span className="form-error" style={{ color: '#64748b' }}>Short unique identifier</span>
            </div>
            <div className="form-group">
              <label className="form-label required">Email</label>
              <input className="form-input" type="email" placeholder="admin@acme.com" value={form.email} onChange={handleChange('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label required">First Name</label>
              <input className="form-input" placeholder="John" value={form.firstName} onChange={handleChange('firstName')} required />
            </div>
            <div className="form-group">
              <label className="form-label required">Last Name</label>
              <input className="form-input" placeholder="Doe" value={form.lastName} onChange={handleChange('lastName')} required />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">Password</label>
              <input className="form-input" type="password" placeholder="Minimum 8 characters" value={form.password} onChange={handleChange('password')} minLength={8} required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center', padding: '11px', marginTop: '4px' }}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
            {loading ? 'Creating workspace...' : 'Create workspace'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748b' }}>
          Already registered? <Link to="/login" style={{ color: '#4f46e5', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
