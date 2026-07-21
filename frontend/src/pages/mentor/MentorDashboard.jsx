import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAssignedTeams, fetchMentorshipRequests } from '../../services/mentor/assignedTeamsApi';

const MentorDashboard = () => {
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('mentor_search') || '');
    const [sortBy, setSortBy] = useState(() => sessionStorage.getItem('mentor_sort') || 'Date');
    const [pendingRequests, setPendingRequests] = useState([]);
    const [activeTeams, setActiveTeams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingActions, setLoadingActions] = useState({});

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [teamsResult, requestsResult] = await Promise.all([
                    fetchAssignedTeams(),
                    fetchMentorshipRequests()
                ]);
                
                // Map teams data to UI format
                const mappedTeams = teamsResult.activeTeams.map(team => ({
                    id: team.id,
                    team: team.name,
                    category: team.domain,
                    progress: team.progress || 0,
                    nextSync: team.nextActionTime || 'Pending',
                    members: team.members || 0,
                    status: team.status,
                    statusColor: team.status === 'Active' ? 'emerald' : 'blue',
                    icon: team.icon || '🚀'
                }));
                
                setActiveTeams(mappedTeams);
                setPendingRequests(requestsResult);

            } catch (error) {
                console.error("Failed to fetch mentor dashboard data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filtered Requests
    const filteredRequests = useMemo(() => {
        return pendingRequests.filter(req =>
            req.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.desc.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [pendingRequests, searchTerm]);

    // Handlers
    const handleAccept = async (request) => {
        setLoadingActions(prev => ({ ...prev, [request.id]: 'accepting' }));
        // Logic to mark notification as read and confirm assignment
        try {
            await new Promise(resolve => setTimeout(resolve, 800)); // Smooth transition
            setPendingRequests(prev => prev.filter(r => r.id !== request.id));
        } catch (err) {
            console.error("Failed to accept request", err);
        } finally {
            setLoadingActions(prev => { const next = { ...prev }; delete next[request.id]; return next; });
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-2 sm:mb-3 flex-none">
                <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                    Strategic Hub
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Manage your mentorship activities and team progress.</p>
            </div>

            {/* Search */}
            <div className="flex-none mb-2 sm:mb-3">
                <div className="relative max-w-sm">
                    <input
                        type="text"
                        placeholder="Search teams..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-navy-900/50 border border-white/10 rounded-lg py-1 pl-8 pr-2 text-[10px] sm:text-xs text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                    <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3 sm:space-y-4 pb-4">
                {/* Incoming Requests Section */}
                <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base sm:text-lg font-bold text-white">
                            Incoming Requests
                        </h2>
                        <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-[10px] border border-blue-500/20">
                            {pendingRequests.length} pending
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                        {isLoading ? (
                            [1, 2].map(i => (
                                <div key={i} className="glass border border-white/10 rounded-lg p-2 sm:p-3 animate-pulse bg-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 bg-white/10 rounded"></div>
                                        <div className="flex-1">
                                            <div className="h-2 w-2/3 bg-white/10 rounded mb-1"></div>
                                            <div className="h-1.5 w-1/2 bg-white/5 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded mb-2"></div>
                                    <div className="flex gap-1.5">
                                        <div className="h-5 w-12 bg-white/10 rounded"></div>
                                        <div className="h-5 w-8 bg-white/5 rounded"></div>
                                    </div>
                                </div>
                            ))
                        ) : filteredRequests.length > 0 ? (
                                filteredRequests.map((req) => (
                            <div key={req.id} className="glass border border-white/10 rounded-lg p-2 sm:p-3 hover:bg-white/5 transition-all duration-300 cursor-pointer group">
                                <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/10">
                                            {req.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{req.team}</h3>
                                            <p className="text-[10px] text-gray-400">{req.domain}</p>
                                        </div>
                                    </div>
                                    {req.priority && (
                                        <span className="px-1 py-0.5 bg-red-500/10 text-red-400 rounded text-[9px] font-medium border border-red-500/20">
                                            Priority
                                        </span>
                                    )}
                                </div>

                                <p className="text-gray-300 text-[10px] sm:text-xs leading-normal mb-2 line-clamp-2">
                                    {req.desc}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-gray-500">
                                        <span>{req.time}</span>
                                        <span>•</span>
                                        <span>{req.date}</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleAccept(req)}
                                            disabled={loadingActions[req.id]}
                                            className="px-2 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] font-medium rounded shadow hover:-translate-y-0.5 disabled:opacity-50"
                                        >
                                            {loadingActions[req.id] ? 'Accepting...' : 'Accept'}
                                        </button>
                                        <button className="p-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-400 hover:text-white transition-colors">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                                ))
                        ) : (
                            <div className="col-span-full py-6 text-center">
                                <div className="bg-white/5 p-3 rounded border border-dashed border-white/10 inline-block">
                                    <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 text-sm">📡</div>
                                    <p className="text-gray-400 text-[10px]">No incoming requests found.</p>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>

                {/* Active Teams Section */}
                <div className="space-y-2 sm:space-y-3">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-white">Active Teams</h2>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Monitor your mentored teams' progress.</p>
                    </div>

                    <div className="glass border border-white/10 rounded-lg p-2 sm:p-3 space-y-2 sm:space-y-3">
                        {isLoading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-2 p-2 bg-white/5 rounded animate-pulse">
                                    <div className="w-6 h-6 bg-white/10 rounded"></div>
                                    <div className="flex-1">
                                        <div className="h-2 w-2/3 bg-white/10 rounded mb-1"></div>
                                        <div className="h-1.5 w-1/2 bg-white/5 rounded"></div>
                                    </div>
                                    <div className="h-4 w-8 bg-white/10 rounded"></div>
                                </div>
                            ))
                        ) : activeTeams.map(team => (
                            <div key={team.id} className="flex items-center gap-2 sm:gap-3 p-2 bg-white/5 rounded hover:bg-white/10 transition-all duration-300 cursor-pointer group">
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow shadow-blue-500/10">
                                    {team.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-[10px] sm:text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">{team.team}</h3>
                                        <span className="text-[10px] font-bold text-white tabular-nums">{team.progress}%</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mb-1 sm:mb-1.5">
                                        <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${
                                            team.statusColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            team.statusColor === 'rose' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                            team.statusColor === 'blue' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        }`}>
                                            {team.status}
                                        </span>
                                        <span className="text-[9px] text-gray-500">{team.nextSync}</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full bg-gradient-to-r from-blue-600 to-blue-600 rounded-full transition-all duration-1000`} style={{ width: `${team.progress}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            ))}
                    </div>

                    {/* Feedback Section */}
                    <div className="glass border border-white/10 rounded-lg p-2 sm:p-3 hover:bg-white/5 transition-all duration-300 cursor-pointer group">
                        <div className="flex items-start gap-2">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs sm:text-sm shrink-0 group-hover:scale-110 transition-transform">
                                💬
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xs sm:text-sm font-semibold text-white mb-0.5 group-hover:text-blue-400 transition-colors">Pending Feedback</h3>
                                <p className="text-gray-300 text-[10px] sm:text-xs mb-2">You have feedback waiting to be reviewed from your mentored teams.</p>
                                <button
                                    onClick={() => navigate('/mentor/feedback')}
                                    className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded text-[10px] font-medium transition-all"
                                >
                                    View Feedback
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MentorDashboard;
