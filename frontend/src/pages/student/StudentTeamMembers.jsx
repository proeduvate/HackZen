import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTeamMembers } from '../../api/teamApi';

const getInitials = (name) => {
  if (!name) return 'T';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'T';
};

const StudentTeamMembers = () => {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadMembers = async () => {
      if (!teamId) {
        setMembers([]);
        setLoading(false);
        return;
      }

      try {
        const data = await getTeamMembers(teamId);
        if (isMounted) {
          setMembers(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to load team members:', error);
        if (isMounted) {
          setMembers([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMembers();
    return () => {
      isMounted = false;
    };
  }, [teamId]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Squad</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Team Members</h1>
        </div>
        <button
          onClick={() => navigate(teamId ? `/student/teams/${teamId}/workspace` : '/student/teams')}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200"
        >
          Back to workspace
        </button>
      </div>

      {loading ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-8 text-sm text-gray-300">
          Loading members...
        </div>
      ) : members.length === 0 ? (
        <div className="glass rounded-[1.5rem] border border-dashed border-white/10 p-12 text-center">
          <h2 className="text-2xl font-bold text-white">No members yet</h2>
          <p className="mt-3 text-gray-400">This team doesn’t have any members yet or you do not have access to view them.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {members.map((member, index) => (
            <div key={member._id || member.id || `${member.userId || member.name}-${index}`} className="glass rounded-[1.5rem] border border-white/10 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-white">
                  {getInitials(member.name || member.userName || member.email || 'Member')}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{member.name || member.userName || 'Member'}</h3>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{member.role || 'Member'}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Online</span>
                <button className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-gray-200">Message</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentTeamMembers;
