import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinTeamByCode } from '../../api/teamApi';

const StudentJoinTeam = () => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoinTeam = async () => {
    const code = inviteCode.trim();
    if (!code) {
      setError('Enter the team join code shared by your team lead.');
      return;
    }

    try {
      setJoining(true);
      setError('');
      const result = await joinTeamByCode(code);
      const teamId = result?.team?._id || result?._id || result?.teamId || result?.data?._id || result?.data?.teamId;
      navigate(teamId ? `/student/teams/${teamId}/workspace` : '/student/teams');
    } catch (requestError) {
      console.error('Failed to join team:', requestError);
      setError('That code could not be used. Please check it and try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Team Access</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Join Team</h1>
        </div>
        <button
          onClick={() => navigate('/student/teams')}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white/10"
        >
          Back to teams
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 text-3xl shadow-lg shadow-cyan-500/10">
            🔑
          </div>
          <h2 className="text-2xl font-bold text-white">Enter your invite code</h2>
          <p className="mx-auto max-w-lg text-sm text-gray-400">
            Ask your team lead for the join code. This will add you to the team workspace.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            maxLength={8}
            placeholder="ENTER CODE"
            className="w-full rounded-2xl border border-white/10 bg-navy-950/60 px-6 py-5 text-center text-2xl font-bold tracking-[0.4em] text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:outline-none"
          />

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleJoinTeam}
            disabled={joining}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {joining ? 'Joining...' : 'Join Team'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentJoinTeam;
