import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAvailableMentors } from '../../api/profileApi';
import { assignMentor, getMyTeams } from '../../api/teamApi';

const StudentMentorRequest = () => {
  const navigate = useNavigate();
  const [mentors, setMentors] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({
    mentorId: '',
    teamId: '',
    topic: 'Product strategy',
    goal: '',
    availability: 'Weeknights',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [mentorList, teamList] = await Promise.all([
          fetchAvailableMentors(),
          getMyTeams()
        ]);
        if (!isMounted) return;

        const resolvedMentors = Array.isArray(mentorList) ? mentorList : [];
        const resolvedTeams = Array.isArray(teamList) ? teamList : [];
        setMentors(resolvedMentors);
        setTeams(resolvedTeams);

        if (resolvedMentors[0]) {
          setForm((prev) => ({ ...prev, mentorId: resolvedMentors[0]._id || resolvedMentors[0].userId || prev.mentorId }));
        }
        if (resolvedTeams[0]) {
          setForm((prev) => ({ ...prev, teamId: resolvedTeams[0]._id || resolvedTeams[0].id || prev.teamId }));
        }
      } catch (requestError) {
        console.error('Failed to fetch mentor request data:', requestError);
        setMentors([]);
        setTeams([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async () => {
    if (!form.teamId) {
      setError('You need to be part of a team before requesting mentor support.');
      return;
    }
    if (!form.mentorId) {
      setError('No mentor is available to assign at the moment.');
      return;
    }

    try {
      setError('');
      await assignMentor(form.teamId, { mentorId: form.mentorId });
      navigate('/student/mentor-request-status', {
        state: {
          title: 'Request sent',
          subtitle: 'Your mentor request is being reviewed.',
          stage: 'Mentor assignment',
          mentorName: mentors.find((mentor) => (mentor._id || mentor.userId) === form.mentorId)?.name || 'Selected mentor',
          focus: form.topic,
          teamName: teams.find((team) => (team._id || team.id) === form.teamId)?.teamName || 'Your team',
        }
      });
    } catch (requestError) {
      console.error('Failed to assign mentor:', requestError);
      setError('The mentor assignment could not be completed. Please try again or select another mentor.');
    }
  };

  const mentorOptions = mentors.map((mentor) => ({
    id: mentor._id || mentor.userId,
    name: mentor.name || mentor.fullName || 'Mentor',
    role: mentor.currentPosition || mentor.role || 'Mentor'
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Mentor</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Mentor Request</h1>
        </div>
        <button onClick={() => navigate('/student/mentor')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">Mentor profile</button>
      </div>

      {loading ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-10 text-sm text-gray-300">Loading mentor data...</div>
      ) : mentorOptions.length === 0 || teams.length === 0 ? (
        <div className="glass rounded-[2rem] border border-dashed border-white/10 p-10 text-center">
          <h2 className="text-2xl font-bold text-white">Mentor request is not available</h2>
          <p className="mt-3 text-gray-400">You need at least one active team and an available mentor before requesting support.</p>
        </div>
      ) : (
        <div className="glass rounded-[2rem] border border-white/10 p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Mentor</label>
              <select
                value={form.mentorId}
                onChange={(e) => setForm({ ...form, mentorId: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
              >
                {mentorOptions.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>{mentor.name} • {mentor.role}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Team</label>
              <select
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
              >
                {teams.map((team) => (
                  <option key={team._id || team.id} value={team._id || team.id}>{team.teamName || team.name || 'Team'}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Focus area</label>
            <select
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none"
            >
              <option>Product strategy</option>
              <option>Technical architecture</option>
              <option>Pitch coaching</option>
              <option>UX validation</option>
            </select>
          </div>

          <div className="mt-6 space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Request details</label>
            <textarea
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              rows={6}
              placeholder="Tell the mentor what support you need for your team."
              className="w-full rounded-2xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:outline-none"
            />
          </div>

          <div className="mt-6 space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Availability</label>
            <div className="flex flex-wrap gap-3">
              {['Weeknights', 'Weekends', 'Flexible'].map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setForm({ ...form, availability: slot })}
                  className={`rounded-full border px-4 py-2 text-sm transition ${form.availability === slot ? 'border-violet-500/40 bg-violet-500/10 text-violet-200' : 'border-white/10 bg-white/5 text-gray-300'}`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
          )}

          <div className="mt-8 flex justify-end gap-3">
            <button onClick={() => navigate('/student/mentor-request-status')} className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-200">Request status</button>
            <button onClick={handleSubmit} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white">Send Request</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentMentorRequest;
