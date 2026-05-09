import React, { useState, useEffect } from 'react';
import { fetchDashboardData, runSecurityAudit } from '../../services/admin/dashboardApi';

// --- Animated Value Component for Stats ---
const StatValue = ({ value, duration = 1000 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        let startTime;
        const startValue = displayValue;
        const diff = value - startValue;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(Math.floor(startValue + diff * easeOut));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);
    return <span>{displayValue.toLocaleString()}</span>;
};

const AdminDashboard = () => {
    const [stats, setStats] = useState([]);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [auditRunning, setAuditRunning] = useState(false);
    const [auditStatus, setAuditStatus] = useState('All security protocols active. Last audit: 30m ago.');

    const statIcons = {
        'Active Hackathons': (
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        ),
        'Active Users': (
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        ),
        'Pending Approvals': (
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        )
    };

    useEffect(() => {
        const loadDashboardData = async () => {
            setIsLoading(true);
            try {
                const data = await fetchDashboardData();
                const fetchedStats = (data.stats || []).map(stat => ({
                    ...stat,
                    icon: statIcons[stat.title] || null
                }));
                setStats(fetchedStats);
                setActivities(data.activities || []);
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
            {/* Header Section */}
            <div>
                <h1 className="text-3xl font-bold text-white">
                    Admin Dashboard
                </h1>
                <p className="text-gray-400 mt-2">System Intelligence // Node Admin-Dash-01</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {isLoading ? (
                    [1,2,3].map(i => <div key={i} className="glass-strong h-[180px] rounded-[2rem] border border-white/5 animate-pulse bg-navy-900/40" />)
                ) : stats.map((stat, index) => (
                    <div key={index} className="glass-strong p-8 rounded-[2rem] border border-white/5 hover:border-blue-500/20 transition-all duration-500 group relative overflow-hidden active:scale-95 shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-600/10 transition-all duration-700"></div>
                        <div className="flex items-center justify-between mb-6 relative">
                            <div className="p-4 rounded-2xl bg-white/5 group-hover:scale-110 group-hover:bg-blue-600/10 transition-all duration-500 border border-white/5">
                                {stat.icon}
                            </div>
                            {stat.isAlert ? (
                                <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20 shadow-lg shadow-red-500/10 active:scale-95 cursor-default">
                                    {stat.change}
                                </span>
                            ) : (
                                <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${stat.isPositive ? 'text-emerald-500' : 'text-red-500'} bg-white/5 px-3 py-1 rounded-full border border-white/5`}>
                                    {stat.isPositive ? '↑' : '↓'} {stat.change}
                                </span>
                            )}
                        </div>
                        <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{stat.title}</h3>
                        <p className="text-4xl font-bold text-white tracking-tight">
                            <StatValue value={stat.value} />
                        </p>
                    </div>
                ))}
            </div>

            {/* Main Content Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Section */}
                <div className="lg:col-span-2 glass-strong rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl bg-navy-900/40">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div>
                            <h2 className="text-2xl font-bold text-white uppercase">Recent Audit Log</h2>
                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">Direct stream from verification node</p>
                        </div>
                        <button className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all active:scale-95 shadow-xl">View All Actions</button>
                    </div>
                    <div className="p-8 space-y-6">
                        {isLoading ? (
                            <div className="text-center py-6 text-gray-500 text-sm italic">Loading audit stream...</div>
                        ) : activities.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 text-sm italic">No recent activities found.</div>
                        ) : activities.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-6 group cursor-pointer p-4 rounded-2xl hover:bg-white/[0.03] transition-all duration-500 border border-transparent hover:border-white/5">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-blue-600/10 transition-all duration-500 shrink-0 border border-white/5 shadow-xl">
                                    {activity.icon}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors text-sm italic">{activity.title}</h4>
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] uppercase font-black tracking-widest border border-${activity.categoryColor}-500/20 bg-${activity.categoryColor}-500/10 text-${activity.categoryColor}-400 shadow-lg`}>
                                            {activity.category}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-xs leading-relaxed italic font-medium">"{activity.description}"</p>
                                    <div className="flex items-center gap-2 mt-4">
                                        <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-[10px] text-gray-700 font-black uppercase tracking-widest">{activity.time}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Platform Health Section */}
                    <div className="glass-strong p-8 rounded-[2.5rem] border border-white/5 shadow-2xl bg-navy-900/40">
                        <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-8">System Health Protocol</h3>
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                    <span className="text-gray-500 italic">Response Latency</span>
                                    <span className="text-emerald-400 font-mono">42ms</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div className="w-[85%] h-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                    <span className="text-gray-500 italic">Database Load</span>
                                    <span className="text-blue-400 font-mono">24%</span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div className="w-[24%] h-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System Security Section */}
                    <div className="glass-strong p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 transition-transform duration-700">
                            <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-2">Protocol Shield</h3>
                        <p className={`text-[10px] uppercase font-bold tracking-widest mb-6 max-w-[200px] leading-relaxed italic \${auditStatus.includes('verified') ? 'text-emerald-500' : 'text-gray-500'}`}>{auditStatus}</p>
                        <button 
                            onClick={async () => {
                                setAuditRunning(true);
                                setAuditStatus("Running full diagnostics...");
                                try {
                                    const result = await runSecurityAudit();
                                    setAuditStatus(result.message);
                                } finally {
                                    setAuditRunning(false);
                                    setTimeout(() => setAuditStatus('All security protocols active. Last audit: Just now.'), 3000);
                                }
                            }}
                            disabled={auditRunning}
                            className={`w-full py-4 rounded-xl text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all \${auditRunning ? 'bg-blue-800 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}>
                            {auditRunning ? 'Scanning...' : 'Run Security Audit'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
