import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTeamsMentorsJudges, assignMentorToTeam } from '../../services/organizer/teamsMentorsApi';

const TeamsMentors = () => {
    const navigate = useNavigate();
    // --- State Management ---
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('tm_activeTab') || 'teams');
    const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('tm_searchTerm') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    const [statusFilter, setStatusFilter] = useState(() => sessionStorage.getItem('tm_statusFilter') || 'all');
    const [sortOption, setSortOption] = useState(() => sessionStorage.getItem('tm_sortOption') || 'newest');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Data states
    const [teams, setTeams] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [judges, setJudges] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({});

    // Assignment UI State
    const [assigningTeamId, setAssigningTeamId] = useState(null);

    // --- API Integration ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await fetchTeamsMentorsJudges();
                setTeams(data.teams);
                setMentors(data.mentors);
                setJudges(data.judges);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- Persistence & Search Debouncing ---
    useEffect(() => {
        sessionStorage.setItem('tm_activeTab', activeTab);
        sessionStorage.setItem('tm_searchTerm', searchTerm);
        sessionStorage.setItem('tm_statusFilter', statusFilter);
        sessionStorage.setItem('tm_sortOption', sortOption);
    }, [activeTab, searchTerm, statusFilter, sortOption]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, debouncedSearch, statusFilter, sortOption]);

    // --- Filtering Logic ---
    const filteredContent = useMemo(() => {
        let data = [];
        if (activeTab === 'teams') data = [...teams];
        else if (activeTab === 'mentors') data = [...mentors];
        else if (activeTab === 'judges') data = [...judges];

        // Search Filter
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase();
            data = data.filter(item => {
                if (activeTab === 'teams') {
                    return item.name.toLowerCase().includes(query) ||
                        item.domain.toLowerCase().includes(query) ||
                        item.members.some(m => m.name.toLowerCase().includes(query));
                }
                return item.name.toLowerCase().includes(query) ||
                    (item.domain || item.affiliation || '').toLowerCase().includes(query);
            });
        }

        // Status Filter (Teams Only)
        if (activeTab === 'teams' && statusFilter !== 'all') {
            data = data.filter(team => team.status.toLowerCase() === statusFilter.toLowerCase());
        }

        // Sorting
        data.sort((a, b) => {
            if (sortOption === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            if (sortOption === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            if (sortOption === 'name') return a.name.localeCompare(b.name);
            return 0;
        });

        return data;
    }, [activeTab, teams, mentors, judges, debouncedSearch, statusFilter, sortOption]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredContent.slice(start, start + itemsPerPage);
    }, [filteredContent, currentPage]);

    const totalPages = Math.ceil(filteredContent.length / itemsPerPage);

    // --- Action Handlers ---
    const handleAssignMentor = async (teamId, mentor) => {
        setAssigningTeamId(null);
        setActionLoading(prev => ({ ...prev, [`assign-${teamId}`]: true }));

        try {
            await assignMentorToTeam(teamId, mentor);
            
            // Refresh data to show updated assignments
            const data = await fetchTeamsMentorsJudges();
            setTeams(data.teams);
            setMentors(data.mentors);
        } catch (error) {
            console.error("Failed to assign mentor:", error);
            alert("Failed to assign mentor. Please try again.");
        } finally {
            setActionLoading(prev => ({ ...prev, [`assign-${teamId}`]: false }));
        }
    };

    const handleExport = () => {
        console.log(`Exporting ${activeTab} data...`);
        // Implementation for CSV/JSON export
    };

    // --- Icons Component ---
    const Icon = ({ name, className }) => {
        const icons = {
            Search: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
            Filter: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />,
            Sort: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />,
            Plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
            Download: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />,
            UserAdd: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />,
            Eye: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
            ChevronDown: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />,
        };
        return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                {icons[name]}
            </svg>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Teams & Mentors</h1>
                    <p className="text-sm text-gray-400">Oversee participant teams and assign mentorship</p>
                </div>

                {/* Primary Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95"
                    >
                        <Icon name="Download" className="w-4 h-4" />
                        Export Data
                    </button>
                    <button 
                        onClick={() => navigate('/organizer/invite-mentors')}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                    >
                        <Icon name="UserAdd" className="w-4 h-4" />
                        Invite Mentors
                    </button>
                </div>
            </div>

            {/* Tabs Filter */}
            <div className="border-b border-white/10">
                <div className="flex gap-8 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                        { id: 'teams', label: 'All Teams', count: teams.length },
                        { id: 'mentors', label: 'Mentors', count: mentors.length },
                        { id: 'judges', label: 'Judges', count: judges.length },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 text-sm font-medium capitalize transition-all relative flex items-center gap-2 whitespace-nowrap
                                ${activeTab === tab.id ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}
                            `}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold
                                    ${activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/10 text-gray-300'}
                                `}>
                                    {tab.count}
                                </span>
                            )}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                {/* Search */}
                <div className="relative w-full md:w-80 group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon name="Search" className="w-4 h-4 text-gray-400 group-focus-within:text-cyan-400 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {activeTab === 'teams' && (
                        <div className="relative flex-1 md:flex-none">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full appearance-none pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:text-white cursor-pointer hover:bg-white/10 transition-colors"
                            >
                                <option value="all">All Status</option>
                                <option value="qualified">Qualified</option>
                                <option value="pending">Pending</option>
                                <option value="waitlisted">Waitlisted</option>
                            </select>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Icon name="Filter" className="w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                    )}

                    <div className="relative flex-1 md:flex-none">
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="w-full appearance-none pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:text-white cursor-pointer hover:bg-white/10 transition-colors"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="name">Name (A-Z)</option>
                        </select>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Icon name="Sort" className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Table */}
            <div className="glass rounded-xl border border-white/5 overflow-visible relative">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400 animate-pulse">
                        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4 text-cyan-500"></div>
                        <p>Loading table data...</p>
                    </div>
                ) : filteredContent.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-500 bg-white/5 rounded-2xl">
                        <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        <p className="text-lg">No results found</p>
                        <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} className="text-cyan-400 text-sm mt-2 hover:underline">Reset filters</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto overflow-visible">
                        <table className="w-full text-left border-collapse relative">
                            <thead>
                                <tr className="bg-white/5">
                                    {activeTab === 'teams' ? (
                                        <>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Team Name</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Members</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Status</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Assigned Mentor</th>
                                        </>
                                    ) : activeTab === 'mentors' ? (
                                        <>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Mentor Name</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Domain/Expertise</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Assigned Teams</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Status</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Judge Name</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Affiliation</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Domain</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Bio</th>
                                        </>
                                    )}
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paginatedData.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                        {activeTab === 'teams' ? (
                                            <>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600/20 to-blue-600/20 flex items-center justify-center border border-white/10 text-cyan-400 font-bold">
                                                            {item.logo}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{item.name}</p>
                                                            <p className="text-xs text-gray-400">{item.domain}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex -space-x-2">
                                                        {item.members.slice(0, 3).map((member) => (
                                                            <div key={member.id} className="w-8 h-8 rounded-full bg-navy-800 border-2 border-navy-900 flex items-center justify-center text-xs font-semibold text-gray-300 shadow-sm" title={member.name}>
                                                                {member.avatar}
                                                            </div>
                                                        ))}
                                                        {item.members.length > 3 && (
                                                            <div className="w-8 h-8 rounded-full bg-navy-700 border-2 border-navy-900 flex items-center justify-center text-xs font-semibold text-gray-400 shadow-sm">
                                                                +{item.members.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.12em]
                                                        ${item.status === 'Qualified' ? 'bg-green-500/20 text-green-400' :
                                                            item.status === 'Waitlisted' ? 'bg-orange-500/20 text-orange-400' :
                                                                'bg-blue-500/20 text-blue-400'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 relative">
                                                    {item.mentor ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-semibold text-indigo-400 border border-indigo-500/30">
                                                                {item.mentor.avatar}
                                                            </div>
                                                            <span className="text-sm text-gray-300">{item.mentor.name}</span>
                                                            <button
                                                                onClick={() => setAssigningTeamId(item.id)}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white transition-opacity"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => setAssigningTeamId(item.id)}
                                                                disabled={actionLoading[`assign-${item.id}`]}
                                                                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-all px-2 py-1 rounded hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 disabled:opacity-50"
                                                            >
                                                                {actionLoading[`assign-${item.id}`] ? (
                                                                    <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <Icon name="Plus" className="w-3 h-3" />
                                                                )}
                                                                Assign Mentor
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Inline Assignment Dropdown */}
                                                    {assigningTeamId === item.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-10" onClick={() => setAssigningTeamId(null)}></div>
                                                            <div className="absolute top-full left-0 mt-1 w-48 bg-navy-800 border border-white/10 rounded-xl shadow-2xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                                                                <p className="px-4 py-2 text-xs text-gray-400 uppercase font-semibold tracking-[0.16em] border-b border-white/5 mb-1">Select Mentor</p>
                                                                <div className="max-h-40 overflow-y-auto scrollbar-hide">
                                                                    {mentors.map(m => (
                                                                        <button
                                                                            key={m.id}
                                                                            onClick={() => handleAssignMentor(item.id, m)}
                                                                            className="w-full px-4 py-2 text-left hover:bg-white/5 text-sm text-gray-300 hover:text-white flex items-center gap-2"
                                                                        >
                                                                            <div className="w-5 h-5 rounded-full bg-navy-700 flex items-center justify-center text-[9px] font-bold border border-white/10">
                                                                                {m.avatar}
                                                                            </div>
                                                                            {m.name}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <button
                                                                    onClick={() => handleAssignMentor(item.id, null)}
                                                                    className="w-full px-4 py-2 text-left hover:bg-red-500/10 text-xs text-red-400 font-medium border-t border-white/5 mt-1"
                                                                >
                                                                    Remove Mentor
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                            </>
                                        ) : activeTab === 'mentors' ? (
                                            <>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400 font-bold">
                                                            {item.avatar}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{item.name}</p>
                                                            <p className="text-xs text-gray-400">Mentor Account</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="text-sm text-gray-300 mb-1">{item.domain}</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.expertise.map(skill => (
                                                                <span key={skill} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-gray-400">{skill}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-medium text-white">{item.assignedTeams}</span>
                                                    <span className="text-xs text-gray-500 ml-1">teams</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs font-semibold uppercase tracking-[0.12em] border border-green-500/20">Active</span>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 text-gray-300 font-bold">
                                                            {item.avatar}
                                                        </div>
                                                        <p className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{item.name}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-gray-300">{item.affiliation}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-xs font-semibold uppercase border border-cyan-500/20">{item.domain}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">{item.bio}</p>
                                                </td>
                                            </>
                                        )}
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                                <Icon name="Eye" className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/[0.02]">
                    <span className="text-xs text-gray-500">
                        Showing <span className="text-white font-medium">{filteredContent.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-</span>
                        <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, filteredContent.length)}</span> of
                        <span className="text-white font-medium"> {filteredContent.length}</span> {activeTab}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-xs font-medium text-gray-400 bg-white/5 hover:bg-white/10 rounded-md transition-colors disabled:opacity-50 border border-white/5 active:scale-95"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-3 py-1 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50 active:scale-95"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamsMentors;

