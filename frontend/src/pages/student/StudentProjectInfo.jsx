import React from 'react';
import { useNavigate } from 'react-router-dom';

const StudentProjectInfo = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Project</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Project Information</h1>
        </div>
        <button onClick={() => navigate('/student/submissions')} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
          Submit project
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white">Nova Forge</h2>
          <p className="mt-3 text-sm leading-7 text-gray-300">
            A decision-support platform that surfaces accessibility-focused recommendations in real time for students and faculty. It combines AI, personalized learning insights, and inclusive adaptive interfaces.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ['Track', 'AI & Healthcare'],
              ['Problem', 'Accessibility in learning'],
              ['Stage', 'Prototype validation'],
              ['Status', 'Ready for review'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">{label}</p>
                <p className="mt-2 text-base font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[2rem] border border-white/10 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Highlights</p>
          <ul className="mt-5 space-y-3 text-sm text-gray-300">
            <li>• AI-generated accessibility summaries</li>
            <li>• Live personalization layer</li>
            <li>• Inclusive design review flow</li>
            <li>• Mentor feedback integrated</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StudentProjectInfo;
