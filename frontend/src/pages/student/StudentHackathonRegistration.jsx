import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchHackathonById } from '../../services/student/upcomingHackathonsApi';
import { getRegistrationDraft } from '../../services/student/hackathonRegistrationApi';

const steps = [
    { 
        key: 'step-1', 
        label: 'Step 1', 
        title: 'Team Basics',
        description: 'Lead info and team name'
    },
    { 
        key: 'step-2', 
        label: 'Step 2', 
        title: 'Members & Notes',
        description: 'Collaborators and details'
    },
    { 
        key: 'step-3', 
        label: 'Step 3', 
        title: 'Review & Submit',
        description: 'Final application review'
    },
];

const StudentHackathonRegistration = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { hackathonId } = useParams();
    const [hackathon, setHackathon] = useState(null);
    const [draft, setDraft] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadRegistrationFlow = async () => {
            setIsLoading(true);

            try {
                const nextHackathon = await fetchHackathonById(hackathonId);
                const storedUser = JSON.parse(
                    sessionStorage.getItem('user') || '{"name":"Hari","email":"hari@proeduvate.com"}'
                );
                const nextDraft = await getRegistrationDraft(nextHackathon, storedUser);
                setHackathon(nextHackathon);
                setDraft(nextDraft);
            } catch (error) {
                console.error('Failed to load hackathon registration flow:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadRegistrationFlow();
    }, [hackathonId]);

    const currentStepIndex = useMemo(() => {
        const index = steps.findIndex((step) => location.pathname.endsWith(step.key));
        return index === -1 ? 0 : index;
    }, [location.pathname]);

    const currentStep = steps[currentStepIndex];

    if (isLoading) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                <div className="glass rounded-2xl border border-white/5 h-[70vh] animate-pulse bg-navy-900/40" />
            </div>
        );
    }

    if (!hackathon || !draft) {
        return (
            <div className="glass rounded-2xl border border-white/5 p-10 text-center">
                <h1 className="text-2xl font-bold text-white mb-2">Registration unavailable</h1>
                <p className="text-gray-400 mb-6">We could not load this hackathon registration flow right now.</p>
                <button
                    onClick={() => navigate('/student/hackathons')}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-colors"
                >
                    Back to Hackathons
                </button>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="space-y-6 max-w-7xl mx-auto">
                <button
                    onClick={() => navigate('/student/hackathons', { state: { hackathonId } })}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit group"
                >
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="font-medium">Back to Hackathons</span>
                </button>

                {/* NEW HORIZONTAL STEPPER UI */}
                <div className="glass p-8 md:p-10 rounded-3xl border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                    
                    <div className="relative flex justify-between items-start max-w-5xl mx-auto">
                        {steps.map((step, index) => {
                            const isActive = location.pathname.endsWith(step.key) || (index === 0 && location.pathname.endsWith('register'));
                            const isCompleted = currentStepIndex > index;
                            
                            return (
                                <React.Fragment key={step.key}>
                                    <div className="flex flex-col items-center relative z-10 group cursor-pointer"
                                         onClick={() => navigate(`/student/hackathons/${hackathonId}/register/${step.key}`)}>
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-500 ${
                                            isActive 
                                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.5)] scale-110' 
                                                : isCompleted
                                                    ? 'bg-purple-600/20 text-purple-400 border-2 border-purple-500/50'
                                                    : 'bg-navy-800 text-gray-500 border border-white/10'
                                        }`}>
                                            {isCompleted ? (
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : index + 1}
                                        </div>
                                        
                                        <div className="mt-4 text-center">
                                            <p className={`text-sm font-bold transition-colors ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                                {step.title}
                                            </p>
                                            <p className="text-[10px] text-gray-500 mt-1 max-w-[120px] leading-tight">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {index < steps.length - 1 && (
                                        <div className="flex-1 h-[2px] mt-6 mx-4 relative overflow-hidden bg-white/5">
                                            <div 
                                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(147,51,234,0.3)]"
                                                style={{ width: isCompleted ? '100%' : '0%' }}
                                            ></div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
                    <div className="glass p-8 md:p-10 rounded-2xl border border-blue-500/20 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl -z-10"></div>
                        <Outlet
                            context={{
                                hackathon,
                                draft,
                                setDraft,
                            }}
                        />
                    </div>

                    <aside className="glass p-5 rounded-2xl border border-white/5 space-y-4 xl:sticky xl:top-24">
                        <div>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">Hackathon</p>
                            <h3 className="text-lg font-bold text-white leading-tight">{hackathon.title}</h3>
                            <p className="text-sm text-gray-400 mt-1">{hackathon.organizer}</p>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Mode</span>
                                <span className="text-white font-semibold text-right">{hackathon.mode}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Schedule</span>
                                <span className="text-white font-semibold text-right">{hackathon.date}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Team Limit</span>
                                <span className="text-white font-semibold text-right">{hackathon.teamSizeLimit} Members</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Reward</span>
                                <span className="text-white font-semibold text-right">{hackathon.reward}</span>
                            </div>
                        </div>

                        <div className="rounded-xl bg-white/5 border border-white/5 p-4">
                            <p className="text-xs text-gray-500 uppercase tracking-[0.2em] mb-2">About</p>
                            <p className="text-sm text-gray-300 leading-6">{hackathon.description}</p>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default StudentHackathonRegistration;
