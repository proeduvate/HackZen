import React from 'react';
import { useNavigate } from 'react-router-dom';

const StudentSubmissionStatus = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Status</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Submission Status</h1>
        </div>
        <button onClick={() => navigate('/student/project')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
          Project info
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Review stage</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Submitted successfully</h2>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            Confirmed
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['Submission ID', 'SUB-1048'],
            ['Submitted at', 'May 12, 2025'],
            ['Evaluation', 'In review'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">{label}</p>
              <p className="mt-2 text-base font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentSubmissionStatus;
