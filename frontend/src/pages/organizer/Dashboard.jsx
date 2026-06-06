import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOrganizerDashboardData } from '../../services/organizer/dashboardApi';

// --- Animated Counter Hook ---
const useAnimatedValue = (value, duration = 1000) => {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        let val = Number(value) || 0;
        let startTime;
        const startValue = displayValue;
        const diff = val - startValue;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.floor(startValue + diff * easeOut));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);
    return displayValue;
};

const OrganizerDashboard = () => {
    const navigate = useNavigate();

    // --- State Management ---
    const [dateFilter, setDateFilter] = useState(() => sessionStorage.getItem('dash_dateFilter') || '30days');
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('dash_activeTab') || 'active');
    const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('dash_searchQuery') || '');
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [stats, setStats] = useState([]);
    const [hackathonData, setHackathonData] = useState({ active: [], upcoming: [], past: [] });
    const [recentActivity, setRecentActivity] = useState([]);
    const [funnelData, setFunnelData] = useState({ accepted: 0, inReview: 0, rejected: 0 });
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    // --- API Integration ---
    const fetchDashboardData = useCallback(async (isInitial = false) => {
        if (isInitial) setIsLoading(true);
        else setIsSyncing(true);

        try {
            const data = await fetchOrganizerDashboardData(dateFilter);
            
            setStats(data.stats);
            setHackathonData(data.hackathons);
            setRecentActivity(data.activity);
            setFunnelData(data.funnelData);

        } catch (error) {
            console.error("Dashboard fetch failed", error);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
        }
    }, []);

    useEffect(() => { fetchDashboardData(true); }, [fetchDashboardData]);

    useEffect(() => {
        sessionStorage.setItem('dash_dateFilter', dateFilter);
        sessionStorage.setItem('dash_activeTab', activeTab);
        sessionStorage.setItem('dash_searchQuery', searchQuery);
    }, [dateFilter, activeTab, searchQuery]);

    const filteredHackathons = useMemo(() => {
        const list = hackathonData[activeTab] || [];
        const filtered = list.filter(h =>
            h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            h.track.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return filtered.sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [hackathonData, activeTab, searchQuery, sortConfig]);

    const StatValueComponent = ({ value }) => {
        const animated = useAnimatedValue(value);
        return <span>{animated.toLocaleString()}</span>;
    };

    const DonutChart = ({ data }) => {
        const total = data.accepted + data.inReview + data.rejected;
        const radius = 70;
        const circ = 2 * Math.PI * radius;
        const getDash = (val) => (val / total) * circ;
        return (
            <div className="relative w-44 h-44 group/chart">
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90 transition-transform duration-1000 group-hover/chart:rotate-0">
                    <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="15" />
                    <circle cx="100" cy="100" r={radius} fill="none" stroke="#22d3ee" strokeWidth="15" strokeDasharray={`${getDash(data.accepted)} ${circ}`} strokeLinecap="round" className="transition-all duration-1000 delay-100" />
                    <circle cx="100" cy="100" r={radius} fill="none" stroke="#6366f1" strokeWidth="15" strokeDasharray={`${getDash(data.inReview)} ${circ}`} strokeDashoffset={-getDash(data.accepted)} strokeLinecap="round" className="transition-all duration-1000 delay-300" />
                    <circle cx="100" cy="100" r={radius} fill="none" stroke="#ef4444" strokeWidth="15" strokeDasharray={`${getDash(data.rejected)} ${circ}`} strokeDashoffset={-(getDash(data.accepted) + getDash(data.inReview))} strokeLinecap="round" className="transition-all duration-1000 delay-500" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-3xl font-bold text-white">{total}</p>
                    <p className="text-xs font-semibold text-gray-400 uppercase">Total</p>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Organizer Dashboard</h1>
                    <p className="text-sm text-gray-400">Manage your events and participants</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-xs font-semibold text-gray-400 uppercase">Sync Status</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                <span className="text-sm font-semibold text-white">Live</span>
                            </div>
                        </div>
                        <div className="w-px h-6 bg-white/10"></div>
                        <button onClick={() => navigate('/organizer/initialize-event')} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors">
                            + Initialize Event
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.id} className="glass p-6 rounded-xl border border-white/5 hover:border-cyan-500/20 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-lg p-3 rounded-lg bg-white/5 group-hover:bg-cyan-600/10 transition-colors border border-white/5">{stat.icon}</div>
                            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase border transition-colors ${stat.isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-1">{stat.title}</h3>
                        <p className="text-2xl font-bold text-white"><StatValueComponent value={stat.value} /></p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Event Management Section */}
                <div className="xl:col-span-2 glass rounded-xl border border-white/5">
                    <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">Event Repository</h2>
                            <p className="text-sm text-gray-400">Manage active & upcoming hackathons</p>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                            {['active', 'upcoming', 'past'].map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Hackathon Name</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Registrations</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Duration</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Progress</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHackathons.map(hack => (
                                    <tr key={hack.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="py-4 px-4">
                                            <div>
                                                <p className="text-white font-semibold group-hover:text-cyan-400 transition-colors">{hack.name}</p>
                                                <p className="text-xs text-gray-400 uppercase">Class: {hack.track}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <p className="text-sm text-gray-300">{hack.registrations}</p>
                                            <p className="text-xs text-gray-500 uppercase">Linked Users</p>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-xs font-medium text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">{hack.duration}</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="w-24 space-y-2">
                                                <div className="flex justify-between text-xs text-gray-400 uppercase">
                                                    <span>Phase</span>
                                                    <span>{hack.progress}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                    <div className="h-full bg-cyan-600 transition-all duration-1000" style={{ width: `${hack.progress}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Side Panel */}
                <div className="space-y-6">
                    <div className="glass p-6 rounded-xl border border-white/5">
                        <h3 className="text-lg font-bold text-white mb-6">Submission Funnel</h3>
                        <div className="flex justify-center mb-6 relative">
                            <DonutChart data={funnelData} />
                        </div>
                        <div className="space-y-3">
                            {[
                                { label: 'Verified', val: funnelData.accepted, color: 'bg-cyan-400' },
                                { label: 'In Review', val: funnelData.inReview, color: 'bg-indigo-500' },
                                { label: 'Flagged', val: funnelData.rejected, color: 'bg-rose-500' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                                        <span className="text-sm text-gray-400">{item.label}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-white">{item.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass p-6 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">Activity Stream</h3>
                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></div>
                        </div>
                        <div className="space-y-4">
                            {recentActivity.map((act) => (
                                <div key={act.id} className="flex gap-4 relative group">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg group-hover:bg-purple-600/10 transition-colors shrink-0">
                                        {act.type === 'registration' ? '👤' : '📥'}
                                    </div>
                                    <div className="flex-1 border-b border-white/5 pb-4">
                                        <p className="text-sm font-semibold text-white">{act.action}</p>
                                        <p className="text-xs text-purple-400 italic">{act.target}</p>
                                        <p className="text-xs text-gray-500 mt-1">{act.time}</p>
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

export default OrganizerDashboard;
