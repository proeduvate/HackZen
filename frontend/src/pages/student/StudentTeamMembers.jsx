import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const members = [
  { id: 1, name: 'You', role: 'Project Lead', status: 'Online' },
  { id: 2, name: 'Ava', role: 'Research', status: 'Online' },
  { id: 3, name: 'Rohan', role: 'Frontend', status: 'Away' },
  { id: 4, name: 'Maya', role: 'Backend', status: 'Online' },
];

const StudentTeamMembers = () => {
  const navigate = useNavigate();
  const { teamId } = useParams();

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Squad</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Team Members</h1>
        </div>
        <button
          onClick={() => navigate(`/student/teams/${teamId || 'team-101'}/workspace`)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200"
        >
          Back to workspace
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {members.map((member) => (
          <div key={member.id} className="glass rounded-[1.5rem] border border-white/10 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-white">
                {member.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{member.name}</h3>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{member.role}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <span className={`text-xs font-bold uppercase tracking-[0.2em] ${member.status === 'Online' ? 'text-emerald-400' : 'text-amber-300'}`}>
                {member.status}
              </span>
              <button className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-gray-200">Message</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentTeamMembers;
