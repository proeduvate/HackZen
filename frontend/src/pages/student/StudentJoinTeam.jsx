import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentJoinTeam = () => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');

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
            Ask your team lead for the join code. This will add you to the active workspace and shared files.
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

          <div className="grid gap-3 sm:grid-cols-2">
            {['NOVA1', 'SIGB2', 'FUSE7', 'BLOOM3'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setInviteCode(code)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200 transition hover:border-white/20 hover:bg-white/10"
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => navigate('/student/teams')}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-600/20"
          >
            Join Team
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentJoinTeam;
