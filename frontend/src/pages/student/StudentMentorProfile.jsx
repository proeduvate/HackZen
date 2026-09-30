import React from 'react';
import { useNavigate } from 'react-router-dom';

const mentor = {
  name: 'Dr. Sarah Mitchell',
  role: 'Senior Mentor',
  institution: 'Stanford AI Lab',
  bio: 'Helps early-stage teams refine product thinking, system design, and demo storytelling.',
  expertise: ['AI Product Strategy', 'MLOps', 'UX Research', 'Pitch Storytelling'],
  availability: 'Available this week',
  rating: '4.9/5',
  sessions: 128,
  teams: 42,
};

const StudentMentorProfile = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Mentor</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Mentor Profile</h1>
        </div>
        <button onClick={() => navigate('/student/mentor/request')} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
          Request Mentor
        </button>
      </div>

      <div className="glass overflow-hidden rounded-[2rem] border border-white/10">
        <div className="h-40 bg-gradient-to-r from-violet-600/70 via-indigo-600/60 to-sky-600/50" />
        <div className="-mt-12 space-y-6 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-violet-600 to-indigo-600 text-3xl font-bold text-white shadow-xl">
                SM
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">{mentor.name}</h2>
                <p className="mt-1 text-sm text-violet-200">{mentor.role} • {mentor.institution}</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              {mentor.availability}
            </span>
          </div>

          <p className="max-w-2xl text-sm leading-7 text-gray-300">{mentor.bio}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <div className="glass rounded-[2rem] border border-white/10 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Stats</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold text-white">{mentor.teams}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Teams</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold text-violet-300">{mentor.rating}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Rating</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-bold text-cyan-300">{mentor.sessions}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Sessions</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-[2rem] border border-white/10 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Expertise</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {mentor.expertise.map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentMentorProfile;
