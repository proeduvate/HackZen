import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyTeams } from '../../services/student/teamsApi';

const StudentTeamOverview = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTeams = async () => {
      try {
        const data = await fetchMyTeams();
        if (isMounted) setTeams(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load student teams:', error);
        if (isMounted) setTeams([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTeams();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTeams = useMemo(() => {
    const term = search.toLowerCase();
    return teams.filter((team) => {
      const searchable = `${team.name || ''} ${team.hackathon || ''} ${team.domain || ''}`.toLowerCase();
      return searchable.includes(term);
    });
  }, [search, teams]);

  const avgProgress = teams.length
    ? Math.round(teams.reduce((sum, team) => sum + Number(team.progress || 0), 0) / teams.length)
    : 0;

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-300">Portfolio</p>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">My Teams</h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/student/teams/join')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10">Join Team</button>
          <button onClick={() => navigate('/student/teams/create')} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition hover:brightness-110">Create Team</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl border border-white/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Active Teams</p>
          <p className="mt-4 text-3xl font-bold text-white">{teams.length}</p>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Avg. Progress</p>
          <p className="mt-4 text-3xl font-bold text-violet-400">{avgProgress}%</p>
        </div>
        <div className="glass rounded-2xl border border-white/10 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Members</p>
          <p className="mt-4 text-3xl font-bold text-cyan-400">{teams.reduce((sum, team) => sum + Number(team.members || 0), 0)}</p>
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/10 p-4 md:p-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by team or hackathon"
          className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-8 text-sm text-gray-300">Loading your teams...</div>
      ) : filteredTeams.length === 0 ? (
        <div className="glass rounded-[1.75rem] border border-dashed border-white/10 p-12 text-center">
          <h2 className="text-2xl font-bold text-white">No teams yet</h2>
          <p className="mt-3 text-gray-400">Join an existing team or create one for your next hackathon.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => navigate('/student/teams/join')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white">Join Team</button>
            <button onClick={() => navigate('/student/teams/create')} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Create Team</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {filteredTeams.map((team) => (
            <div key={team.id} className="glass overflow-hidden rounded-[1.75rem] border border-white/10">
              <div className={`h-28 bg-gradient-to-r ${team.gradient || 'from-violet-600 to-indigo-600'} p-5`}>
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white/90">{team.status || 'Active'}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80">{team.members || 0} members</span>
                </div>
                <p className="mt-8 text-xs uppercase tracking-[0.3em] text-white/80">{team.hackathon || 'Hackathon'}</p>
              </div>

              <div className="space-y-5 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{team.name}</h2>
                    <p className="mt-1 text-sm text-gray-400">{team.domain || 'Technology'}</p>
                  </div>
                  <button onClick={() => navigate(`/student/teams/${team.id}/workspace`)} className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Open</button>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
                    <span>Progress</span>
                    <span className="font-semibold text-white">{team.progress || 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${team.progress || 0}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                  <span className="text-sm text-gray-300">Last activity</span>
                  <span className="text-sm font-semibold text-white">{team.lastMessage || 'Workspace ready'}</span>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => navigate(`/student/teams/${team.id}/workspace`)} className="flex-1 rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Workspace</button>
                  <button onClick={() => navigate(`/student/teams/${team.id}/members`)} className="flex-1 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-gray-200 transition hover:border-white/20 hover:bg-white/5">Members</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentTeamOverview;
