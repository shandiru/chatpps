import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      setSuccess(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-ink mb-4">
            <span className="text-2xl">✉</span>
          </div>
          <h1 className="text-4xl font-bold text-ink" style={{fontFamily:'Playfair Display, serif'}}>ChatApp</h1>
          <p className="text-sepia mt-2 text-sm italic">Create your account</p>
        </div>

        <div className="bg-parchment border border-border rounded-sm shadow-sm p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📬</div>
              <p className="text-ink font-semibold text-lg" style={{fontFamily:'Playfair Display, serif'}}>Check your inbox</p>
              <p className="text-sepia text-sm mt-2">{success}</p>
              <Link to="/login" className="mt-6 inline-block text-sm text-ink underline underline-offset-4">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-rust text-sm px-4 py-3 rounded-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-widest text-inklight mb-1.5">Username</label>
                <input
                  name="username" value={form.username} onChange={handleChange}
                  className="w-full bg-cream border border-border rounded-sm px-4 py-2.5 text-ink placeholder-sepia/50 focus:outline-none focus:border-ink text-sm transition-colors"
                  placeholder="yourname"
                  required
                />
              </div>

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
                {loading ? 'Creating…' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-sepia mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-ink underline underline-offset-4 hover:text-inklight">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
