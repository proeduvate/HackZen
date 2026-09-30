import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchHackathonById } from '../../services/student/upcomingHackathonsApi';

const StudentRegistrationSuccess = () => {
    const navigate = useNavigate();
    const { hackathonId } = useParams();
    const [hackathon, setHackathon] = useState(null);

    useEffect(() => {
        const loadHackathon = async () => {
            try {
                const data = await fetchHackathonById(hackathonId);
                setHackathon(data);
            } catch (error) {
                console.error('Failed to load registered hackathon details:', error);
            }
        };

        if (hackathonId) {
            loadHackathon();
        }
    }, [hackathonId]);

    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
            <div className="w-full max-w-2xl rounded-3xl border border-emerald-500/20 bg-[#0f172a]/90 p-8 text-center shadow-[0_30px_80px_rgba(16,185,129,0.15)]">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-4xl text-emerald-400">
                    ✓
                </div>
                <p className="mt-6 text-xs font-black uppercase tracking-[0.28em] text-emerald-300">Registration complete</p>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">You’re registered!</h1>
                <p className="mt-4 text-base text-slate-300">
                    {hackathon ? `Your application for ${hackathon.title} has been submitted successfully.` : 'Your registration has been submitted successfully.'}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="rounded-xl bg-[#5740d6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4530bd]"
                    >
                        Go to Dashboard
                    </button>
                    <button
                        onClick={() => navigate('/student/hackathons')}
                        className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                    >
                        Browse Hackathons
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentRegistrationSuccess;
