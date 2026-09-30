import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentFeedback = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: 'Code quality',
    rating: 'Good',
    comment: 'The prototype is clear and the user flow is strong. We just need to tighten the accessibility details before final submission.',
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Feedback</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Feedback</h1>
        </div>
        <button onClick={() => navigate('/student/teams')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
          Back to teams
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Feedback type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
            >
              <option>Code quality</option>
              <option>Design critique</option>
              <option>Pitch review</option>
              <option>Team process</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Overall rating</label>
            <select
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
            >
              <option>Excellent</option>
              <option>Good</option>
              <option>Needs work</option>
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Comment</label>
          <textarea
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            rows={7}
            className="w-full rounded-2xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
          />
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200">
            Save draft
          </button>
          <button className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white">
            Submit feedback
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentFeedback;
