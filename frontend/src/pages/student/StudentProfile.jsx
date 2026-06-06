import React from 'react';
import { Link } from 'react-router-dom';
import { fetchStudentProfile } from '../../services/student/profileApi';
import { fetchMyCertificates } from '../../api/profileApi';

const StudentProfile = () => {
    const [user, setUser] = React.useState({
        name: 'Hari Raajan G',
        role: 'Top Performer',
        subRole: 'student | Computer Science & Engineering',
        stats: {
            engagements: 124,
            collaborations: 12,
            performance: '99.9%'
        },
        competencies: [
            { name: 'Full Stack Development', level: 'Advanced', value: 95 },
            { name: 'AI & Machine Learning', level: 'Intermediate', value: 75 },
            { name: 'Cloud Architecture', level: 'Expert', value: 90 },
            { name: 'Agile Methodology', level: 'Advanced', value: 85 }
        ],
        recentActions: [
            { id: 1, type: 'Project', title: 'Global AI Summit', detail: 'Final Prototype Submitted', time: '2 hours ago' },
            { id: 2, type: 'Team', title: 'CyberGuard Alpha', detail: 'Integrated WebSocket Chat', time: '5 hours ago' },
            { id: 3, type: 'Certification', title: 'Google Cloud Engineer', detail: 'Certificate Issued', time: '1 day ago' }
        ],
        links: {
            github: 'github.com/hariraajan',
            linkedin: 'linkedin.com/in/hariraajan'
        },
        initials: 'HG',
        certificatesList: []
    });

    React.useEffect(() => {
        const fetchUserData = async () => {
            try {
                const [profileData, certsData] = await Promise.all([
                    fetchStudentProfile(),
                    fetchMyCertificates()
                ]);

                if (profileData) {
                    // Map skills to competencies with mock levels if not present
                    const skills = profileData.skills || ['React', 'Python', 'Node.js'];
                    const mappedCompetencies = skills.map(skill => {
                        if (typeof skill === 'object') return skill;
                        // Mocking levels based on skill name length for visual variety
                        const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
                        const levelIdx = Math.min(skill.length % 4, 3);
                        return {
                            name: skill,
                            level: levels[levelIdx],
                            value: 40 + (levelIdx * 20)
                        };
                    });

                    setUser(prev => ({
                        ...prev,
                        ...profileData,
                        subRole: `student | ${profileData.collegeName || profileData.college || 'Chennai Institute of Technology'}`,
                        certificatesList: certsData || [],
                        competencies: mappedCompetencies,
                        stats: {
                            ...prev.stats,
                            collaborations: certsData?.length || 0,
                            engagements: (profileData.stats?.hackathons || 0) * 5
                        },
                        links: {
                            github: profileData.links?.github || 'github.com/hariraajan',
                            linkedin: profileData.links?.portfolio || profileData.links?.linkedin || 'linkedin.com/in/hariraajan'
                        },
                        initials: (profileData.name || '').split(' ').map(n => n[0]).join('').toUpperCase() || 'HG'
                    }));
                }
            } catch (err) {
                console.error("Profile load failed:", err);
            }
        };

        fetchUserData();
        window.addEventListener('user-update', fetchUserData);
        return () => window.removeEventListener('user-update', fetchUserData);
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="glass-strong border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                <div className="h-48 bg-gradient-to-r from-navy-950 via-indigo-950 to-navy-950 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                    <div className="absolute inset-0 bg-radial-at-t from-blue-500/5 to-transparent"></div>
                </div>

                <div className="px-10 pb-10 flex flex-col md:flex-row items-end gap-8 -mt-16 relative z-10">
                    <div className="w-40 h-40 rounded-[2rem] bg-navy-950 p-1 shadow-2xl ring-4 ring-blue-500/30">
                        <div className="w-full h-full rounded-[1.8rem] bg-gradient-to-br from-navy-900 to-black flex items-center justify-center text-5xl font-black text-white italic border border-white/5">
                            {user.initials}
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 mb-2">
                        <div className="flex items-center gap-4 flex-wrap">
                            <h1 className="text-4xl font-black text-white tracking-tight">{user.name}</h1>
                            <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20">
                                {user.role || 'TOP STUDENT'}
                            </span>
                        </div>
                        <p className="text-lg text-gray-400 font-medium italic">
                            {user.subRole}
                        </p>
                        
                        {/* Social Links Integration */}
                        <div className="flex items-center gap-6 mt-4">
                            <a href={`https://${user.links.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest">GitHub</span>
                            </a>
                            <a href={`https://${user.links.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest">LinkedIn</span>
                            </a>
                        </div>
                    </div>

                    <div className="mb-4">
                        <Link to="/student/profile/edit" className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm border border-white/10 transition-all hover:scale-105 active:scale-95 shadow-xl">
                            Edit Profile
                        </Link>

                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Stats and Competencies Column */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="glass border border-white/10 rounded-[2rem] p-8 flex justify-around items-center shadow-xl">
                        <div className="text-center">
                            <p className="text-2xl font-black text-white italic">{user.stats.engagements}</p>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Engagements</p>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-white italic">{user.stats.collaborations}</p>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Certificates</p>
                        </div>
                        <div className="w-px h-10 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-2xl font-black text-blue-400 italic">{user.stats.performance || '99.9%'}</p>
                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Uptime</p>
                        </div>
                    </div>

                    {/* Skillset Level Integration */}
                    <div className="glass border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-xl min-h-[400px]">
                        <div>
                            <h3 className="text-sm font-black text-blue-400 uppercase tracking-[0.25em] flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                                Skillset Level
                            </h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 ml-4.5">Synchronized with profileModel.py</p>
                        </div>
                        
                        <div className="space-y-6">
                            {(user.competencies).map((item, idx) => (
                                <div key={idx} className="space-y-2 group">
                                    <div className="flex justify-between items-end px-1">
                                        <span className="text-gray-200 font-bold text-xs uppercase tracking-wider">{item.name}</span>
                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{item.level}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                                            style={{ width: `${item.value}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <div className="glass border border-white/10 rounded-[2.5rem] p-10 space-y-8 shadow-2xl h-full bg-navy-950/20">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-black text-white italic uppercase tracking-widest">Recent Academic Actions</h2>
                        </div>

                        <div className="space-y-4">
                            {user.recentActions.map((action) => (
                                <div key={action.id} className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-blue-500/30 transition-all cursor-pointer group flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-white font-bold text-lg group-hover:text-blue-400 transition-colors">
                                            <span className="text-gray-500 font-medium mr-2">{action.type}:</span> 
                                            {action.title}
                                        </p>
                                        <p className="text-sm text-gray-500 font-medium">{action.detail}</p>
                                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-2">{action.time}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-600 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            ))}
                            
                            {user.certificatesList.slice(0, 2).map((cert, idx) => (
                                <div key={`cert-${idx}`} className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-white font-bold text-lg group-hover:text-emerald-400 transition-colors">
                                            <span className="text-gray-500 font-medium mr-2">Certification:</span> 
                                            Achievement Earned
                                        </p>
                                        <p className="text-sm text-gray-500 font-medium">Verified by ProEduvate System</p>
                                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mt-2">Issued {new Date(cert.issuedAt).toLocaleDateString()}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-600 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-all">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

export default StudentProfile;
