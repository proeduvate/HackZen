import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTeams } from '../../api/teamApi';
import { fetchSubmissions } from '../../services/student/submissionsApi';

const StudentFeedback = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeedback = async () => {
      setLoading(true);
      try {
        const teams = await getMyTeams();
        const activeTeam = teams?.[0] || null;
        if (!activeTeam) {
          setFeedback(null);
          return;
        }

        const submissions = await fetchSubmissions(activeTeam.id || activeTeam._id);
        const latest = submissions?.[0] || null;
        setFeedback(latest && (latest.feedback || latest.score !== null) ? latest : null);
      } catch (error) {
        console.error('Failed to load feedback:', error);
        setFeedback(null);
      } finally {
        setLoading(false);
      }
    };

    loadFeedback();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
        <div className="glass rounded-[2rem] border border-white/10 p-8 text-center text-gray-300">Loading feedback…</div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="glass rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <h2 className="text-2xl font-bold text-white">No feedback available</h2>
          <p className="mt-3 text-gray-400">There are no mentor or judge comments tied to your current submission yet.</p>
          <button onClick={() => navigate('/student/teams')} className="mt-6 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200">
            Back to teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Feedback</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Feedback</h1>
        </div>
        <button onClick={() => navigate('/student/teams')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
          Back to teams
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Project</p>
            <p className="mt-2 text-lg font-bold text-white">{feedback.project || 'Untitled Project'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Score</p>
            <p className="mt-2 text-lg font-bold text-white">{feedback.score ?? 'Pending'}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-navy-950/40 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Feedback</p>
          <p className="mt-4 text-base leading-7 text-gray-200">{feedback.feedback || 'No mentor feedback is available for this submission yet.'}</p>
        </div>
      </div>
    </div>
  );
};

export default StudentFeedback;
