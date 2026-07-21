import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const MyHackathons = () => {
    const navigate = useNavigate();

    // --- State Management ---
    const [hackathons, setHackathons] = useState([]);
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('organizer_hackathons_tab') || 'All');
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('organizer_hackathons_search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState({}); // Tracking loading for specific hackathon IDs

    const tabs = ['All', 'Active', 'Upcoming', 'Past', 'Drafts'];

    // --- Persistence & Initial Load ---
    useEffect(() => {
        // Hydrate scroll position
        const savedScroll = sessionStorage.getItem('organizer_hackathons_scroll');
        if (savedScroll) {
            window.scrollTo(0, parseInt(savedScroll));
        }

        // Simulate API Fetch
        const fetchHackathons = async () => {
            setIsLoading(true);
            try {
                // In a real app, this would be an axios/fetch call
                await new Promise(resolve => setTimeout(resolve, 800));
                const mockData = [
                    {
                        id: 1,
                        title: "Future Tech Challenge 2026",
                        banner: "https://images.unsplash.com/photo-1504384308090-c54be3852f33?auto=format&fit=crop&q=80&w=1000",
                        startDate: "Feb 15, 2026",
                        endDate: "Feb 17, 2026",
                        mode: "Hybrid",
                        registrations: 450,
                        daysLeft: 40,
                        status: "Active",
                        regStatus: "Open",
                        isVisible: true,
                        category: "Emerging Tech"
                    },
                    {
                        id: 2,
                        title: "Green Energy Innovation Hack",
                        banner: "https://images.unsplash.com/photo-1497436072909-60f360e1d4b0?auto=format&fit=crop&q=80&w=1000",
                        startDate: "Mar 10, 2026",
                        endDate: "Mar 12, 2026",
                        mode: "Online",
                        registrations: 120,
                        daysLeft: 63,
                        status: "Upcoming",
                        regStatus: "Open",
                        isVisible: true,
                        category: "Sustainability"
                    },
                    {
                        id: 3,
                        title: "Internal Dev Sprint",
                        banner: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1000",
                        startDate: "Jan 05, 2026",
                        endDate: "Jan 07, 2026",
                        mode: "Online",
                        registrations: 85,
                        daysLeft: 0,
                        status: "Past",
                        regStatus: "Closed",
                        isVisible: false,
                        category: "Software"
                    },
                    {
                        id: 4,
                        title: "AI for Social Good",
                        banner: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1000",
                        startDate: "TBD",
                        endDate: "TBD",
                        mode: "Hybrid",
                        registrations: 0,
                        daysLeft: 0,
                        status: "Draft",
                        regStatus: "Closed",
                        isVisible: false,
                        category: "AI/ML"
                    },
                ];
                setHackathons(mockData);
            } catch (error) {
                console.error("Failed to fetch hackathons", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHackathons();

        // Scroll listener for persistence
        const handleScroll = () => {
            sessionStorage.setItem('organizer_hackathons_scroll', window.scrollY.toString());
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Save UI state on changes
    useEffect(() => {
        sessionStorage.setItem('organizer_hackathons_tab', activeTab);
        sessionStorage.setItem('organizer_hackathons_search', searchQuery);
    }, [activeTab, searchQuery]);

    // Handle Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // --- Filtering Logic ---
    const filteredHackathons = useMemo(() => {
        return hackathons.filter(h => {
            const matchesTab = activeTab === 'All' ? true : h.status === activeTab;
            const matchesSearch = h.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                h.category?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                h.mode.toLowerCase().includes(debouncedSearch.toLowerCase());
            return matchesTab && matchesSearch;
        });
    }, [hackathons, activeTab, debouncedSearch]);

    // --- Action Handlers ---
    const handleToggleVisibility = async (id) => {
        const hackathon = hackathons.find(h => h.id === id);
        if (!hackathon) return;

        // Optimistic Update
        const previousState = [...hackathons];
        setHackathons(prev => prev.map(h =>
            h.id === id ? { ...h, isVisible: !h.isVisible } : h
        ));
        setActionLoading(prev => ({ ...prev, [`vis-${id}`]: true }));

        try {
            // Simulated API Sync
            await new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Randomly simulate failure for testing rollback (10% chance)
                    // Math.random() > 0.1 ? resolve() : reject(new Error("API Failed"));
                    resolve();
                }, 1000);
            });
        } catch (error) {
            // Rollback on failure
            setHackathons(previousState);
            alert("Failed to update visibility. Please try again.");
        } finally {
            setActionLoading(prev => ({ ...prev, [`vis-${id}`]: false }));
        }
    };

    const handleToggleRegistrations = async (id) => {
        const hackathon = hackathons.find(h => h.id === id);
        if (!hackathon) return;

        const newStatus = hackathon.regStatus === 'Open' ? 'Closed' : 'Open';

        // Optimistic Update
        const previousState = [...hackathons];
        setHackathons(prev => prev.map(h =>
            h.id === id ? { ...h, regStatus: newStatus } : h
        ));
        setActionLoading(prev => ({ ...prev, [`reg-${id}`]: true }));

        try {
            // Simulated API Sync
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            // Rollback on failure
            setHackathons(previousState);
            alert("Failed to update registration status.");
        } finally {
            setActionLoading(prev => ({ ...prev, [`reg-${id}`]: false }));
        }
    };

    const handleEditTimeline = (id) => {
        navigate(`/organizer/hackathons/${id}/edit-timeline`);
    };

    const handleManage = (id) => {
        navigate(`/organizer/hackathons/${id}/manage`);
    };

    const handleCreateNew = () => {
        navigate('/organizer/create-hackathon');
    };

    // --- Render Helpers ---
    if (isLoading && hackathons.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 animate-pulse">
                <svg className="w-12 h-12 mb-4 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Loading your hackathons...</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col font-sans text-white">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 flex-none animate-in fade-in duration-500">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5">
                        My Hackathons
                    </h1>
                    <p className="text-[10px] text-gray-400">
                        Manage timeline, registrations, and visibility for your events
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-lg text-xs font-semibold transition-all active:scale-95"
                        onClick={() => console.log("Exporting hackathons...")}
                    >
                        Export List
                    </button>
                    <button
                        onClick={handleCreateNew}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center gap-1.5 active:scale-95"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Create New
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-2 mb-4 flex-none">
                <div className="flex gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeTab === tab
                                ? 'bg-white/10 text-white shadow-inner scale-105'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-56">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search title or category..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {filteredHackathons.length > 0 ? (
                        filteredHackathons.map((hackathon) => (
                            <div key={hackathon.id} className="group glass-strong border border-white/10 rounded-lg overflow-hidden hover:border-cyan-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col h-fit bg-navy-950/15">
                                {/* Banner Image */}
                                <div className="h-28 relative overflow-hidden flex-none">
                                    <img
                                        src={hackathon.banner}
                                        alt={hackathon.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 to-transparent"></div>

                                    {/* Top Right Badges */}
                                    <div className="absolute top-2 right-2 flex gap-1.5">
                                        <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded backdrop-blur-md border shadow-sm ${hackathon.status === 'Active' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                            hackathon.status === 'Draft' ? 'bg-gray-500/20 text-gray-300 border-gray-500/30' :
                                                hackathon.status === 'Upcoming' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                                                    'bg-red-500/20 text-red-300 border-red-500/30'
                                            }`}>
                                            {hackathon.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-3.5 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">{hackathon.title}</h3>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                            {hackathon.startDate} - {hackathon.endDate}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                            {hackathon.mode}
                                        </span>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                            <p className="text-[9px] text-gray-400 mb-0.5">Registrations</p>
                                            <p className="text-sm font-bold text-white">{hackathon.registrations}</p>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                            <p className="text-[9px] text-gray-400 mb-0.5">Days Left</p>
                                            <p className="text-sm font-bold text-cyan-400">{hackathon.daysLeft}</p>
                                        </div>
                                    </div>

                                    {/* Toggles */}
                                    <div className="space-y-2 mb-4 bg-white/5 p-2 rounded-lg border border-white/5">
                                        <div className={`flex items-center justify-between transition-opacity ${actionLoading[`vis-${hackathon.id}`] ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-gray-300">Visibility</span>
                                                {actionLoading[`vis-${hackathon.id}`] && (
                                                    <div className="w-2.5 h-2.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                                )}
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={hackathon.isVisible}
                                                    className="sr-only peer"
                                                    onChange={() => handleToggleVisibility(hackathon.id)}
                                                    disabled={actionLoading[`vis-${hackathon.id}`]}
                                                />
                                                <div className="w-8 h-4.5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-600"></div>
                                            </label>
                                        </div>
                                        <div className={`flex items-center justify-between transition-opacity ${actionLoading[`reg-${hackathon.id}`] ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-gray-300">Registrations</span>
                                                {actionLoading[`reg-${hackathon.id}`] && (
                                                    <div className="w-2.5 h-2.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[10px] font-medium ${hackathon.regStatus === 'Open' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {hackathon.regStatus}
                                                </span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={hackathon.regStatus === 'Open'}
                                                        className="sr-only peer"
                                                        onChange={() => handleToggleRegistrations(hackathon.id)}
                                                        disabled={actionLoading[`reg-${hackathon.id}`]}
                                                    />
                                                    <div className="w-8 h-4.5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-green-600"></div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-auto flex gap-2">
                                        <button
                                            onClick={() => handleEditTimeline(hackathon.id)}
                                            className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-lg text-xs font-semibold transition-all active:scale-95"
                                        >
                                            Edit Timeline
                                        </button>
                                        <button
                                            onClick={() => handleManage(hackathon.id)}
                                            className="flex-1 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold transition-all active:scale-95"
                                        >
                                            Manage
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-16 flex flex-col items-center justify-center text-gray-500 bg-white/5 border border-dashed border-white/10 rounded-xl animate-in fade-in duration-700">
                            <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                            </svg>
                            <p className="text-base">No hackathons found</p>
                            <p className="text-xs opacity-60 mt-0.5">Try adjusting your filters or search query</p>
                            <button
                                onClick={() => { setActiveTab('All'); setSearchQuery(''); }}
                                className="mt-4 text-cyan-400 hover:underline text-xs font-medium"
                            >
                                Reset all filters
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyHackathons;

