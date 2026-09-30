import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const mockTeams = [
  {
    id: 'team-101',
    name: 'Nova Forge',
    hackathon: 'AI for Accessibility',
    domain: 'AI & Healthcare',
    progress: 72,
    members: 4,
    status: 'Active',
    nextMilestone: 'Prototype review',
    gradient: 'from-violet-600 to-indigo-600',
  },
  {
    id: 'team-202',
    name: 'Signal Bloom',
    hackathon: 'CyberSecure Future',
    domain: 'Cybersecurity',
    progress: 48,
    members: 3,
    status: 'In review',
    nextMilestone: 'Threat model',
    gradient: 'from-cyan-600 to-blue-600',
  },
];

const StudentTeamOverview = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filteredTeams = useMemo(() => {
    const term = search.toLowerCase();
    return mockTeams.filter((team) => {
      return (
        team.name.toLowerCase().includes(term) ||
        team.hackathon.toLowerCase().includes(term) ||
        team.domain.toLowerCase().includes(term)
      );
    });
  }, [search]);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-300">Portfolio</p>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">My Teams</h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/student/teams/join')}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
          >
            Join Team
          </button>
          <button
            onClick={() => navigate('/student/teams/create')}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition hover:brightness-110"
          >
            Create Team
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl border border-white/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Active Teams</p>
          <p className="mt-4 text-3xl font-bold text-white">{mockTeams.length}</p>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Avg. Progress</p>
          <p className="mt-4 text-3xl font-bold text-violet-400">
            {Math.round(mockTeams.reduce((sum, team) => sum + team.progress, 0) / mockTeams.length)}%
          </p>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Milestones</p>
          <p className="mt-4 text-3xl font-bold text-cyan-400">06</p>
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/10 p-4 md:p-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by team, hackathon, or domain"
          className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:outline-none"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {filteredTeams.map((team) => (
          <div key={team.id} className="glass overflow-hidden rounded-[1.75rem] border border-white/10">
            <div className={`h-28 bg-gradient-to-r ${team.gradient} p-5`}>
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/90">
                  {team.status}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80">
                  {team.members} members
                </span>
              </div>
              <p className="mt-8 text-xs uppercase tracking-[0.3em] text-white/80">{team.hackathon}</p>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{team.name}</h2>
                  <p className="mt-1 text-sm text-gray-400">{team.domain}</p>
                </div>
                <button
                  onClick={() => navigate(`/student/teams/${team.id}/workspace`)}
                  className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-300"
                >
                  Open
                </button>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
                  <span>Progress</span>
                  <span className="font-semibold text-white">{team.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${team.progress}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <span className="text-sm text-gray-300">Next milestone</span>
                <span className="text-sm font-semibold text-white">{team.nextMilestone}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/student/teams/${team.id}/workspace`)}
                  className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Workspace
                </button>
                <button
                  onClick={() => navigate(`/student/teams/${team.id}/members`)}
                  className="flex-1 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-gray-200 transition hover:border-white/20 hover:bg-white/5"
                >
                  Members
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentTeamOverview;
