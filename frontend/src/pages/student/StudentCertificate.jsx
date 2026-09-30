import React from 'react';
import { useNavigate } from 'react-router-dom';

const StudentCertificate = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Award</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Certificate</h1>
        </div>
        <button onClick={() => navigate('/student/certificates/verify')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
          Verify certificate
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-8">
        <div className="rounded-[1.75rem] border border-violet-500/30 bg-gradient-to-br from-violet-600/20 to-indigo-600/20 p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-200">HackZen</p>
          <h2 className="mt-6 text-4xl font-bold text-white">Certificate of Participation</h2>
          <p className="mt-5 text-xl text-gray-200">Awarded to Sailesh</p>
          <p className="mt-2 text-sm text-gray-300">For successful participation in AI for Accessibility</p>
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-200">
            <span>Issued on: 12 May 2025</span>
            <span>Code: HZ-AI-1048</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCertificate;
