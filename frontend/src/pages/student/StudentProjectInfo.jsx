import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTeams } from '../../api/teamApi';
import { fetchSubmissions } from '../../services/student/submissionsApi';

const StudentProjectInfo = () => {
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjectInfo = async () => {
      setLoading(true);
      try {
        const teams = await getMyTeams();
        const activeTeam = teams?.[0] || null;
        setTeam(activeTeam);

        if (!activeTeam) {
          setProject(null);
          return;
        }

        const teamId = activeTeam.id || activeTeam._id;
        const submissions = await fetchSubmissions(teamId);
        setProject(submissions?.[0] || null);
      } catch (error) {
        console.error('Failed to load project information:', error);
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    loadProjectInfo();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
        <div className="glass rounded-[2rem] border border-white/10 p-8 text-center text-gray-300">Loading project information…</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="glass rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <h2 className="text-2xl font-bold text-white">No team found</h2>
          <p className="mt-3 text-gray-400">Create or join a team to view your project information.</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl pb-10">
        <div className="glass rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <h2 className="text-2xl font-bold text-white">No project information yet</h2>
          <p className="mt-3 text-gray-400">Your team has not submitted a project yet. Once a submission exists, the project details will appear here.</p>
          <button onClick={() => navigate('/student/submission')} className="mt-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white">
            Create submission
          </button>
        </div>
      </div>
    );
  }

  const details = [
    ['Team', team.teamName || 'Not available'],
    ['Hackathon', project.hackathon || 'Current Hackathon'],
    ['Project', project.project || 'Untitled Project'],
    ['Stage', project.status || 'Pending'],
    ['Version', project.version ? `v${project.version}` : 'Not assigned'],
    ['Submitted', project.submittedAt || 'Not submitted yet'],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Project</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Project Information</h1>
        </div>
        <button onClick={() => navigate('/student/submission')} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
          Submit project
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white">Project Details</h2>
          <p className="mt-3 text-sm leading-7 text-gray-300">{project.desc || 'No project description has been submitted yet.'}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">{label}</p>
                <p className="mt-2 text-base font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[2rem] border border-white/10 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Status</p>
          <ul className="mt-5 space-y-3 text-sm text-gray-300">
            <li>• Submission status: {project.status || 'Pending'}</li>
            <li>• Category: {project.category || 'General'}</li>
            <li>• Feedback: {project.feedback ? 'Available' : 'Not yet available'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StudentProjectInfo;
