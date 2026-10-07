import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTeams } from '../../api/teamApi';
import { fetchSubmissions, submitProject } from '../../services/student/submissionsApi';

const StudentSubmission = () => {
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState({
    projectTitle: '',
    summary: '',
  });

  useEffect(() => {
    const loadTeamAndSubmission = async () => {
      setLoading(true);
      try {
        const teams = await getMyTeams();
        const activeTeam = teams?.[0] || null;
        setTeam(activeTeam);

        if (!activeTeam) {
          return;
        }

        const teamId = activeTeam.id || activeTeam._id;
        const submissions = await fetchSubmissions(teamId);
        const latest = submissions?.[0] || null;

        if (latest) {
          setForm({
            projectTitle: latest.project || '',
            summary: latest.desc || '',
          });
        }
      } catch (error) {
        console.error('Failed to load submission form data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTeamAndSubmission();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!team) {
      setErrorMessage('You must join a team before submitting a project.');
      return;
    }

    const projectTitle = form.projectTitle.trim();
    const summary = form.summary.trim();

    if (!projectTitle) {
      setErrorMessage('Please enter a project title.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await submitProject({
        teamId: team.id || team._id,
        stageId: team.hackathonId || 'initial_stage',
        fileUrl: 'pending_upload',
        project: projectTitle,
        desc: summary,
        category: 'General',
        status: 'Pending',
      });

      const submissions = await fetchSubmissions(team.id || team._id);
      const latest = submissions?.[0];

      if (latest) {
        setForm({
          projectTitle: latest.project || '',
          summary: latest.desc || '',
        });
      }

      setSuccessMessage('Project submitted successfully.');
    } catch (error) {
      console.error('Project submission failed:', error);
      setErrorMessage(error?.response?.data?.detail || 'Unable to submit the project right now.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
        <div className="glass rounded-[2rem] border border-white/10 p-8 text-center text-gray-300">Loading team submission form…</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="glass rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <h2 className="text-2xl font-bold text-white">No active team</h2>
          <p className="mt-3 text-gray-400">Join or create a team before submitting your project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Deliverable</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Project Submission</h1>
        </div>
        <button onClick={() => navigate('/student/submission-status')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
          Submission status
        </button>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Project title</label>
            <input
              value={form.projectTitle}
              onChange={(event) => setForm((current) => ({ ...current, projectTitle: event.target.value }))}
              placeholder="Project title"
              className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Team</label>
            <input
              value={team.teamName || 'Team'}
              readOnly
              className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Summary</label>
          <textarea
            value={form.summary}
            onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
            rows={6}
            placeholder="Describe your project summary, highlights, and outcomes."
            className="w-full rounded-2xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:outline-none"
          />
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMessage}</div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{successMessage}</div>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/student/files')} className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200">
            File sharing
          </button>
          <button type="submit" disabled={submitting || !form.projectTitle.trim()} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
            {submitting ? 'Submitting...' : 'Submit project'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentSubmission;
