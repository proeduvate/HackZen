import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentCreateTeam = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    teamName: '',
    hackathon: 'AI for Accessibility',
    domain: 'AI & Healthcare',
    description: '',
    skills: ['Design', 'Python'],
  });

  const skillOptions = ['Python', 'Design', 'ML', 'Research', 'Frontend', 'Backend'];

  const toggleSkill = (skill) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((item) => item !== skill)
        : [...prev.skills, skill],
    }));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Collaboration</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Create Team</h1>
        </div>
        <button
          onClick={() => navigate('/student/teams')}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white/10"
        >
          Back to teams
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Team Name</label>
            <input
              value={form.teamName}
              onChange={(e) => setForm({ ...form, teamName: e.target.value })}
              placeholder="e.g. North Star"
              className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Hackathon</label>
            <select
              value={form.hackathon}
              onChange={(e) => setForm({ ...form, hackathon: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
            >
              <option>AI for Accessibility</option>
              <option>CyberSecure Future</option>
              <option>HealthHack 2025</option>
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Domain</label>
          <div className="flex flex-wrap gap-3">
            {['AI & Healthcare', 'Cybersecurity', 'Fintech', 'EdTech'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setForm({ ...form, domain: option })}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  form.domain === option
                    ? 'border-violet-500/40 bg-violet-500/10 text-violet-200'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={5}
            placeholder="Share your vision, problem statement, and what the team is solving."
            className="w-full rounded-2xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:outline-none"
          />
        </div>

        <div className="mt-6 space-y-3">
          <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Preferred Skills</label>
          <div className="flex flex-wrap gap-3">
            {skillOptions.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  form.skills.includes(skill)
                    ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:justify-end">
          <button
            onClick={() => navigate('/student/teams')}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => navigate('/student/teams/1/workspace')}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30"
          >
            Create Team
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentCreateTeam;
