import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardData } from '../../services/student/dashboardApi';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('milestones');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState([]);
    const [featured, setFeatured] = useState(null);
    const [trackedHackathons, setTrackedHackathons] = useState([]);

    const [storedUser, setStoredUser] = useState(() => {
        const session = sessionStorage.getItem('user');
        const local = localStorage.getItem('user');
        return JSON.parse(session || local || '{"name": "User"}');
    });
    const userName = (storedUser?.name || 'User').split(' ')[0];

    const loadDashboardData = async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        try {
            const data = await fetchDashboardData();
            setStats(data.stats);
            setFeatured(data.featured);
            setTrackedHackathons(data.tracked);
        } catch (error) {
            console.error("Dashboard fetch failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const handleUserUpdate = () => {
            const user = sessionStorage.getItem('user');
            if (user) {
                setStoredUser(JSON.parse(user));
                loadDashboardData(false); // Refresh stats without full spinner
            }
        };
        window.addEventListener('user-update', handleUserUpdate);

        loadDashboardData(true);
        return () => window.removeEventListener('user-update', handleUserUpdate);
    }, []);

    const analyticsCards = [
        { id: 'engagements', label: 'Engagements', value: stats.find((item) => item.label === 'Engagements')?.value || '1.2K', icon: '⚡', color: 'blue' },
        { id: 'collaborations', label: 'Collaborations', value: stats.find((item) => item.label === 'Collaborations')?.value || '84', icon: '👥', color: 'purple' },
        { id: 'allocations', label: 'Allocations', value: stats.find((item) => item.label === 'Allocations')?.value || '26', icon: '💎', color: 'cyan' },
    ];

    const milestoneItems = [
        { title: 'Completed Hackathons', value: stats.find((item) => item.label === 'Completed Hackathons')?.value || '8', progress: 80, badge: 'On Track' },
        { title: 'Mentor Sessions', value: stats.find((item) => item.label === 'Mentor Sessions')?.value || '23', progress: 60, badge: 'Active' },
        { title: 'Project Submissions', value: stats.find((item) => item.label === 'Project Submissions')?.value || '14', progress: 70, badge: 'Growing' },
    ];



    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Premium Header */}
            <div className="relative mb-10">
                <div className="absolute -left-10 -top-10 w-40 h-40 bg-blue-600/10 blur-[100px] rounded-full"></div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    Welcome back, <span className="gradient-text from-blue-400 via-purple-400 to-cyan-400">{userName}</span>
                </h1>
                <p className="text-gray-400 font-medium italic">
                    Manage your tactical hackathon participation, elite team coordination, and submission metrics.
                </p>
            </div>


            <section className="grid gap-8 xl:grid-cols-[2fr_1fr]">
                {/* Featured Event Premium Card */}
                <div className="glass-strong rounded-[2.5rem] border border-white/10 p-10 relative overflow-hidden flex flex-col group transition-all duration-500 hover:border-blue-500/30 shadow-2xl bg-navy-950/20">
                    <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-600/5 blur-[120px] group-hover:bg-blue-600/10 transition-all duration-700"></div>
                    <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center flex-1">
                        <div className="space-y-6">
                            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 border border-white/20 text-white shadow-sm">Featured Intelligence Arena</span>
                            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight group-hover:text-blue-400 transition-colors">
                                {featured ? featured.title : 'Global Connect Hackathon 2025'}
                            </h2>
                            <p className="max-w-2xl text-gray-400 leading-relaxed text-sm italic">
                                {featured ? (featured.description || 'Join thousands of innovators to build the future.') : 'A premier hackathon bringing together innovators, mentors, and peer teams to solve real-world challenges.'}
                            </p>

                            <div className="flex flex-wrap gap-4 pt-2">
                                <button
                                    onClick={() => navigate(featured ? `/student/hackathons` : '/student/hackathons')}
                                    className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white shadow-xl shadow-blue-900/20 hover:shadow-blue-600/40 transition-all hover:scale-105 active:scale-95"
                                >
                                    Initiate Entry
                                </button>
                                <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white hover:bg-white/10 transition-all">
                                    Dossier Details
                                </button>
                            </div>
                        </div>
                        <div className="hidden lg:flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full"></div>
                            <div className="h-44 w-44 rounded-[2.5rem] border border-white/10 shadow-2xl flex items-center justify-center bg-navy-950/40 text-6xl rotate-3 hover:rotate-0 transition-transform duration-500 relative z-10">
                                {featured?.themes?.[0]?.toLowerCase()?.includes('ai') ? '🤖' : '🏆'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vertical Stats Column */}
                <div className="grid gap-6">
                    {analyticsCards.map((card) => (
                        <div key={card.id} className="glass-strong rounded-3xl border border-white/10 p-8 hover:border-blue-500/30 transition-all duration-500 flex items-center justify-between group shadow-xl bg-navy-950/20">
                            <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">{card.label}</p>
                                <p className="text-3xl font-bold text-white tracking-tight group-hover:scale-105 transition-transform origin-left">{card.value}</p>
                            </div>

                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl group-hover:bg-blue-500/10 group-hover:text-blue-400 border border-white/5 group-hover:border-blue-500/20 transition-all duration-500 shadow-inner">
                                {card.icon}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex gap-3 rounded-2xl bg-black/40 p-1.5 border border-white/5 w-max shadow-2xl">
                        {['milestones', 'tracking'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`rounded-xl px-8 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${
                                    activeTab === tab
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 border border-blue-500/50'
                                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {tab === 'milestones' ? 'Operational Milestones' : 'Tactical Tracking'}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'milestones' ? (
                    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                        {milestoneItems.map((item) => (
                            <div key={item.title} className="glass-strong rounded-[2rem] border border-white/10 p-8 hover:border-blue-500/30 transition-all duration-500 group shadow-2xl bg-navy-950/20 flex flex-col min-h-[220px]">
                                <div className="flex items-start justify-between gap-4 mb-6">
                                    <div>
                                        <p className="text-gray-400 text-sm font-medium mb-1">{item.title}</p>
                                        <p className="text-3xl font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">{item.value}</p>
                                    </div>
                                    <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.1)]">{item.badge}</span>
                                </div>

                                <div className="mt-auto space-y-3">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        <span className="italic">Efficiency Matrix</span>
                                        <span className="text-blue-400">{item.progress}%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden border border-white/5 p-[1px]">
                                        <div 
                                            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
                                            style={{ width: `${item.progress}%` }} 
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                        {trackedHackathons.map((item) => (
                            <div key={item.id} className="glass-strong rounded-[2rem] border border-white/10 hover:border-blue-500/30 transition-all duration-500 flex flex-col overflow-hidden group shadow-2xl bg-navy-950/20">
                                <div className="p-8 border-b border-white/5 flex-1 space-y-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <h3 className="text-xl font-bold text-white leading-tight tracking-tight group-hover:text-blue-400 transition-colors">{item.name}</h3>
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-lg ${
                                            item.status === 'Live' || item.status === 'Ongoing' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-900/10' 
                                                : 'bg-white/5 text-gray-400 border-white/10 shadow-black/20'
                                        }`}>
                                            {item.status}
                                        </span>
                                    </div>

                                    
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Tactical Unit</p>
                                            <p className="text-sm font-bold text-white italic">{item.team}</p>
                                        </div>
                                    </div>

                                    <div className="bg-black/30 rounded-2xl p-6 border border-white/5 shadow-inner">
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-3">Intelligence Update</p>
                                        <p className="text-sm font-medium text-gray-300 italic leading-relaxed">Next Phase: <span className="text-white font-bold">{item.next}</span></p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                                            <span className="italic">Synchronization</span>
                                            <span className="text-blue-400">{item.progress}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden border border-white/5 p-[1px]">
                                            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]" style={{ width: `${item.progress}%` }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-auto flex items-center justify-between p-6 bg-white/[0.02] border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Active Link</span>
                                    </div>
                                    <button
                                        onClick={() => navigate('/student/submissions')}
                                        className="group/btn flex items-center gap-2 text-[10px] text-blue-400 font-black uppercase tracking-widest hover:text-blue-300 transition-all"
                                    >
                                        Inspect Arena
                                        <svg className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default StudentDashboard;
