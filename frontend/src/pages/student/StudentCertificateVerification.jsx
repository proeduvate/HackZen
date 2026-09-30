import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentCertificateVerification = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('HZ-AI-1048');

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
          <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Certificate code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-4 text-lg font-semibold tracking-[0.2em] text-white focus:border-violet-500/50 focus:outline-none"
          />
        </div>

        <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">Verified</p>
          <p className="mt-3 text-lg font-semibold text-white">Certificate valid — issued to Sailesh for AI for Accessibility</p>
        </div>
      </div>
    </div>
  );
};

export default StudentCertificateVerification;
