import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentSubmission = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Draft');

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Deliverable</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Project Submission</h1>
        </div>
        <button onClick={() => navigate('/student/submission-status')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
          Submission status
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Project title</label>
            <input value="Nova Forge" className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white" readOnly />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Submission status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
            >
              <option>Draft</option>
              <option>Submitted</option>
              <option>Under review</option>
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Summary</label>
          <textarea
            rows={6}
            defaultValue="This submission introduces a real-time AI accessibility recommendation engine for inclusive learning experiences."
            className="w-full rounded-2xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
          />
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={() => navigate('/student/files')} className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200">
            Upload files
          </button>
          <button className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white">
            Submit project
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentSubmission;
