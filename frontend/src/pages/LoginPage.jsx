import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-ink mb-4">
            <span className="text-2xl">✉</span>
          </div>
          <h1 className="text-4xl font-bold text-ink" style={{fontFamily:'Playfair Display, serif'}}>ChatApp</h1>
          <p className="text-sepia mt-2 text-sm italic">Sign in to continue</p>
        </div>

        <div className="bg-parchment border border-border rounded-sm shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-rust text-sm px-4 py-3 rounded-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-widest text-inklight mb-1.5">Email</label>
              <input
                type="email" name="email" value={form.email} onChange={handleChange}
                className="w-full bg-cream border border-border rounded-sm px-4 py-2.5 text-ink placeholder-sepia/50 focus:outline-none focus:border-ink text-sm transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-inklight mb-1.5">Password</label>
              <input
                type="password" name="password" value={form.password} onChange={handleChange}
                className="w-full bg-cream border border-border rounded-sm px-4 py-2.5 text-ink placeholder-sepia/50 focus:outline-none focus:border-ink text-sm transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-ink text-cream py-3 rounded-sm text-sm uppercase tracking-widest hover:bg-inklight transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-sepia mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-ink underline underline-offset-4 hover:text-inklight">Register</Link>
        </p>
      </div>
    </div>
  );
}
