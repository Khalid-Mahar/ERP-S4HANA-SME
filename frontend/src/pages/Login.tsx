import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Lock, Mail, Eye, EyeOff, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({ email, password, companyCode });
      // In the new backend, login returns { access_token, user }
      login(res.data.access_token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.firstName}!`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 space-y-8 border border-[#e2e8f0]">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-4 bg-[#4f46e5] rounded-2xl text-white mb-2 shadow-lg shadow-indigo-200">
            <LayoutDashboard size={36} />
          </div>
          <h2 className="text-3xl font-black text-[#0f172a] tracking-tight">ERP S/4HANA</h2>
          <p className="text-sm text-[#64748b] font-bold uppercase tracking-widest">Enterprise Central</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider ml-1">Company Code</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
                <input 
                  type="text" 
                  placeholder="e.g. GLOBAL-01" 
                  className="form-input !pl-11 !py-3"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
                <input 
                  type="email" 
                  placeholder="admin@company.com" 
                  className="form-input !pl-11 !py-3"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  className="form-input !pl-11 !pr-12 !py-3"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#4f46e5] transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded border-[#e2e8f0] text-[#4f46e5] focus:ring-[#4f46e5]" />
              <span className="text-xs text-[#64748b] font-bold group-hover:text-[#0f172a] transition-colors">Keep me signed in</span>
            </label>
            <a href="#" className="text-xs text-[#4f46e5] font-black hover:underline">Reset Access</a>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#4f46e5] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#3730a3] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
            ) : 'Authenticate'}
          </button>
        </form>

        <div className="pt-4 text-center border-t border-[#f1f5f9]">
          <p className="text-xs text-[#64748b] font-medium">
            Authorized Personnel Only. <a href="#" className="text-[#4f46e5] font-black hover:underline ml-1">Request Access</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
