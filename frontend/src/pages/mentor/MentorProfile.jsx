import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchMentorProfile } from '../../services/mentor/profileApi';

const MentorProfile = () => {
    // Reactive User State
    const [user, setUser] = useState({
        name: 'Dr. Sarah Mitchell',
        role: 'ELITE MENTOR',
        subRole: 'mentor | Stanford AI Lab / Google Research',
        stats: {
            teams: 42,
            rating: '4.9/5',
            sessions: 120
        },
        competencies: [
            'Deep Learning Optimization',
            'Distributed Systems',
            'AI Ethics & Safety',
            'Research Methodology'
        ],
        recentActions: [
            { id: 1, type: 'Review', title: 'EcoTrack AI', detail: 'Technical Milestone Approved', time: '1 hour ago' },
            { id: 2, type: 'Session', title: 'HealthSync Architecture', detail: 'Concluded 1:1 Consultation', time: '4 hours ago' },
            { id: 3, type: 'Update', title: 'Research Lab Policy', detail: 'Security Protocols Refined', time: 'Yesterday' }
        ],
        initials: 'SM'
    });

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // First try to get fresh data from server
                const data = await fetchMentorProfile();
                if (data) {
                    // Sync with storage to persist across sessions
                    const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
                    const updatedUser = {
                        ...existingUser,
                        name: data.name,
                        mentor_profile: data
                    };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    sessionStorage.setItem('user', JSON.stringify(updatedUser));
                    
                    setUser(prev => ({
                        ...prev,
                        ...data,
                        name: data.name || prev.name,
                        subRole: `mentor | ${data.companyName || data.institution || 'Expert Consultant'}`,
                        competencies: Array.isArray(data.expertiseDomains) ? data.expertiseDomains : (data.expertise || prev.competencies),
                        initials: (data.name || '').split(' ').map(n => n[0]).join('').toUpperCase() || 'SM'
                    }));
                }
            } catch (err) {
                console.error("Profile load failed:", err);
                // Fallback to localStorage if server request fails
                const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
                if (cachedUser && cachedUser.mentor_profile) {
                    setUser(prev => ({
                        ...prev,
                        ...cachedUser.mentor_profile,
                        name: cachedUser.name || prev.name,
                        subRole: `mentor | ${cachedUser.mentor_profile?.companyName || cachedUser.mentor_profile?.institution || 'Expert Consultant'}`,
                        competencies: Array.isArray(cachedUser.mentor_profile?.expertiseDomains) ? cachedUser.mentor_profile.expertiseDomains : (cachedUser.mentor_profile?.expertise || prev.competencies),
                        initials: (cachedUser.name || '').split(' ').map(n => n[0]).join('').toUpperCase() || 'SM'
                    }));
                }
            }
        };

        // Fetch data on component mount
        fetchUserData();
        
        // Listen for user-update events from other components (like after profile edit save)
        window.addEventListener('user-update', fetchUserData);
        
        return () => window.removeEventListener('user-update', fetchUserData);
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="glass-strong border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                {/* Banner Area */}
                <div className="h-48 bg-gradient-to-r from-navy-950 via-purple-950/40 to-navy-950 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                    <div className="absolute inset-0 bg-radial-at-t from-purple-500/5 to-transparent"></div>
                </div>

                {/* Profile Info Overlay */}
                <div className="px-10 pb-10 flex flex-col md:flex-row items-end gap-8 -mt-16 relative z-10">
                    <div className="w-40 h-40 rounded-[2rem] bg-navy-950 p-1 shadow-2xl ring-4 ring-purple-500/30">
                        <div className="w-full h-full rounded-[1.8rem] bg-gradient-to-br from-navy-900 to-black flex items-center justify-center text-5xl font-black text-white italic border border-white/5">
                            {user.initials}
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 mb-2">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h1 className="text-4xl font-black text-white tracking-tight">{user.name}</h1>
                            <span className="px-4 py-1.5 bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-purple-500/20">
                                {user.role || 'ELITE MENTOR'}
                            </span>
                        </div>
                        <p className="text-lg text-gray-400 font-medium italic">
                            {user.subRole}
                        </p>
                    </div>

                    <div className="mb-4">
                        <Link to="/mentor/profile/edit" className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm border border-white/10 transition-all hover:scale-105 active:scale-95 shadow-xl">
                            Edit Profile
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Stats and Competencies Column */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Stats Horizontal Bar */}
                    <div className="glass border border-white/10 rounded-[2rem] p-8 flex justify-around items-center shadow-xl">
                        <div className="text-center">
                            <p className="text-2xl font-black text-white italic">{user.stats.teams}</p>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Teams</p>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-white italic">{user.stats.rating}</p>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Rating</p>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-purple-400 italic">{user.stats.sessions}</p>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Sessions</p>
                        </div>
                    </div>

                    {/* Competencies Card */}
                    <div className="glass border border-white/10 rounded-[2.5rem] p-8 space-y-6 shadow-xl min-h-[300px]">
                        <h3 className="text-sm font-black text-purple-400 uppercase tracking-[0.25em] flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            Mentor Competencies
                        </h3>
                        <div className="space-y-5">
                            {user.competencies.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 group">
                                    <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-300 font-medium text-sm italic">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Activity Column */}
                <div className="lg:col-span-8">
                    <div className="glass border border-white/10 rounded-[2.5rem] p-10 space-y-8 shadow-2xl h-full bg-purple-950/5">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-widest">Recent Mentorship Actions</h2>
                        </div>

                        <div className="space-y-4">
                            {user.recentActions.map((action) => (
                                <div key={action.id} className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-purple-500/30 transition-all cursor-pointer group flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-white font-bold text-lg group-hover:text-purple-400 transition-colors">
                                            <span className="text-gray-500 font-medium mr-2">{action.type}:</span> 
                                            {action.title}
                                        </p>
                                        <p className="text-sm text-gray-500 font-medium">{action.detail}</p>
                                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-2">{action.time}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-600 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MentorProfile;
