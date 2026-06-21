"use client";

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams?.get('registered');

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (registered) {
      setError('Registration successful! Please log in.');
    }
  }, [registered]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (res?.error) {
        throw new Error('Invalid email or password');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-6">
      
      {/* Top Nav */}
      <div className="flex items-center mb-8">
        <Link href="/" className="flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-ink transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      {/* Logo */}
      <div className="text-xl font-black tracking-tight flex items-center mb-6">
        <span className="text-ink">diet</span>
        <span className="text-brand">Buddy</span>
      </div>

      {/* Header */}
      <h1 className="text-4xl font-black tracking-tight leading-none mb-2 text-ink">
        Sign in
      </h1>
      <p className="text-sm font-medium text-ink-soft mb-8">
        Welcome back to your tracking
      </p>

      {/* Toggle (Sign In / Create Account) */}
      <div className="flex bg-surface-muted rounded-[20px] p-1.5 mb-8 shadow-inner">
        <div className="flex-1 text-center py-3 bg-white rounded-[16px] text-sm font-bold text-ink shadow-sm">
          Sign in
        </div>
        <Link href="/auth/signup" className="flex-1 text-center py-3 rounded-[16px] text-sm font-bold text-ink-soft hover:text-ink transition-colors">
          Create account
        </Link>
      </div>

      {/* Google Auth Button */}
      <button className="w-full bg-white border border-surface-line rounded-[20px] py-4 flex items-center justify-center gap-3 font-bold text-ink shadow-sm hover:bg-gray-50 transition-colors mb-6">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          <path fill="none" d="M1 1h22v22H1z" />
        </svg>
        Continue with Google
      </button>

      {/* OR divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-surface-line"></div>
        <span className="text-[10px] font-bold tracking-widest text-ink-faint uppercase">OR</span>
        <div className="flex-1 h-px bg-surface-line"></div>
      </div>

      {error && (
        <div className={`border rounded-xl p-3 mb-6 text-sm font-medium ${registered ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        
        <div>
          <label className="block text-[10px] font-black tracking-widest text-ink-soft uppercase mb-2 ml-1">
            Email Address
          </label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="w-full bg-surface-muted rounded-[20px] px-5 py-4 text-sm font-bold text-ink placeholder:text-ink-faint border-none focus:ring-2 focus:ring-brand outline-none transition-shadow"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-[10px] font-black tracking-widest text-ink-soft uppercase mb-2 ml-1">
            Password
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            className="w-full bg-surface-muted rounded-[20px] px-5 py-4 text-sm font-bold text-ink placeholder:text-ink-faint border-none focus:ring-2 focus:ring-brand outline-none transition-shadow tracking-widest"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <div className="text-right mt-3 pr-1">
            <Link href="/auth/forgot-password" className="text-xs font-bold text-brand hover:text-[#e63e00] transition-colors">
              Forgot password?
            </Link>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-[#e63e00] text-white rounded-[20px] py-4 font-bold text-base shadow-lg shadow-brand/30 transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>

    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface font-sans text-ink">
      <React.Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
        <LoginContent />
      </React.Suspense>
    </div>
  );
}
