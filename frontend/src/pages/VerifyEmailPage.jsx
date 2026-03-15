import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const id = params.get('id');
    if (!token || !id) { setStatus('error'); setMessage('Invalid verification link.'); return; }

    api.get(`/auth/verify-email?token=${token}&id=${id}`)
      .then(res => { setStatus('success'); setMessage(res.data.message); })
      .catch(err => { setStatus('error'); setMessage(err.response?.data?.message || 'Verification failed'); });
  }, []);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-parchment border border-border rounded-sm p-10 shadow-sm">
          {status === 'loading' && (
            <>
              <div className="text-4xl mb-4 animate-pulse">⏳</div>
              <p className="text-sepia text-sm">Verifying your email…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-ink mb-2" style={{fontFamily:'Playfair Display, serif'}}>Verified!</h2>
              <p className="text-sepia text-sm mb-6">{message}</p>
              <Link to="/login" className="bg-ink text-cream px-6 py-2.5 rounded-sm text-sm uppercase tracking-widest hover:bg-inklight transition-colors inline-block">
                Sign In
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-5xl mb-4">✗</div>
              <h2 className="text-2xl font-bold text-rust mb-2" style={{fontFamily:'Playfair Display, serif'}}>Failed</h2>
              <p className="text-sepia text-sm mb-6">{message}</p>
              <Link to="/register" className="text-ink underline underline-offset-4 text-sm">
                Try registering again
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
