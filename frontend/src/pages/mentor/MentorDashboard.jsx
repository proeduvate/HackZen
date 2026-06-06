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
                    statusColor: team.status === 'Active' ? 'emerald' : 'purple',
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
            <div className="mb-6 flex-none">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
                    Strategic Hub
                </h1>
                <p className="text-gray-400 mt-2">Manage your mentorship activities and team progress.</p>
            </div>

            {/* Search */}
            <div className="flex-none mb-6">
                <div className="relative max-w-md">
                    <input
                        type="text"
                        placeholder="Search teams..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-navy-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8 pb-10">
                {/* Incoming Requests Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">
                            Incoming Requests
                        </h2>
                        <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-sm border border-purple-500/20">
                            {pendingRequests.length} pending
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isLoading ? (
                            [1, 2].map(i => (
                                <div key={i} className="glass border border-white/10 rounded-xl p-6 animate-pulse bg-white/5">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-white/10 rounded-lg"></div>
                                        <div className="flex-1">
                                            <div className="h-4 w-2/3 bg-white/10 rounded mb-2"></div>
                                            <div className="h-3 w-1/2 bg-white/5 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="h-3 w-full bg-white/5 rounded mb-3"></div>
                                    <div className="flex gap-3">
                                        <div className="h-8 w-20 bg-white/10 rounded-lg"></div>
                                        <div className="h-8 w-16 bg-white/5 rounded-lg"></div>
                                    </div>
                                </div>
                            ))
                        ) : filteredRequests.length > 0 ? (
                                filteredRequests.map((req) => (
                            <div key={req.id} className="glass border border-white/10 rounded-xl p-6 hover:bg-white/5 transition-all duration-300 cursor-pointer group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-purple-500/20">
                                            {req.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors">{req.team}</h3>
                                            <p className="text-sm text-gray-400">{req.domain}</p>
                                        </div>
                                    </div>
                                    {req.priority && (
                                        <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs font-medium border border-red-500/20">
                                            Priority
                                        </span>
                                    )}
                                </div>

                                <p className="text-gray-300 text-sm leading-relaxed mb-4 line-clamp-2">
                                    {req.desc}
                                </p>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>{req.time}</span>
                                        <span>•</span>
                                        <span>{req.date}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAccept(req)}
                                            disabled={loadingActions[req.id]}
                                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                                        >
                                            {loadingActions[req.id] ? 'Accepting...' : 'Accept'}
                                        </button>
                                        <button className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                                ))
                        ) : (
                            <div className="col-span-full py-16 text-center">
                                <div className="bg-white/5 p-6 rounded-xl border border-dashed border-white/10 inline-block">
                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📡</div>
                                    <p className="text-gray-400 text-sm">No incoming requests found.</p>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>

                {/* Active Teams Section */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Active Teams</h2>
                        <p className="text-gray-400 mt-1">Monitor your mentored teams' progress.</p>
                    </div>

                    <div className="glass border border-white/10 rounded-xl p-6 space-y-6">
                        {isLoading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg animate-pulse">
                                    <div className="w-10 h-10 bg-white/10 rounded-lg"></div>
                                    <div className="flex-1">
                                        <div className="h-4 w-2/3 bg-white/10 rounded mb-2"></div>
                                        <div className="h-3 w-1/2 bg-white/5 rounded"></div>
                                    </div>
                                    <div className="h-6 w-12 bg-white/10 rounded"></div>
                                </div>
                            ))
                        ) : activeTeams.map(team => (
                            <div key={team.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300 cursor-pointer group">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-purple-500/20">
                                    {team.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors">{team.team}</h3>
                                        <span className="text-sm font-bold text-white tabular-nums">{team.progress}%</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            team.statusColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            team.statusColor === 'rose' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                            team.statusColor === 'blue' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                            'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                        }`}>
                                            {team.status}
                                        </span>
                                        <span className="text-xs text-gray-500">{team.nextSync}</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-1000`} style={{ width: `${team.progress}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            ))}
                    </div>

                    {/* Feedback Section */}
                    <div className="glass border border-white/10 rounded-xl p-6 hover:bg-white/5 transition-all duration-300 cursor-pointer group">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                                💬
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">Pending Feedback</h3>
                                <p className="text-gray-300 text-sm mb-4">You have feedback waiting to be reviewed from your mentored teams.</p>
                                <button
                                    onClick={() => navigate('/mentor/feedback')}
                                    className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 rounded-lg text-sm font-medium transition-all"
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
