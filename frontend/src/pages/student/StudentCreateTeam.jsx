import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllHackathons } from '../../api/hackathonApi';
import { createTeam } from '../../api/teamApi';

const StudentCreateTeam = () => {
  const navigate = useNavigate();
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    teamName: '',
    hackathonId: '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadHackathons = async () => {
      try {
        const data = await fetchAllHackathons();
        if (isMounted) {
          setHackathons(Array.isArray(data) ? data : []);
          if (data?.[0]?._id || data?.[0]?.id) {
            setForm((prev) => ({ ...prev, hackathonId: data[0]._id || data[0].id }));
          }
        }
      } catch (requestError) {
        console.error('Failed to load hackathons:', requestError);
        if (isMounted) {
          setHackathons([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHackathons();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateTeam = async () => {
    if (!form.teamName.trim()) {
      setError('Please enter a team name.');
      return;
    }

    if (!form.hackathonId) {
      setError('Please select an active hackathon.');
      return;
    }

    try {
      setError('');
      const result = await createTeam({
        teamName: form.teamName.trim(),
        hackathonId: form.hackathonId,
      });
      const teamIdentifier = result?._id || result?.id || result?.team?._id || result?.team?.id;
      navigate(teamIdentifier ? `/student/teams/${teamIdentifier}/workspace` : '/student/teams');
    } catch (requestError) {
      console.error('Failed to create team:', requestError);
      setError('Could not create the team right now. Please try again.');
    }
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
        {loading ? (
          <div className="text-sm text-gray-300">Loading hackathons...</div>
        ) : hackathons.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center">
            <h2 className="text-xl font-bold text-white">No hackathons available</h2>
            <p className="mt-3 text-sm text-gray-400">There are no active hackathons to create a team for right now.</p>
          </div>
        ) : (
          <>
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
                  value={form.hackathonId}
                  onChange={(e) => setForm({ ...form, hackathonId: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
                >
                  {hackathons.map((hackathon) => (
                    <option key={hackathon._id || hackathon.id} value={hackathon._id || hackathon.id}>
                      {hackathon.title || hackathon.name || 'Hackathon'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 md:flex-row md:justify-end">
              <button
                onClick={() => navigate('/student/teams')}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30"
              >
                Create Team
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentCreateTeam;
