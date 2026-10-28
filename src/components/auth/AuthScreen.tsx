import React, { useState } from 'react';
import { Lock, CreditCard, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { StoreUser, Store } from '../../types';

interface AuthScreenProps {
  onLogin: (cnic: string, pass: string) => Promise<{ success: boolean; error?: string; user?: StoreUser; store?: Store }> | { success: boolean; error?: string; user?: StoreUser; store?: Store };
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [cnic, setCnic] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Normalize CNIC helper (supports both 35201-1111111-1 and 3520111111111)
  const formatCnic = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
  };

  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnic(formatCnic(e.target.value));
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCnic = cnic.trim();
    const cleanPass = password.trim();

    if (!cleanCnic) {
      setErrorMsg('Baraye meherbani CNIC number enter karein.');
      return;
    }
    if (!cleanPass) {
      setErrorMsg('Baraye meherbani Password enter karein.');
      return;
    }

    setLoading(true);
    try {
      const res = await onLogin(cleanCnic, cleanPass);
      if (!res.success) {
        setErrorMsg(res.error || 'Galat CNIC ya Password hai. Dobara check karein.');
      }
    } catch {
      setErrorMsg('Login karte waqt masla aaya. Dobara koshish karein.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-white text-slate-900 select-none antialiased">
      <div className="w-full max-w-sm border border-slate-200 rounded-3xl p-6 sm:p-8 bg-white shadow-xl shadow-slate-200/50">

        {/* Minimal Black & White Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-black text-white flex items-center justify-center font-black text-xl mb-3 shadow-md">
            KF
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">
            Kiryana<span className="text-slate-500">Flow</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Store Management Portal
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Username (CNIC)
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus-within:border-black focus-within:bg-white transition">
              <CreditCard className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="35201-1111111-1"
                value={cnic}
                onChange={handleCnicChange}
                maxLength={15}
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 font-mono tracking-wider focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Password
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus-within:border-black focus-within:bg-white transition">
              <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-700 ml-2 focus:outline-none cursor-pointer transition p-1"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-black hover:bg-slate-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer mt-2 disabled:opacity-50"
          >
            <span>{loading ? 'Verifying...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
