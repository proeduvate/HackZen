import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentMentorRequest = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    mentor: 'Dr. Sarah Mitchell',
    topic: 'Product strategy',
    goal: 'Need guidance on validating the MVP and preparing the pitch for the final demo.',
    availability: 'Weeknights',
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Mentor</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Mentor Request</h1>
        </div>
        <button
          onClick={() => navigate('/student/mentor')}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200"
        >
          Mentor profile
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Mentor</label>
            <input
              value={form.mentor}
              onChange={(e) => setForm({ ...form, mentor: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Focus area</label>
            <select
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
            >
              <option>Product strategy</option>
              <option>Tech architecture</option>
              <option>Pitch coaching</option>
              <option>UX validation</option>
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Request details</label>
          <textarea
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
            rows={6}
            className="w-full rounded-2xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
          />
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Availability</label>
          <div className="flex flex-wrap gap-3">
            {['Weeknights', 'Weekends', 'Flexible'].map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setForm({ ...form, availability: slot })}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  form.availability === slot ? 'border-violet-500/40 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-white/5 text-gray-300'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={() => navigate('/student/mentor/status')} className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200">
            Request status
          </button>
          <button onClick={() => navigate('/student/mentor/status')} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white">
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentMentorRequest;
