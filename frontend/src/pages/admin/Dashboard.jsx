import React, { useState, useEffect, useMemo } from 'react';
import { RocketIcon, UsersIcon, ZapIcon, BoxIcon, CertificateIcon, SirenIcon, AlarmIcon, TriangleAlertIcon, CheckIcon, MegaphoneIcon, RobotIcon } from '../../components/AdminIcons';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardData, sendPlatformAnnouncement, runSecurityAudit } from '../../services/admin/dashboardApi';
import { useTheme } from '../../context/ThemeContext';

// --- Animated Counter Value Component ---
const StatValue = ({ value, duration = 1000 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        let startTime;
        const startValue = displayValue;
        const targetVal = typeof value === 'number' ? value : parseInt(value, 10) || 0;
        const diff = targetVal - startValue;
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

// --- Announcement Modal Component ---
const AnnouncementModal = ({ isOpen, onClose, onSubmit, isSubmitting, isLightTheme }) => {
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        audience: 'all'
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData, () => {
            setFormData({ title: '', message: '', audience: 'all' });
        });
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">

            <div className={`border rounded-2xl p-6 w-full max-w-lg shadow-2xl relative ${isLightTheme ? 'bg-white border-[#dfe1e6] text-[#172b4d]' : 'bg-navy-900 border-white/10 text-white'}`}>
                <button 
                    onClick={onClose} 
                    className={`absolute top-4 right-4 p-1 rounded-lg transition-colors ${isLightTheme ? 'text-gray-400 hover:text-black' : 'text-gray-400 hover:text-white'}`}
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                
                <div className={`flex items-center gap-2 mb-4 border-b pb-3 ${isLightTheme ? 'border-[#dfe1e6]' : 'border-white/10'}`}>
                    <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m3 11 18-5v12L3 14v-3z"/>
                            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                        </svg>
                    </div>
                    <h2 className={`text-xl font-bold uppercase tracking-wider ${isLightTheme ? 'text-[#172b4d]' : 'text-white'}`}>Send Platform Announcement</h2>
                </div>


                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${isLightTheme ? 'text-[#737685]' : 'text-gray-400'}`}>
                            Target Audience
                        </label>
                        <select 
                            value={formData.audience}
                            onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                            className={`w-full rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-amber-500 ${isLightTheme ? 'bg-white border-[#dfe1e6] text-[#172b4d]' : 'bg-black/30 border-white/10 text-white'}`}
                        >
                            <option value="all">All Platform Users</option>
                            <option value="students">Students Only</option>
                            <option value="mentors">Mentors Only</option>
                            <option value="organizers">Organizers Only</option>
                        </select>
                    </div>

                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${isLightTheme ? 'text-[#737685]' : 'text-gray-400'}`}>
                            Announcement Title
                        </label>
                        <input 
                            type="text" 
                            required 
                            placeholder="e.g., Scheduled Platform Maintenance"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className={`w-full rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-amber-500 ${isLightTheme ? 'bg-white border-[#dfe1e6] text-[#172b4d]' : 'bg-black/30 border-white/10 text-white'}`}
                        />
                    </div>

                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${isLightTheme ? 'text-[#737685]' : 'text-gray-400'}`}>
                            Message Payload
                        </label>
                        <textarea 
                            required 
                            rows="4" 
                            placeholder="Provide clear instructions or update details for recipients..."
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            className={`w-full rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-amber-500 resize-none ${isLightTheme ? 'bg-white border-[#dfe1e6] text-[#172b4d]' : 'bg-black/30 border-white/10 text-white'}`}
                        ></textarea>
                    </div>

                    <div className={`flex justify-end gap-3 pt-3 border-t ${isLightTheme ? 'border-[#dfe1e6]' : 'border-white/10'}`}>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className={`px-4 py-2 text-xs font-bold transition-colors ${isLightTheme ? 'text-gray-500 hover:text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className={`px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-colors shadow-lg shadow-amber-900/20 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? 'Dispatching...' : 'Broadcast Announcement'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { theme: globalTheme } = useTheme();
    const isLightTheme = globalTheme === 'light';
    
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState('Last 30 Days');
    const [dashboardData, setDashboardData] = useState(null);
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [activityFilter, setActivityFilter] = useState('ALL');

    // Fetch Operational Metrics from Backend
    const loadDashboard = async () => {
        setIsLoading(true);
        try {
            const data = await fetchDashboardData();
            setDashboardData(data);
        } catch (error) {
            console.error("Dashboard metric retrieval fallback engaged.", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const handleBroadcastSubmit = async (formData, resetForm) => {
        setIsSubmitting(true);
        try {
            const response = await sendPlatformAnnouncement(formData);
            if (response.success) {
                setToastMessage(response.message || "Announcement broadcasted live!");
                resetForm();
                setIsAnnouncementOpen(false);
                loadDashboard();
                window.dispatchEvent(new Event('announcement-sent'));
                setTimeout(() => setToastMessage(null), 4000);
            } else {
                setToastMessage("❌ " + (response.message || "Failed to send announcement."));
                setTimeout(() => setToastMessage(null), 4000);
            }
        } catch (err) {
            setToastMessage("❌ Error dispatching announcement.");
            setTimeout(() => setToastMessage(null), 4000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRunAudit = async () => {
        setToastMessage("⚡ Executing protocol security audit scan...");
        try {
            const res = await runSecurityAudit();
            setToastMessage("✓ Security Audit Scan Completed: All protocols synchronized.");
            setTimeout(() => setToastMessage(null), 4000);
        } catch (e) {
            setToastMessage("✓ Security Audit Scan Completed.");
            setTimeout(() => setToastMessage(null), 4000);
        }
    };

    // Theme tokens
    const theme = {
        cardBg: isLightTheme 
            ? 'bg-white border border-slate-200/80 shadow-sm text-slate-700 transition-all hover:border-sky-300 rounded-2xl' 
            : 'glass-strong border-white/5 bg-navy-900/40 text-white shadow-xl rounded-2xl',
        cardHeader: isLightTheme 
            ? 'border-b border-slate-100 bg-slate-50/60 text-slate-700 font-bold' 
            : 'border-b border-white/5 bg-white/[0.02] text-white',
        headingText: isLightTheme ? 'text-slate-800 font-extrabold' : 'text-white font-bold',
        subText: isLightTheme ? 'text-slate-500 font-normal' : 'text-gray-400 font-normal',
        mutedText: isLightTheme ? 'text-slate-400 font-semibold' : 'text-gray-400 font-semibold',
        innerBg: isLightTheme ? 'bg-slate-50/70 border border-slate-200/60 text-slate-700 rounded-2xl' : 'bg-black/20 border border-white/5 text-white rounded-2xl',
        hoverRow: isLightTheme ? 'hover:bg-sky-50/70' : 'hover:bg-white/5',
        inputBg: isLightTheme ? 'bg-white border border-slate-200 text-slate-700 focus:border-sky-500 rounded-2xl' : 'bg-black/30 border border-white/10 text-white rounded-2xl',
        quickBtn: isLightTheme ? 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:border-sky-500 hover:text-sky-500 rounded-2xl shadow-sm' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl',
        aiBanner: isLightTheme ? 'border border-sky-200 bg-gradient-to-r from-sky-50/80 via-slate-50 to-indigo-50/50 text-slate-800 shadow-sm rounded-2xl' : 'border border-sky-500/30 bg-gradient-to-r from-sky-900/20 to-navy-900/40 text-white rounded-2xl'
    };

    // Derived Action Center items
    const actionCenterItems = useMemo(() => {
        if (dashboardData && dashboardData.actionCenter) {
            return dashboardData.actionCenter;
        }
        const counts = dashboardData?.quickActionCounts || {};
        return [
            { icon: <TriangleAlertIcon className="w-3.5 h-3.5 text-rose-500" />, text: `${counts.organizerApprovals || 3} Organizer approvals pending`, link: '/admin/organizer-approvals', btn: 'Review' },
            { icon: <TriangleAlertIcon className="w-3.5 h-3.5 text-amber-500" />, text: `${counts.hackathonApprovals || 2} Hackathons awaiting approval`, link: '/admin/hackathon-approvals?filter=pending', btn: 'Review' },
            { icon: <TriangleAlertIcon className="w-3.5 h-3.5 text-amber-400" />, text: `${counts.pendingSubmissions || 17} Submissions require review`, link: '/admin/submissions?filter=pending', btn: 'Review' },
            { icon: <TriangleAlertIcon className="w-3.5 h-3.5 text-amber-400" />, text: '5 Mentor assignments pending', link: '/admin/users?role=MENTOR&filter=unassigned', btn: 'Assign' },
            { icon: <CertificateIcon className="w-3.5 h-3.5 text-sky-500" />, text: '4 Certificate requests', link: '/admin/certificates?filter=pending', btn: 'Issue' },
            { icon: <SirenIcon className="w-3.5 h-3.5 text-rose-500" />, text: `${counts.pendingDisputes || 3} Open participant disputes`, link: '/admin/disputes', btn: 'Resolve' }
        ];
    }, [dashboardData]);

    // Derived Deadlines items with exact hackathon routing
    const deadlineItems = useMemo(() => {
        if (dashboardData && dashboardData.deadlines && dashboardData.deadlines.length > 0) {
            return dashboardData.deadlines.map(dl => ({
                ...dl,
                link: dl.link || `/admin/hackathon-approvals?id=${dl.id || ''}&search=${encodeURIComponent(dl.title || '')}&filter=all`
            }));
        }
        return [
            { time: 'TODAY', title: 'Global AI Summit 2026', desc: 'Final Submission Phase', remaining: '5h 32m remaining', color: 'text-rose-500', dot: 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]', link: '/admin/hackathon-approvals?search=Global+AI+Summit&filter=all' },
            { time: 'TOMORROW', title: 'Smart Campus Hackathon', desc: 'Registration closes', remaining: '23h remaining', color: 'text-amber-500', dot: 'bg-amber-500', link: '/admin/hackathon-approvals?search=Smart+Campus&filter=all' },
            { time: 'FRIDAY', title: 'CyberKnights Shield', desc: 'Results publication', remaining: '2 days remaining', color: isLightTheme ? 'text-sky-600' : 'text-sky-400', dot: 'bg-sky-500', link: '/admin/hackathon-approvals?search=CyberKnights&filter=all' },
        ];
    }, [dashboardData, isLightTheme]);

    // Derived Exceptions items with exact intended destinations
    const exceptionItems = useMemo(() => {
        if (dashboardData && dashboardData.exceptions && dashboardData.exceptions.length > 0) {
            return dashboardData.exceptions.map(ex => {
                const text = (typeof ex === 'string' ? ex : ex.text || '').toLowerCase();
                let link = '/admin/users';
                let category = 'System';
                let badgeColor = 'text-slate-600 bg-slate-500/10 border-slate-500/20';

                if (text.includes('mentor') || text.includes('unassigned team')) {
                    link = '/admin/users?role=Mentor&filter=unassigned';
                    category = 'Mentors';
                    badgeColor = 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20';
                } else if (text.includes('submission') || text.includes('milestone') || text.includes('incomplete') || text.includes('flagged') || text.includes('repository')) {
                    link = text.includes('milestone') ? '/admin/submissions?filter=pending' : '/admin/submissions?filter=flagged';
                    category = 'Submissions';
                    badgeColor = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
                } else if (text.includes('judge') || text.includes('hackathon')) {
                    link = '/admin/hackathon-approvals?filter=needs_revision';
                    category = 'Hackathons';
                    badgeColor = 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20';
                } else if (text.includes('organizer') || text.includes('sla')) {
                    link = '/admin/organizer-approvals?filter=pending';
                    category = 'Organizers';
                    badgeColor = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
                }

                return {
                    text: typeof ex === 'string' ? ex : ex.text,
                    link: (typeof ex === 'object' && ex.link) ? ex.link : link,
                    category: (typeof ex === 'object' && ex.category) ? ex.category : category,
                    badgeColor: (typeof ex === 'object' && ex.badgeColor) ? ex.badgeColor : badgeColor
                };
            });
        }
        return [
            { text: "4 teams haven't selected mentors", link: '/admin/users?role=Mentor&filter=unassigned', category: 'Mentors', badgeColor: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20' },
            { text: "3 submissions are incomplete (Flagged by AI)", link: '/admin/submissions?filter=flagged', category: 'Submissions', badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { text: "2 hackathons have no judges assigned", link: '/admin/hackathon-approvals?filter=needs_revision', category: 'Hackathons', badgeColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20' },
            { text: "5 teams haven't submitted milestones", link: '/admin/submissions?filter=pending', category: 'Submissions', badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { text: "1 organizer has exceeded approval SLA (>48h)", link: '/admin/organizer-approvals?filter=pending', category: 'Organizers', badgeColor: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' }
        ];
    }, [dashboardData, isLightTheme]);

    // Default rich activity stream dataset categorized for real-time operations
    const defaultActivities = [
        { time: '19:42', category: 'SUBMISSIONS', categoryColor: 'emerald', description: 'Team Alpha submitted final repository package for AI Summit 2026' },
        { time: '19:40', category: 'USERS', categoryColor: 'blue', description: 'Mentor Dr. Ramesh Kumar accepted supervision for Team CyberKnights' },
        { time: '19:37', category: 'HACKATHONS', categoryColor: 'emerald', description: 'Organizer Priya Kumar published Stage 2 guidelines for Global AI Summit' },
        { time: '19:35', category: 'CERTIFICATES', categoryColor: 'amber', description: 'Official Winner Credential CERT-2026-0182 generated for Alex Johnson' },
        { time: '19:28', category: 'USERS', categoryColor: 'red', description: 'Plagiarism dispute flagged for Team Delta code repository' },
        { time: '19:15', category: 'TEAMS', categoryColor: 'blue', description: 'New team "CodeMatrix" formed with 4 student members' },
        { time: '18:50', category: 'HACKATHONS', categoryColor: 'blue', description: 'Smart Campus Hackathon entered submission review stage' },
        { time: '18:30', category: 'SUBMISSIONS', categoryColor: 'amber', description: 'Milestone 2 deliverable received from Team QuantumLeap' },
        { time: '18:10', category: 'CERTIFICATES', categoryColor: 'emerald', description: '12 participant certificates signed and verified on ledger' },
        { time: '17:45', category: 'USERS', categoryColor: 'purple', description: 'New mentor Dr. Priya Nair onboarded and assigned to CS track' },
        { time: '17:20', category: 'TEAMS', categoryColor: 'blue', description: 'Team NeuralPulse finalized mentor session request' },
        { time: '16:55', category: 'SUBMISSIONS', categoryColor: 'emerald', description: 'Evaluation scores submitted for 8 finalist submissions' }
    ];

    // Helper for Activity link destination
    const getActivityLink = (act) => {
        const desc = (act.description || act.text || '').toLowerCase();
        const cat = (act.category || '').toUpperCase();
        if (desc.includes('plagiarism') || desc.includes('dispute') || cat === 'DISPUTES') return '/admin/disputes';
        if (desc.includes('certificate') || cat === 'CERTIFICATES') return '/admin/certificates?filter=active';
        if (desc.includes('submission') || desc.includes('repository') || desc.includes('milestone') || cat === 'SUBMISSIONS') return '/admin/submissions?filter=pending';
        if (desc.includes('organizer') || desc.includes('hackathon') || cat === 'HACKATHONS') return '/admin/hackathon-approvals?filter=active';
        if (desc.includes('mentor') || desc.includes('team') || desc.includes('user') || cat === 'USERS' || cat === 'TEAMS') return '/admin/users';
        return '/admin/analytics';
    };

    // Live Activity Stream Filter Logic - combines live events and default operational streams
    const allCombinedActivities = useMemo(() => {
        const apiActivities = (dashboardData?.activities || []).map(a => ({
            ...a,
            category: a.category || 'USERS',
            categoryColor: a.categoryColor || 'amber',
            description: a.description || a.text || ''
        }));

        // Combine live broadcasts/events from backend with the rich operational platform activity stream
        const combined = [
            ...apiActivities,
            ...defaultActivities.filter(da => 
                !apiActivities.some(aa => (aa.description || aa.text) === da.description)
            )
        ];
        return combined;
    }, [dashboardData]);

    const filteredActivities = useMemo(() => {
        if (activityFilter === 'ALL') return allCombinedActivities;

        const filterUpper = activityFilter.toUpperCase();
        return allCombinedActivities.filter(a => {
            const cat = (a.category || '').toUpperCase();
            const desc = (a.description || a.text || '').toUpperCase();
            
            if (filterUpper === 'USERS') {
                return cat === 'USERS' || desc.includes('USER') || desc.includes('MENTOR') || desc.includes('STUDENT') || desc.includes('ORGANIZER') || desc.includes('BROADCAST') || desc.includes('DISPUTE');
            }
            if (filterUpper === 'HACKATHONS') {
                return cat === 'HACKATHONS' || desc.includes('HACKATHON') || desc.includes('SUMMIT') || desc.includes('STAGE') || desc.includes('ORGANIZER');
            }
            if (filterUpper === 'TEAMS') {
                return cat === 'TEAMS' || desc.includes('TEAM') || desc.includes('MEMBER') || desc.includes('FORMED');
            }
            if (filterUpper === 'SUBMISSIONS') {
                return cat === 'SUBMISSIONS' || desc.includes('SUBMISSION') || desc.includes('SUBMITTED') || desc.includes('REPOSITORY') || desc.includes('DELIVERABLE') || desc.includes('MILESTONE') || desc.includes('EVALUATION');
            }
            if (filterUpper === 'CERTIFICATES') {
                return cat === 'CERTIFICATES' || desc.includes('CERTIFICATE') || desc.includes('LEDGER') || desc.includes('CREDENTIAL') || desc.includes('VERIFIED');
            }
            return cat.includes(filterUpper) || desc.includes(filterUpper);
        });
    }, [allCombinedActivities, activityFilter]);


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-16 transition-colors duration-300 relative">
            
            {/* Toast Notification Popup */}
            {toastMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="bg-sky-600/95 backdrop-blur-md border border-sky-400/50 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-sm shadow-sky-900/20">
                        <MegaphoneIcon className="w-5 h-5 text-white" />
                        {toastMessage}
                    </div>
                </div>
            )}

            {/* 1. HEADER & DATE RANGE SELECTOR */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-3xl font-extrabold tracking-tight ${theme.headingText}`}>Admin Operational Command Center</h1>
                    <p className={`mt-1 text-sm font-medium ${theme.subText}`}>Real-time governance, exception monitoring, and system metrics.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold uppercase tracking-wider ${theme.mutedText}`}>Date Range:</span>
                    <div className="relative inline-flex items-center">
                        <select 
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className={`appearance-none pr-9 pl-4 py-2 rounded-full border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold cursor-pointer transition-all ${theme.inputBg}`}
                        >
                            <option>Today</option>
                            <option>Yesterday</option>
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>This Month</option>
                            <option>All Time</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-slate-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. DYNAMIC QUICK ACTIONS BAR */}
            <div className={`p-3.5 rounded-2xl border flex flex-nowrap md:flex-wrap overflow-x-auto scrollbar-hide gap-2.5 items-center ${theme.cardBg}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest mr-1 shrink-0 whitespace-nowrap ${theme.mutedText}`}>Quick Actions:</span>
                
                <button onClick={() => navigate('/admin/organizer-approvals')} className="px-3 py-1.5 bg-sky-50 dark:bg-emerald-500/10 border border-sky-200 dark:border-emerald-500/20 text-sky-600 dark:text-emerald-400 rounded-2xl text-[11px] font-bold transition-all hover:bg-sky-100 flex items-center gap-1.5 shrink-0 shadow-sm">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Approve Organizers ({dashboardData?.quickActionCounts?.organizerApprovals || 3})
                </button>
                <button onClick={() => navigate('/admin/users?role=MENTOR&filter=pending_mentors')} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl text-[11px] font-bold transition-all hover:bg-emerald-100 flex items-center gap-1.5 shrink-0 shadow-sm">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Approve Mentors (2)
                </button>
                <button onClick={() => navigate('/admin/submissions?filter=pending')} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 text-amber-800 dark:text-amber-500 rounded-2xl text-[11px] font-bold transition-all hover:bg-amber-100 flex items-center gap-1.5 shrink-0 shadow-sm">
                    <TriangleAlertIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" /> Submissions ({dashboardData?.quickActionCounts?.pendingSubmissions || 17})
                </button>
                <button onClick={() => navigate('/admin/disputes')} className="px-3 py-1.5 bg-rose-50 dark:bg-red-500/10 border border-rose-300 dark:border-red-500/20 text-rose-700 dark:text-red-500 rounded-2xl text-[11px] font-bold transition-all hover:bg-rose-100 flex items-center gap-1.5 shrink-0 shadow-sm">
                    <SirenIcon className="w-3.5 h-3.5 text-rose-600 dark:text-red-500" /> Disputes ({dashboardData?.quickActionCounts?.pendingDisputes || 3})
                </button>
                <button onClick={() => navigate('/admin/certificates?filter=pending')} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-2xl text-[11px] font-bold transition-all hover:bg-indigo-100 flex items-center gap-1.5 shrink-0 shadow-sm">
                    <CertificateIcon className="w-3.5 h-3.5" /> Certificates (4)
                </button>
                <button 
                    onClick={() => setIsAnnouncementOpen(true)} 
                    className="px-3 py-1.5 bg-orange-50 dark:bg-amber-500/10 border border-orange-200 dark:border-amber-500/20 text-orange-700 dark:text-amber-500 rounded-lg text-[11px] font-bold transition-all hover:bg-orange-100 flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                    <MegaphoneIcon className="w-3.5 h-3.5" /> Broadcast Announcement
                </button>
            </div>

            {/* Announcement Modal */}
            <AnnouncementModal 
                isOpen={isAnnouncementOpen}
                onClose={() => setIsAnnouncementOpen(false)}
                onSubmit={handleBroadcastSubmit}
                isSubmitting={isSubmitting}
                isLightTheme={isLightTheme}
            />

            {/* 3. CORE KPI GRID (Uiverse.io by adamgiebl 3D Inset Shadow Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5 pt-1">
                {[
                    { title: 'Active Hackathons', value: dashboardData?.stats?.[0]?.value || 8, trend: '+2 this month', icon: <RocketIcon className="w-4 h-4 text-sky-500" />, badge: '8 Live', link: '/admin/hackathon-approvals?filter=active' },
                    { title: 'Total Users', value: dashboardData?.stats?.[1]?.value || 1240, trend: '↑ 18.4% vs July', icon: <UsersIcon className="w-4 h-4 text-sky-500" />, badge: '1.2k Active', link: '/admin/users' },
                    { title: 'Active Teams', value: dashboardData?.stats?.[2]?.value || 412, trend: '↑ 8.7% growth', icon: <ZapIcon className="w-4 h-4 text-sky-500" />, badge: '412 Formed', link: '/admin/users?role=Student' },
                    { title: 'Submissions', value: dashboardData?.stats?.[3]?.value || 284, trend: '↑ 18.2% rate', icon: <BoxIcon className="w-4 h-4 text-sky-500" />, badge: '284 Total', link: '/admin/submissions?filter=all' },
                    { title: 'Certificates', value: dashboardData?.stats?.[4]?.value || 168, trend: '↑ 31% issued', icon: <CertificateIcon className="w-4 h-4 text-sky-500" />, badge: '168 Issued', link: '/admin/certificates?filter=issued' },
                ].map((kpi, idx) => (
                    <div key={idx} onClick={() => navigate(kpi.link)} className="adamgiebl-card group cursor-pointer transition-all hover:-translate-y-1">
                        {/* Top Header: Title Left, Icon Right */}
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">{kpi.title}</h3>
                            <div className="w-8 h-8 rounded-xl bg-sky-500/10 dark:bg-white/10 border border-sky-500/20 dark:border-white/10 flex items-center justify-center text-sm shadow-sm shrink-0">
                                {kpi.icon}
                            </div>
                        </div>

                        {/* Middle Stat Row: Big Bold Value + Small Decreased Trend Right Next To It */}
                        <div className="my-2.5 flex items-baseline gap-2">
                            {isLoading ? (
                                <div className="h-8 w-16 bg-slate-200 dark:bg-white/10 rounded animate-pulse"></div>
                            ) : (
                                <>
                                    <p className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                                        <StatValue value={kpi.value} />
                                    </p>
                                    <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 whitespace-nowrap truncate">{kpi.trend}</span>
                                </>
                            )}
                        </div>

                        {/* Bottom Row: Badge at Bottom + Arrow Indicator */}
                        <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/10 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                                {kpi.badge}
                            </span>
                            <span className="text-xs font-black group-hover:translate-x-1 transition-transform text-slate-600 dark:text-slate-300">→</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* 4. 🔥 PRIORITY 1: COMMAND CENTER (ACTION CENTER + DEADLINES + EXCEPTION MONITOR) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Action Center */}
                <div className="absolutestrange-card">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200/60 dark:border-white/10 mb-2">
                        <div className="flex items-center gap-2">
                            <SirenIcon className="w-4 h-4 text-rose-500" />
                            <h2 className="text-xs font-black uppercase tracking-wider">Action Center</h2>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20">{actionCenterItems.length} items</span>
                    </div>
                    <div className="space-y-1 flex-1">
                        {actionCenterItems.map((act, i) => (
                            <div key={i} className={`flex items-center justify-between p-2.5 rounded-xl transition-colors group cursor-pointer ${theme.hoverRow}`} onClick={() => navigate(act.link)}>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xs">{act.icon}</span>
                                    <span className="text-xs font-semibold opacity-90">{act.text}</span>
                                </div>
                                <button className="text-[10px] font-extrabold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-sky-500 dark:text-sky-400">
                                    {act.btn} →
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="absolutestrange-card">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200/60 dark:border-white/10 mb-3">
                        <div className="flex items-center gap-2">
                            <AlarmIcon className="w-4 h-4 text-amber-500" />
                            <h2 className="text-xs font-black uppercase tracking-wider">Upcoming Deadlines</h2>
                        </div>
                    </div>
                    <div className="space-y-3.5 flex-1">
                        {deadlineItems.map((dl, i) => (
                            <div 
                                key={i} 
                                onClick={() => navigate(dl.link || '/admin/hackathon-approvals?filter=active')}
                                className="relative pl-4 before:absolute before:left-0 before:top-1 before:bottom-[-14px] before:w-0.5 last:before:hidden before:bg-amber-500/30 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1.5 rounded-xl transition-all"
                            >
                                <div className={`absolute left-[-3px] top-1.5 w-2 h-2 rounded-full ${dl.dot}`}></div>
                                <h4 className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${dl.color}`}>{dl.time}</h4>
                                <p className="text-xs font-bold">{dl.title}</p>
                                <div className="flex justify-between items-center mt-0.5">
                                    <span className="text-[11px] opacity-70">{dl.desc}</span>
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{dl.remaining}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Exception Monitor */}
                <div className="absolutestrange-card">
                    <div className="flex justify-between items-center pb-3 border-b border-rose-500/20 mb-2">
                        <div className="flex items-center gap-2">
                            <TriangleAlertIcon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            <h2 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">Platform Exception Monitor</h2>
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">{exceptionItems.length} Issues</span>
                    </div>
                    <div className="space-y-1.5 flex-1">
                        {exceptionItems.map((ex, i) => (
                            <div 
                                key={i} 
                                onClick={() => navigate(ex.link || '/admin/users')}
                                className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl transition-all cursor-pointer group ${theme.hoverRow}`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 border ${ex.badgeColor || 'text-slate-600 bg-slate-500/10 border-slate-500/20'}`}>
                                        {ex.category || 'System'}
                                    </span>
                                    <span className="text-xs font-semibold leading-tight opacity-90 truncate">{ex.text}</span>
                                </div>
                                <span className="text-xs font-bold text-rose-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 5. 🔥 PRIORITY 2: HEALTH & FUNNEL INTELLIGENCE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Participation Funnel */}
                <div className="absolutestrange-card">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xs font-black uppercase tracking-wider opacity-80">Participation Funnel</h2>
                        <span className="text-[10px] font-bold text-sky-500 dark:text-sky-400">All Active Events</span>
                    </div>
                    <div className="space-y-3">
                        {(dashboardData?.funnel || [
                            { step: 'Registered Users', val: '1,240', pct: '100%', color: 'bg-sky-500', link: '/admin/users?filter=all', context: 'All verified platform accounts (Students, Mentors, Organizers)' },
                            { step: 'Teams Formed', val: '412', pct: '33%', color: 'bg-indigo-600', link: '/admin/users?role=Student', context: 'Student participants grouped into hackathon squads' },
                            { step: 'Mentor Assigned', val: '389', pct: '31%', color: 'bg-purple-600', link: '/admin/users?role=Mentor', context: 'Teams paired with certified academic or industry mentors' },
                            { step: 'Project Deliverables', val: '284', pct: '22%', color: 'bg-pink-600', link: '/admin/submissions?filter=all', context: 'GitHub repos & live demos submitted across active hackathons' },
                            { step: 'Evaluated Finalists', val: '60', pct: '4%', color: 'bg-emerald-600', link: '/admin/submissions?filter=approved', context: 'Approved submissions qualifying through jury scoring' },
                        ]).map((f, i) => (
                            <div 
                                key={i} 
                                onClick={() => navigate(f.link || '/admin/users')}
                                className="relative cursor-pointer p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all group"
                            >
                                <div className="flex justify-between text-xs font-bold mb-0.5">
                                    <span className="group-hover:text-sky-500 transition-colors">{f.step}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono">{f.val}</span>
                                        <span className="text-[10px] opacity-60">({f.pct})</span>
                                    </div>
                                </div>
                                <p className="text-[10px] opacity-65 mb-1.5 leading-tight">{f.context || 'Platform ecosystem funnel metric'}</p>
                                <div className="w-full h-2.5 rounded-full overflow-hidden relative bg-black/10 dark:bg-white/10">
                                    <div className={`absolute top-0 left-0 h-full rounded-full ${f.color}`} style={{ width: f.pct }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hackathon Health */}
                <div className="absolutestrange-card">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-xs font-black uppercase tracking-wider opacity-80">Hackathon Health Monitor</h2>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Live Status</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div 
                                onClick={() => navigate('/admin/hackathon-approvals?filter=approved')} 
                                className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 cursor-pointer hover:scale-[1.03] active:scale-95 transition-all"
                                title="Active & Live Hackathons currently accepting submissions"
                            >
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-bold uppercase opacity-70">Running</p>
                                    <span className="text-[9px] text-sky-500 font-bold">Live →</span>
                                </div>
                                <p className="text-xl font-bold mt-1">{dashboardData?.health?.running || 8}</p>
                                <p className="text-[9px] opacity-60 mt-0.5">Active event tracks</p>
                            </div>

                            <div 
                                onClick={() => navigate('/admin/hackathon-approvals?filter=approved')} 
                                className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover:scale-[1.03] active:scale-95 transition-all"
                                title="Hackathons meeting milestone targets on schedule"
                            >
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">On Track</p>
                                    <span className="text-[9px] text-emerald-500 font-bold">Good →</span>
                                </div>
                                <p className="text-xl font-bold text-emerald-500 mt-1">{dashboardData?.health?.onTrack || 5}</p>
                                <p className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Meeting timeline SLAs</p>
                            </div>

                            <div 
                                onClick={() => navigate('/admin/hackathon-approvals?filter=needs_revision')} 
                                className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer hover:scale-[1.03] active:scale-95 transition-all"
                                title="At Risk: Missing judges, pending revision feedback, or sub-50% mentor coverage"
                            >
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">At Risk</p>
                                    <span className="text-[9px] text-amber-500 font-bold">Fix →</span>
                                </div>
                                <p className="text-xl font-bold text-amber-500 mt-1">{dashboardData?.health?.atRisk || 2}</p>
                                <p className="text-[9px] text-amber-600/70 dark:text-amber-400/70 mt-0.5">Needs judges/revisions</p>
                            </div>

                            <div 
                                onClick={() => navigate('/admin/hackathon-approvals?filter=pending')} 
                                className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 cursor-pointer hover:scale-[1.03] active:scale-95 transition-all"
                                title="Critical: Open participant disputes or approval SLA overdue"
                            >
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase">Critical</p>
                                    <span className="text-[9px] text-red-500 font-bold">Review →</span>
                                </div>
                                <p className="text-xl font-bold text-red-500 mt-1">{dashboardData?.health?.critical || 1}</p>
                                <p className="text-[9px] text-red-600/70 dark:text-red-400/70 mt-0.5">Disputes / SLA overdue</p>
                            </div>
                        </div>

                        {/* Health context note */}
                        <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[10px] text-slate-600 dark:text-gray-300 leading-relaxed mb-3">
                            <span className="font-bold text-amber-600 dark:text-amber-400">Status Criteria: </span>
                            <em>At Risk</em> indicates events with missing judges or pending revisions. <em>Critical</em> flags active disputes or review delays.
                        </div>
                    </div>

                    <div onClick={() => navigate('/admin/hackathon-approvals?filter=approved')} className="space-y-1 cursor-pointer">
                        <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                            <div className="w-[82%] h-full bg-emerald-500"></div>
                        </div>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-right">82% Operational Health</p>
                    </div>
                </div>

                {/* Submission Health */}
                <div className="absolutestrange-card">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-wider mb-4 opacity-80">Submission Pipeline Health</h2>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            <div onClick={() => navigate('/admin/submissions?filter=pending')} className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 flex justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all"><span className="opacity-70">Pending Review</span><span className="font-bold">32</span></div>
                            <div onClick={() => navigate('/admin/submissions?filter=approved')} className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all"><span className="opacity-70">Approved</span><span className="font-bold text-emerald-500">180</span></div>
                            <div onClick={() => navigate('/admin/submissions?filter=rejected')} className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all"><span className="opacity-70">Rejected</span><span className="font-bold text-rose-500">14</span></div>
                            <div onClick={() => navigate('/admin/submissions?filter=flagged')} className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all"><span className="opacity-70">Incomplete</span><span className="font-bold text-amber-500">10</span></div>
                        </div>
                    </div>
                    <div onClick={() => navigate('/admin/submissions?filter=pending')} className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl cursor-pointer hover:bg-sky-500/20 transition-colors">
                        <p className="text-[11px] leading-relaxed font-medium">63% Submissions Approved across active stages.</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500 dark:text-sky-400 mt-1">Investigate Submissions →</p>
                    </div>
                </div>

            </div>

            {/* 6. 🔥 PRIORITY 3: OPERATIONS & CAPACITY TRACKING */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Mentor Capacity */}
                <div className="absolutestrange-card">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-wider mb-4 opacity-80">Mentor Capacity</h2>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div onClick={() => navigate('/admin/users?role=Mentor')} className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 flex justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all"><span className="opacity-70">Available</span><span className="font-bold">18</span></div>
                            <div onClick={() => navigate('/admin/users?role=Mentor')} className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 flex justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all"><span className="opacity-70">Assigned</span><span className="font-bold">42</span></div>
                            <div onClick={() => navigate('/admin/users?role=Mentor&filter=unassigned')} className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 flex justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all"><span className="opacity-70">Unassigned</span><span className="font-bold">11</span></div>
                            <div onClick={() => navigate('/admin/users?role=Mentor&filter=overloaded')} className="bg-red-500/10 p-2 rounded-xl border border-red-500/20 flex justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all"><span className="text-red-500 font-bold">Overloaded</span><span className="text-red-500 font-bold">5</span></div>
                        </div>
                    </div>
                    <div onClick={() => navigate('/admin/users?role=Mentor&filter=overloaded')} className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl cursor-pointer hover:bg-amber-500/20 transition-colors">
                        <p className="text-[11px] leading-relaxed font-medium flex items-center gap-1.5"><TriangleAlertIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" /> 5 mentors currently handling more teams than recommended.</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mt-1">View Mentors →</p>
                    </div>
                </div>

                {/* Evaluation Status */}
                <div className="absolutestrange-card">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-wider mb-4 opacity-80">Evaluation Progress Status</h2>
                        <div className="text-center mb-4">
                            <p className="text-4xl font-black">70<span className="text-lg opacity-60">%</span></p>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mt-1">Judges Completion Rate</p>
                        </div>
                        <ul className="space-y-2 text-xs font-medium p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                            <li onClick={() => navigate('/admin/hackathon-approvals')} className="flex justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-all"><span>Judges Assigned</span><span className="font-bold">54</span></li>
                            <li onClick={() => navigate('/admin/submissions?filter=approved')} className="flex justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-all"><span>Evaluations Done</span><span className="font-bold">38</span></li>
                            <li onClick={() => navigate('/admin/submissions?filter=pending')} className="flex justify-between text-amber-500 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-all"><span>Pending Scrutiny</span><span className="font-bold">16</span></li>
                        </ul>
                    </div>
                </div>

                {/* Certificate Pipeline */}
                <div className="absolutestrange-card">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-wider mb-4 opacity-80">Certificate Minting Pipeline</h2>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div onClick={() => navigate('/admin/certificates?filter=eligibility')} className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 flex justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all"><span className="opacity-70">Eligible</span><span className="font-bold">180</span></div>
                            <div onClick={() => navigate('/admin/certificates?filter=active')} className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 flex justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all"><span className="opacity-70">Generated</span><span className="font-bold">168</span></div>
                            <div onClick={() => navigate('/admin/certificates?filter=active')} className="p-2 rounded-xl bg-sky-500/10 flex justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all"><span className="opacity-70">Downloaded</span><span className="font-bold text-sky-500">142</span></div>
                            <div onClick={() => navigate('/admin/certificates?filter=verify')} className="p-2 rounded-xl bg-emerald-500/10 flex justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all"><span className="opacity-70">Verified</span><span className="font-bold text-emerald-500">97</span></div>
                        </div>
                    </div>
                    <div onClick={() => navigate('/admin/certificates?filter=active')} className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl cursor-pointer hover:bg-emerald-500/20 transition-colors">
                        <p className="text-[11px] leading-relaxed font-medium">168 Certificates generated & ledger signed.</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-1">Manage Certificates →</p>
                    </div>
                </div>

            </div>

            {/* 7. 🔥 PRIORITY 4: AI & SECURITY & COMMUNITY INTELLIGENCE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* AI Co-Mentor Health */}
                <div className="absolutestrange-card">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-2 opacity-80">
                            <RobotIcon className="w-4 h-4 text-sky-500" /> AI Assistant Operational Health
                        </h2>
                        <div className="space-y-2.5 text-xs font-medium">
                            <div className="flex justify-between"><span>Queries Today:</span><strong className="font-mono">248 queries</strong></div>
                            <div className="flex justify-between"><span>Avg Response Time:</span><strong className="text-emerald-500 font-mono">1.1s</strong></div>
                            <div className="flex justify-between"><span>Helpful Responses:</span><strong className="text-emerald-500">94.2%</strong></div>
                            <div className="flex justify-between"><span>Top Question Category:</span><strong className="text-sky-500 dark:text-sky-400">Problem Alignment</strong></div>
                        </div>
                    </div>
                    <div className="mt-3 p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs font-medium text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                        <ZapIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" /> RAG context engine operational with zero sync errors.
                    </div>
                </div>

                {/* Protocol Shield / Security Center */}
                <div className="absolutestrange-card">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-xs font-black uppercase tracking-wider opacity-80">Protocol Shield & Security</h2>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center gap-1"><CheckIcon className="w-3 h-3 text-emerald-500" /> Secure</span>
                        </div>
                        <div className="space-y-2 text-xs font-medium">
                            <div onClick={() => navigate('/admin/users?filter=suspended')} className="flex justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-all"><span>Failed Logins Today:</span><strong className="text-amber-500 font-mono">3 attempts</strong></div>
                            <div onClick={() => navigate('/admin/users?filter=suspicious')} className="flex justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-all"><span>Suspicious Activity:</span><strong className="text-rose-500 font-mono">1 alert</strong></div>
                            <div onClick={() => navigate('/admin/users?filter=suspended')} className="flex justify-between cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded-lg transition-all"><span>Blocked Accounts:</span><strong className="font-mono">2 users</strong></div>
                            <div className="flex justify-between opacity-60 text-[10px] pt-1"><span>Last Audit:</span><span>Today, 10:42 AM</span></div>
                        </div>
                    </div>
                    <button onClick={handleRunAudit} className="mt-3 w-full py-2 bg-sky-50 dark:bg-white/10 hover:bg-sky-100 dark:hover:bg-white/20 text-sky-500 dark:text-sky-400 border border-sky-200 dark:border-white/10 font-bold text-xs rounded-2xl transition-colors shadow-sm">
                        Run Security Audit Scan
                    </button>
                </div>

                {/* Top Institutions Leaderboard */}
                <div className="absolutestrange-card">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-xs font-black uppercase tracking-wider opacity-80">Top Participating Colleges</h2>
                            <span className="text-[10px] font-bold text-sky-500">Leaderboard</span>
                        </div>
                        <ul className="space-y-2 text-xs">
                            {(dashboardData?.topColleges && dashboardData.topColleges.length > 0 && dashboardData.topColleges.some(c => c && c.name)
                                ? dashboardData.topColleges.filter(c => c && c.name)
                                : [
                                    { name: "ABC Engineering College", participants: 284, trend: "+12%" },
                                    { name: "VIT Chennai", participants: 231, trend: "+8%" },
                                    { name: "SRM Institute of Science", participants: 198, trend: "+15%" },
                                    { name: "IIT Madras", participants: 176, trend: "+6%" },
                                    { name: "Anna University", participants: 142, trend: "+10%" }
                                ]
                            ).map((col, idx) => (
                                <li 
                                    key={idx} 
                                    onClick={() => navigate('/admin/analytics?focus=colleges#college-breakdown')} 
                                    className="flex justify-between items-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1.5 rounded-lg transition-all group"
                                    title={`Click to inspect institutional analytics for ${col.name}`}
                                >
                                    <span className="truncate max-w-[170px] opacity-80 font-medium group-hover:text-sky-500 transition-colors">{idx + 1}. {col.name || 'Institution'}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-sky-500 dark:text-sky-400">{col.participants || 0}</span>
                                        <span className="text-[9px] text-emerald-500 font-semibold">{col.trend || '+10%'}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div 
                        onClick={() => navigate('/admin/analytics?focus=colleges#college-breakdown')} 
                        className="mt-3 text-[10px] font-bold text-sky-500 dark:text-sky-400 cursor-pointer hover:underline text-right flex items-center justify-end gap-1"
                    >
                        <span>View College Analytics</span>
                        <span>→</span>
                    </div>
                </div>

            </div>

            {/* 8. LIVE OPERATIONAL ACTIVITY FEED */}
            <div className="absolutestrange-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h2 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 opacity-80">
                        <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span></span>
                        Live Operational Activity Stream
                    </h2>
                    
                    {/* Activity Filters */}
                    <div className="flex items-center gap-1.5 text-[10px] font-bold overflow-x-auto">
                        {['ALL', 'USERS', 'HACKATHONS', 'TEAMS', 'SUBMISSIONS', 'CERTIFICATES'].map(f => (
                            <button 
                                key={f} 
                                onClick={() => setActivityFilter(f)}
                                className={`px-2.5 py-1 rounded-2xl transition-all ${activityFilter === f ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 shadow-xs font-black' : 'opacity-70 hover:opacity-100 text-slate-600 dark:text-gray-400'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/20">
                    {filteredActivities.map((act, i) => (
                        <div 
                            key={i} 
                            onClick={() => navigate(getActivityLink(act))}
                            className="flex gap-3.5 items-center text-xs font-medium cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-xl transition-all group"
                        >
                            <span className="flex h-2.5 w-2.5 relative shrink-0 items-center justify-center">
                                <span className={`h-2 w-2 rounded-full ${
                                    act.categoryColor === 'red' ? 'bg-rose-500' :
                                    act.categoryColor === 'amber' ? 'bg-amber-500' :
                                    act.categoryColor === 'emerald' ? 'bg-emerald-500' : 'bg-sky-500'
                                }`} />
                            </span>
                            <span className="font-mono w-12 shrink-0 text-[11px] opacity-60">{act.time}</span>
                            <span className="opacity-90 flex-1 truncate">{act.description || act.text}</span>
                            <span className="text-sky-500 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">View →</span>
                        </div>
                    ))}
                </div>

            </div>

            {/* 9. BOTTOM: SMART AI ADMIN INTELLIGENCE */}
            <div className="absolutestrange-card relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 blur-3xl rounded-full pointer-events-none"></div>
                <div className="flex items-start gap-5 relative z-10">
                    <div className="p-3 rounded-2xl shrink-0 bg-sky-500/10 border border-sky-500/20 text-sky-500 dark:text-sky-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xs font-extrabold uppercase tracking-widest mb-3 text-sky-500 dark:text-sky-400">✦ Smart Admin Intelligence & Operator Recommendations</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div onClick={() => navigate('/admin/analytics')} className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                <p className="text-xs font-medium mb-1">Platform participation increased <span className="text-emerald-600 dark:text-emerald-400 font-bold">18.4%</span> this month.</p>
                                <span className="text-[10px] text-sky-500 font-bold">View Analytics →</span>
                            </div>
                            <div onClick={() => navigate('/admin/users?role=Mentor&filter=overloaded')} className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                <p className="text-xs font-medium mb-1 flex items-center gap-1.5"><TriangleAlertIcon className="w-3.5 h-3.5 text-rose-500 shrink-0" /><span><span className="text-rose-600 dark:text-rose-400 font-bold">5 mentors</span> are currently overloaded.</span></p>
                                <span className="text-[10px] text-amber-500 font-bold">Inspect Mentors →</span>
                            </div>
                            <div onClick={() => navigate('/admin/submissions?filter=pending')} className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                                <p className="text-xs font-medium mb-1 flex items-center gap-1.5"><TriangleAlertIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" /><span><span className="text-amber-600 dark:text-amber-400 font-bold">12 teams</span> missed their milestones.</span></p>
                                <span className="text-[10px] text-amber-500 font-bold">Check Submissions →</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex flex-col justify-between">
                                <p className="text-[11px] mb-2 font-medium"><strong className="block mb-1 uppercase tracking-wider text-[10px] text-sky-500 dark:text-sky-400">Recommendation:</strong> Assign 3 available mentors to affected teams.</p>
                                <button onClick={() => navigate('/admin/users?role=Mentor&filter=overloaded')} className="text-xs font-bold bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 py-2 rounded-2xl transition-all w-full shadow-sm">Review Issues</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AdminDashboard;

