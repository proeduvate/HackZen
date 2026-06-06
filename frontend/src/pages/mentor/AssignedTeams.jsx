import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAssignedTeams } from '../../services/mentor/assignedTeamsApi';

const AssignedTeams = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('Last Active');
    
    const [activeTeams, setActiveTeams] = useState([]);
    const [pastTeams, setPastTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlumni, setSelectedAlumni] = useState(null);

    useEffect(() => {
        const loadTeams = async () => {
            try {
                setLoading(true);
                const data = await fetchAssignedTeams();
                setActiveTeams(data.activeTeams);
                setPastTeams(data.pastTeams);
            } catch (error) {
                console.error("Failed to load teams:", error);
            } finally {
                setLoading(false);
            }
        };
        loadTeams();
    }, []);

    // Filter and sort active teams on client side
    const getFilteredAndSortedActiveTeams = () => {
        let filtered = [...activeTeams];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(team => 
                team.name.toLowerCase().includes(query) || 
                team.domain.toLowerCase().includes(query)
            );
        }

        filtered.sort((a, b) => {
            if (sortBy === 'Name (A-Z)') {
                return a.name.localeCompare(b.name);
            } else if (sortBy === 'Progress') {
                return b.progress - a.progress;
            }
            return 0; 
        });

        return filtered;
    };

    const displayActiveTeams = getFilteredAndSortedActiveTeams();

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 flex-none px-1">
                <div className="space-y-3">
                    <h1 className="text-3xl font-bold text-white">
                        Assigned Teams
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Review and manage your active team assignments.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-6 w-full lg:w-auto">
                    <div className="relative group flex-1 md:min-w-[320px]">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none group-focus-within:scale-110 transition-transform duration-500">
                            <svg className="w-5 h-5 text-gray-600 group-focus-within:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search current teams..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-8 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                        />
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/mentor/teams/join')}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all border border-white/10 hover:border-white/20 active:scale-95"
                        >
                            Join Team
                        </button>
                        <button
                            onClick={() => navigate('/mentor/teams/create')}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-xl shadow-purple-500/20 hover:opacity-90 active:scale-95 transition-all"
                        >
                            New Team
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-16 pb-10">
                {/* Active Teams Section */}
                <section>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 px-2 gap-4">
                        <div className="flex items-center gap-4">
                            <span className="w-2 h-10 bg-purple-600 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.4)]"></span>
                            <h2 className="text-3xl font-bold text-white">
                                Active Teams
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                                {displayActiveTeams.length} active
                            </span>
                            <div className="relative group">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="appearance-none bg-white/5 border border-white/10 rounded-xl py-3 pl-6 pr-10 text-sm font-semibold text-gray-200 focus:outline-none cursor-pointer hover:bg-white/10 transition-all"
                                >
                                    <option>Last Active</option>
                                    <option>Name (A-Z)</option>
                                    <option>Progress</option>
                                </select>
                                <svg className="w-4 h-4 text-gray-700 absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {[1, 2, 3].map(i => <div key={i} className="glass-strong h-80 rounded-[3rem] border border-white/5 animate-pulse bg-navy-900/40 shadow-2xl"></div>)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {displayActiveTeams.length === 0 ? (
                                <div className="col-span-full py-28 text-center glass-strong border border-dashed border-white/10 rounded-[3.5rem] shadow-2xl bg-navy-900/20">
                                     <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl opacity-20 italic">📡</div>
                                    <p className="text-sm text-gray-400">No matching cohorts detected in tactical active sector.</p>
                                </div>
                            ) : (
                                displayActiveTeams.map((team) => (
                                    <div
                                        key={team.id}
                                        className={`
                                            glass-strong border rounded-[3.5rem] p-10 relative overflow-hidden transition-all duration-700 hover:-translate-y-3 group bg-navy-900/40 shadow-2xl active:scale-[0.98] cursor-pointer
                                            ${team.status === 'Needs Attention' ? 'border-red-500/30' : 'border-white/5 hover:border-purple-500/30'}
                                        `}
                                    >
                                        <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-3xl`} />
                                        
                                        {/* Status Glow Bar */}
                                        <div className={`absolute top-0 left-0 w-full h-[3px] shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-colors duration-700 ${team.status === 'Needs Attention' ? 'bg-red-500/50' : 'bg-purple-600/30 group-hover:bg-purple-500/80'}`} />

                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-10 relative z-10">
                                            <div className="flex items-center gap-6">
                                                <div className={`w-16 h-16 rounded-[1.5rem] bg-navy-950/80 flex items-center justify-center text-4xl border border-white/10 group-hover:scale-110 transition-all duration-700 shadow-2xl relative overflow-hidden shadow-black/40`}>
                                                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <span className="relative z-10">{team.icon}</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-semibold text-white leading-tight mb-2">{team.name}</h3>
                                                    <p className="text-xs text-gray-400 font-medium">Vector: <span className="text-purple-300">{team.domain}</span></p>
                                                </div>
                                            </div>
                                            <span className={`
                                                px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-xl shadow-lg
                                                ${team.status === 'Needs Attention'
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}
                                            `}>
                                                {team.status}
                                            </span>
                                        </div>

                                        {/* Progress */}
                                        <div className="mb-10 relative z-10">
                                            <div className="flex justify-between text-sm font-semibold text-gray-400 mb-4">
                                                <span>Mission Progress</span>
                                                <span className={`${team.status === 'Needs Attention' ? 'text-red-400' : 'text-purple-300'} tabular-nums`}>{team.progress}%</span>
                                            </div>
                                            <div className="w-full bg-navy-950 rounded-full h-2.5 overflow-hidden p-[3px] border border-white/5 shadow-inner group-hover:border-purple-500/20 transition-all">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-[2000ms] ease-out shadow-[0_0_15px_rgba(255,255,255,0.1)] ${team.status === 'Needs Attention' ? 'bg-red-500' : 'bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500'}`}
                                                    style={{ width: `${team.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Metrics Grid */}
                                        <div className="grid grid-cols-2 gap-5 mb-10 relative z-10">
                                            <div className="bg-navy-950/40 rounded-[2rem] p-6 border border-white/5 group/metric hover:border-purple-500/20 transition-all shadow-inner">
                                                <p className="text-xs text-gray-400 font-semibold mb-3">Next Objective</p>
                                                <p className="text-sm font-semibold text-white leading-tight truncate" title={team.nextAction}>{team.nextAction}</p>
                                                <div className="mt-4 flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,1)]"></div>
                                                    <p className="text-xs text-purple-400 font-semibold">{team.nextActionTime}</p>
                                                </div>
                                            </div>

                                            {team.alert ? (
                                                <div className="bg-red-500/5 rounded-[2rem] p-6 border border-red-500/20 flex flex-col justify-center shadow-inner relative overflow-hidden group/alert">
                                                    <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
                                                    <p className="text-xs text-red-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-2 relative z-10">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                                        CRITICAL ALERT
                                                    </p>
                                                    <p className="text-sm text-red-200 leading-relaxed line-clamp-2 relative z-10">"{team.alert}"</p>
                                                </div>
                                            ) : (
                                                <div className="bg-navy-950/40 rounded-[2rem] p-6 border border-white/5 flex flex-col justify-center hover:border-purple-500/20 transition-all shadow-inner">
                                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">Assigned Personnel</p>
                                                    <div className="flex -space-x-3">
                                                        {[...Array(team.members)].map((_, i) => (
                                                            <div key={i} className={`w-10 h-10 rounded-full border-[3px] border-navy-950 flex items-center justify-center text-sm font-bold text-white bg-navy-900 shadow-2xl relative overflow-hidden hover:z-20 hover:scale-110 transition-all`}>
                                                                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-indigo-700/40"></div>
                                                                <span className="relative z-10">{i + 1}</span>
                                                            </div>
                                                        ))}
                                                        <div className="w-10 h-10 rounded-full border-[3px] border-navy-950 flex items-center justify-center text-sm font-bold text-gray-500 bg-navy-900 shadow-2xl">
                                                            +
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-4 relative z-10">
                                            <button 
                                                onClick={() => navigate(`/mentor/teams/${team.id}/workspace`)}
                                                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white text-sm font-semibold py-4 rounded-xl shadow-xl shadow-purple-500/20 transition-all active:scale-95"
                                            >
                                                Authorize Entry
                                            </button>
                                            <button
                                                onClick={() => {
                                                    sessionStorage.setItem('feedbackSearchTerm', team.name);
                                                    navigate('/mentor/feedback');
                                                }}
                                                className="flex-[0.8] glass hover:bg-white/10 text-gray-300 hover:text-white text-sm font-semibold py-4 rounded-xl border border-white/5 hover:border-purple-500/20 transition-all active:scale-95 px-4"
                                            >
                                                Feedback Link
                                            </button>
                                        </div>
                                    </div>
                                )))}
                        </div>
                    )}
                </section>

                {/* Past Teams Section */}
                <section className="pt-20 border-t border-white/5">
                    <div className="px-2 mb-12">
                        <h2 className="text-3xl font-bold text-white flex items-center gap-4">
                            Alumni Cohorts
                            <span className="text-xs bg-white/5 text-gray-400 px-4 py-2 rounded-full border border-white/10">
                                {pastTeams.length} records
                            </span>
                        </h2>
                        <p className="text-sm text-gray-400 mt-3">Historical team data and archived projects.</p>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => <div key={i} className="bg-white/5 h-64 rounded-xl border border-white/10 animate-pulse"></div>)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pastTeams.length === 0 ? (
                                <div className="col-span-full py-24 text-center bg-white/5 border border-dashed border-white/10 rounded-xl">
                                    <p className="text-sm text-gray-400">No alumni cohorts available.</p>
                                </div>
                            ) : (
                                pastTeams.map(team => (
                                    <div key={team.id} className="bg-white/5 border border-white/10 rounded-xl p-6 group hover:border-white/20 transition-all">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-2xl">
                                                {team.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                                                <p className="text-xs text-gray-400 font-medium mt-1">{team.domain}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Completed</p>
                                                <p className="text-sm text-gray-300 font-semibold mt-1">{team.graduatedDate}</p>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedAlumni(team)}
                                                className="text-sm font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-2 transition-colors"
                                            >
                                                View
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                )))}
                        </div>
                    )}
                </section>

                {/* Alumni Cohort Details Modal */}
                {selectedAlumni && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-navy-900/95 border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto backdrop-blur-xl">
                            {/* Header */}
                            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-navy-900/80 backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-2xl">
                                        {selectedAlumni.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{selectedAlumni.name}</h2>
                                        <p className="text-xs text-gray-400 font-medium">{selectedAlumni.domain}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedAlumni(null)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Completion Info */}
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Completion Date</p>
                                    <p className="text-lg font-semibold text-white">{selectedAlumni.graduatedDate}</p>
                                </div>

                                {/* Team Overview */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Team Overview</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                            <p className="text-xs text-gray-500 font-medium mb-2">Status</p>
                                            <p className="text-sm font-semibold text-emerald-400">Completed</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                            <p className="text-xs text-gray-500 font-medium mb-2">Archive Type</p>
                                            <p className="text-sm font-semibold text-purple-400">Alumni Cohort</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Activity Logs */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Activity Summary</h3>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-purple-400 mt-1 flex-shrink-0"></div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">Project Completed</p>
                                                <p className="text-xs text-gray-400 mt-1">{selectedAlumni.graduatedDate}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1 flex-shrink-0"></div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">Mentorship Concluded</p>
                                                <p className="text-xs text-gray-400 mt-1">Team archived for historical reference</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action */}
                                <button 
                                    onClick={() => {
                                        setSelectedAlumni(null);
                                        navigate(`/mentor/teams/${selectedAlumni.id}/workspace`);
                                    }}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold py-3 rounded-xl transition-all"
                                >
                                    View Full Archives
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssignedTeams;
