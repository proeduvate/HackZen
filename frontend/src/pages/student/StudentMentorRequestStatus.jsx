import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMyMentorRequests } from '../../api/teamApi';

const StudentMentorRequestStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadRequest = async () => {
      try {
        const requests = await getMyMentorRequests();
        if (!isMounted) return;

        const nextRequest = Array.isArray(requests) && requests.length > 0 ? requests[0] : null;
        setRequest(nextRequest || (location.state && (location.state.teamName || location.state.mentorName) ? {
          teamId: location.state.teamId,
          teamName: location.state.teamName || 'Your team',
          mentorId: location.state.mentorId,
          mentorName: location.state.mentorName || 'Selected mentor',
          status: 'Pending',
        } : null));
      } catch (requestError) {
        console.error('Failed to fetch mentor request status:', requestError);
        if (isMounted) {
          setError('Unable to load your mentor request right now. Please refresh or try again later.');
          setRequest(location.state && (location.state.teamName || location.state.mentorName) ? {
            teamId: location.state.teamId,
            teamName: location.state.teamName || 'Your team',
            mentorId: location.state.mentorId,
            mentorName: location.state.mentorName || 'Selected mentor',
            status: 'Pending',
          } : null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadRequest();
    return () => {
      isMounted = false;
    };
  }, [location.state]);

  const status = {
    title: request ? 'Request sent' : 'No mentor request yet',
    subtitle: request ? 'Your mentor request is currently being reviewed.' : 'No mentor request has been submitted for this account yet.',
    stage: request?.status || 'Pending',
    nextAction: request ? 'The mentor team is reviewing your request and will update the status once a decision is made.' : 'Submit a mentor request from the mentor profile page when you are ready.',
    mentorName: request?.mentorName || 'Not assigned',
    focus: request?.focus || 'No special focus shared',
    teamName: request?.teamName || 'Team not selected',
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Mentor</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Request Status</h1>
        </div>
        <button onClick={() => navigate('/student/mentor-request')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">New request</button>
      </div>

      {loading ? (
        <div className="glass rounded-[2rem] border border-white/10 p-8 text-gray-300">Loading your mentor request...</div>
      ) : (
        <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Status</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{status.title}</h2>
            </div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">{status.stage}</span>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
          )}

          <p className="mt-6 text-gray-300">{status.subtitle}</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { label: 'Team', value: status.teamName },
              { label: 'Mentor', value: status.mentorName },
              { label: 'Focus', value: status.focus },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{item.label}</p>
                <p className="mt-3 text-lg font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-300">Next action</p>
            <p className="mt-2 text-base text-gray-200">{status.nextAction}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentMentorRequestStatus;
