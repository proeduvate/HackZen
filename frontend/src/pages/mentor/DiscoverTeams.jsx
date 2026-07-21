import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDiscoverableTeams, requestMentorTeam } from '../../services/mentor/discoverTeamsApi';

const DiscoverTeams = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        hackathon: 'All',
        domain: 'All',
        size: 'All',
        status: 'All'
    });
    const [requesting, setRequesting] = useState({});

    const [teams, setTeams] = useState([]);

    useEffect(() => {
        const loadTeams = async () => {
            try {
                setIsLoading(true);
                const data = await fetchDiscoverableTeams();
                setTeams(data);
            } catch (err) {
                console.error("Failed to load discoverable teams:", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadTeams();
    }, []);

    const filteredTeams = useMemo(() => {
        return teams.filter(team => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = team.name.toLowerCase().includes(searchLower) ||
                team.description.toLowerCase().includes(searchLower) ||
                team.requiredSkills.some(s => s.toLowerCase().includes(searchLower));
            const matchesHackathon = filters.hackathon === 'All' || team.hackathon === filters.hackathon;
            const matchesDomain = filters.domain === 'All' || team.domain === filters.domain;
            const matchesSize = filters.size === 'All' || (filters.size === 'Open' ? team.members < team.maxSize : team.members >= team.maxSize);
            const matchesStatus = filters.status === 'All' || team.status === filters.status;

            return matchesSearch && matchesHackathon && matchesDomain && matchesSize && matchesStatus;
        });
    }, [teams, searchTerm, filters]);

    const handleJoinRequest = async (teamId) => {
        if (requesting[teamId]) return;
        setRequesting(prev => ({ ...prev, [teamId]: true }));
        try {
            await requestMentorTeam(teamId);
            setTeams(prev => prev.map(t => t.id === teamId ? { ...t, requested: true } : t));
        } catch (error) {
            console.error("Error requesting to mentor:", error);
        } finally {
            setRequesting(prev => {
                const next = { ...prev };
                delete next[teamId];
                return next;
            });
        }
    };

    const hackathons = ['All', ...new Set(teams.map(t => t.hackathon))];
    const domains = ['All', ...new Set(teams.map(t => t.domain))];

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 flex-none">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white">
                        Discover Teams
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">Scout for high-potential cohorts and establish mentorship protocols.</p>
                </div>
            </div>

            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-6">
                {/* Filter Matrix */}
                <div className="glass-strong p-4 rounded-xl border border-white/5 space-y-4 bg-navy-900/40 shadow-xl">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:scale-110 transition-transform duration-500">
                            <svg className="w-4 h-4 text-gray-500 group-focus-within:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search teams by name, domain, or skillset..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-6 py-1.5 bg-navy-900/50 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Hackathon', value: filters.hackathon, options: hackathons, key: 'hackathon' },
                            { label: 'Domain', value: filters.domain, options: domains, key: 'domain' },
                            { label: 'Team Size', value: filters.size, options: ['All', 'Open', 'Full'], key: 'size' },
                            { label: 'Status', value: filters.status, options: ['All', 'Ideating', 'Building', 'Done'], key: 'status' }
                        ].map((f) => (
                            <div key={f.key} className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">{f.label}</label>
                                <div className="relative group/sel">
                                    <select
                                        value={f.value}
                                        onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
                                        className="w-full bg-navy-900/50 border border-white/10 rounded-lg py-1.5 px-3 text-xs font-medium text-gray-300 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer hover:bg-navy-900 appearance-none"
                                    >
                                        {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <svg className="w-3 h-3 text-gray-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none group-hover/sel:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Entity Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        [1, 2, 3].map(i => <div key={i} className="glass-strong h-64 rounded-2xl border border-white/5 animate-pulse bg-navy-900/40 shadow-xl"></div>)
                    ) : filteredTeams.length > 0 ? (
                        filteredTeams.map(team => (
                            <div key={team.id} className="glass-strong p-4 sm:p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all duration-500 group flex flex-col shadow-xl bg-navy-900/40 relative overflow-hidden active:scale-[0.98]">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 blur-2xl -mr-12 -mt-12 group-hover:bg-blue-600/10 transition-all duration-700"></div>

                                <div className="space-y-4 flex-1 relative z-10">
                                    <div className="flex justify-between items-start">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-xl group-hover:scale-105 transition-transform shadow-md">{team.icon}</div>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${team.members < team.maxSize ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                            {team.members}/{team.maxSize} Members
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">{team.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]"></span>
                                            <p className="text-xs font-medium text-blue-400">{team.hackathon}</p>
                                        </div>
                                    </div>

                                    <p className="text-gray-400 text-xs leading-normal line-clamp-2">{team.description}</p>

                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {team.requiredSkills.map(skill => (
                                            <span key={skill} className="text-[10px] font-medium text-gray-300 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 group-hover:border-blue-500/20 transition-colors">
                                                #{skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    disabled={team.requested || requesting[team.id]}
                                    onClick={() => handleJoinRequest(team.id)}
                                    className={`mt-4 w-full py-2.5 rounded-lg text-xs font-bold transition-all shadow-md relative overflow-hidden group/btn ${team.requested
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20 active:scale-95'
                                        } flex items-center justify-center gap-1.5`}
                                >
                                    {requesting[team.id] ? (
                                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : team.requested ? (
                                        <>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                            Request Sent
                                        </>
                                    ) : (
                                        'Request to Mentor'
                                    )}
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-16 text-center glass-strong rounded-2xl border border-dashed border-white/10 shadow-xl">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl opacity-50">🔍</div>
                            <h3 className="text-lg font-bold text-white mb-1">No teams found</h3>
                            <p className="text-xs text-gray-400">Try adjusting your search or filters.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

};

export default DiscoverTeams;
