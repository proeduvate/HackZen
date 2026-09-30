import React from 'react';
import { useNavigate } from 'react-router-dom';

const StudentMentorRequestStatus = () => {
  const navigate = useNavigate();

  const status = {
    title: 'Request under review',
    subtitle: 'Your request for product strategy mentoring is in progress.',
    stage: 'Mentor review',
    nextAction: 'Dr. Sarah will confirm a session slot within 24 hours.',
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Mentor</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Request Status</h1>
        </div>
        <button onClick={() => navigate('/student/mentor/request')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
          New request
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Status</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{status.title}</h2>
          </div>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
            {status.stage}
          </span>
        </div>

        <p className="mt-6 text-gray-300">{status.subtitle}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Requested', value: 'Today' },
            { label: 'Mentor', value: 'Dr. Sarah Mitchell' },
            { label: 'Focus', value: 'Product strategy' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{item.label}</p>
              <p className="mt-3 text-lg font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-300">Next action</p>
          <p className="mt-2 text-base text-gray-200">{status.nextAction}</p>
        </div>
      </div>
    </div>
  );
};

export default StudentMentorRequestStatus;
