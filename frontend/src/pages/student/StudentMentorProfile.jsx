import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAvailableMentors } from '../../api/profileApi';

const StudentMentorProfile = () => {
  const navigate = useNavigate();
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadMentor = async () => {
      try {
        const mentors = await fetchAvailableMentors();
        if (isMounted) {
          setMentor(Array.isArray(mentors) && mentors.length ? mentors[0] : null);
        }
      } catch (error) {
        console.error('Failed to load mentors:', error);
        if (isMounted) setMentor(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMentor();
    return () => {
      isMounted = false;
    };
  }, []);

  const mentorName = mentor?.name || mentor?.fullName || 'Available mentor';
  const mentorRole = mentor?.currentPosition || mentor?.role || 'Mentor';
  const mentorInstitution = mentor?.company || mentor?.institution || 'HackZen';
  const mentorBio = mentor?.bio || 'This mentor has not published a profile yet.';
  const expertise = Array.isArray(mentor?.expertiseAreas) ? mentor.expertiseAreas : (Array.isArray(mentor?.technologies) ? mentor.technologies : []);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">Mentor</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Mentor Profile</h1>
        </div>
        <button onClick={() => navigate('/student/mentor-request')} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Request Mentor</button>
      </div>

      {loading ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-10 text-sm text-gray-300">Loading mentor profiles...</div>
      ) : !mentor ? (
        <div className="glass rounded-[2rem] border border-dashed border-white/10 p-12 text-center">
          <h2 className="text-2xl font-bold text-white">No mentor is available yet</h2>
          <p className="mt-3 text-gray-400">There are no mentor profiles available for your account right now.</p>
        </div>
      ) : (
        <>
          <div className="glass overflow-hidden rounded-[2rem] border border-white/10">
            <div className="h-40 bg-gradient-to-r from-violet-600/70 via-indigo-600/60 to-sky-600/50" />
            <div className="-mt-12 space-y-6 p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-violet-600 to-indigo-600 text-3xl font-bold text-white shadow-xl">{mentorName.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">{mentorName}</h2>
                    <p className="mt-1 text-sm text-violet-200">{mentorRole} • {mentorInstitution}</p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">{mentor.availabilityStatus || 'Available'}</span>
              </div>

              <p className="max-w-2xl text-sm leading-7 text-gray-300">{mentorBio}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
            <div className="glass rounded-[2rem] border border-white/10 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Stats</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-2xl font-bold text-white">{mentor.totalHackathonsMentored || 0}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Hackathons</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-2xl font-bold text-violet-300">{mentor.averageRating ? `${mentor.averageRating}/5` : 'N/A'}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Rating</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-2xl font-bold text-cyan-300">{mentor.totalReviews || 0}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Reviews</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-[2rem] border border-white/10 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Expertise</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {expertise.length ? expertise.map((item, index) => (
                  <span key={`${item}-${index}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200">{typeof item === 'object' ? item.name || item.label || 'Skill' : item}</span>
                )) : (
                  <span className="text-sm text-gray-400">No expertise details are available yet.</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentMentorProfile;
