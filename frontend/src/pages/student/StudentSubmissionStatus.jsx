import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTeams } from '../../api/teamApi';
import { fetchSubmissions } from '../../services/student/submissionsApi';

const StudentSubmissionStatus = () => {
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubmissionStatus = async () => {
      setLoading(true);
      try {
        const teams = await getMyTeams();
        const activeTeam = teams?.[0] || null;
        if (!activeTeam) {
          setSubmission(null);
          return;
        }

        const submissions = await fetchSubmissions(activeTeam.id || activeTeam._id);
        setSubmission(submissions?.[0] || null);
      } catch (error) {
        console.error('Unable to load submission status:', error);
        setSubmission(null);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissionStatus();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
        <div className="glass rounded-[2rem] border border-white/10 p-8 text-center text-gray-300">Loading submission status…</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="glass rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <h2 className="text-2xl font-bold text-white">No submission found</h2>
          <p className="mt-3 text-gray-400">There is no submission record for your current team yet.</p>
        </div>
      </div>
    );
  }

  const statusTone =
    submission.status?.toLowerCase().includes('approved') || submission.status?.toLowerCase().includes('accepted')
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : submission.status?.toLowerCase().includes('rejected')
        ? 'border-red-500/30 bg-red-500/10 text-red-300'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-300';

  const details = [
    ['Project', submission.project || 'Untitled Project'],
    ['Version', submission.version ? `v${submission.version}` : 'Not assigned'],
    ['Submitted at', submission.submittedAt || 'Not submitted'],
    ['Score', submission.score ?? 'Pending'],
    ['Feedback', submission.feedback || 'No feedback available yet'],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Status</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Submission Status</h1>
        </div>
        <button onClick={() => navigate('/student/project')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
          Project info
        </button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Review stage</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{submission.status || 'Pending'}</h2>
          </div>
          <span className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] ${statusTone}`}>
            {submission.status || 'Pending'}
          </span>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">{label}</p>
              <p className="mt-2 text-base font-semibold text-white">{String(value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentSubmissionStatus;
