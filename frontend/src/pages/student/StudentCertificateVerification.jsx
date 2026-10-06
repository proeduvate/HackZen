import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/api';

const StudentCertificateVerification = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    const normalized = code.trim();
    if (!normalized) {
      setResult({ success: false, message: 'Enter a certificate ID to verify.' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data } = await apiClient.get(`/certificates/${normalized}`);
      setResult({
        success: true,
        message: 'Certificate record found and recognized by the backend.',
        details: {
          id: data?._id || normalized,
          issuedAt: data?.issuedAt ? new Date(data.issuedAt).toLocaleDateString() : 'Not available',
        },
      });
    } catch (error) {
      console.error('Certificate verification failed:', error);
      setResult({
        success: false,
        message: 'This certificate ID could not be verified against the backend.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Verification</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Certificate Verification</h1>
        </div>
        <button onClick={() => navigate('/student/certificates')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
          Certificate
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="space-y-4">
          <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Certificate ID</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste certificate ID"
            className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-4 text-lg font-semibold text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:outline-none"
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={verify} disabled={loading} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>

        {result && (
          <div className={`mt-8 rounded-2xl border p-5 ${result.success ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <p className={`text-xs font-bold uppercase tracking-[0.25em] ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
              {result.success ? 'Verified' : 'Unavailable'}
            </p>
            <p className="mt-3 text-lg font-semibold text-white">{result.message}</p>
            {result.details && (
              <div className="mt-4 text-sm text-gray-300">
                <p>ID: {result.details.id}</p>
                <p>Issued: {result.details.issuedAt}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCertificateVerification;
