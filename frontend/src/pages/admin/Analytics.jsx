import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileTextIcon, ExcelSheetIcon, PrinterIcon, UsersIcon, RocketIcon, FlagIcon, TriangleAlertIcon, ShieldIcon, BoxIcon, CertificateIcon, ZapIcon, ToolsIcon, TeacherIcon, RobotIcon, StarIcon, LockIcon, SirenIcon } from '../../components/AdminIcons';
import { 
    LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, 
    CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { fetchDashboardData, performGlobalSearch } from '../../services/admin/dashboardApi';
import { 
    fetchAnalyticsOverview,
    fetchUserAnalytics,
    fetchRegistrationTrend,
    fetchHackathonAnalytics,
    fetchTeamsSubmissionsAnalytics,
    fetchMentorsJudgesAnalytics,
    fetchAiCertificatesAnalytics,
    fetchSecurityPerformanceAnalytics,
    fetchSmartAiInsights
} from '../../services/admin/analyticsApi';
import { useTheme } from '../../context/ThemeContext';

// --- MOCK & DEFAULT DATA FALLBACKS ---
const defaultRegistrationTrendData = [
    { name: 'Jan', students: 420, mentors: 40, organizers: 8 },
    { name: 'Feb', students: 650, mentors: 55, organizers: 12 },
    { name: 'Mar', students: 1100, mentors: 80, organizers: 18 },
    { name: 'Apr', students: 1550, mentors: 110, organizers: 24 },
    { name: 'May', students: 2150, mentors: 150, organizers: 32 },
    { name: 'Jun', students: 2840, mentors: 210, organizers: 45 }
];

const defaultRoleDistribution = [
    { name: 'Students', value: 78, color: '#3b82f6' },
    { name: 'Mentors', value: 12, color: '#f59e0b' },
    { name: 'Organizers', value: 7, color: '#8b5cf6' },
    { name: 'Admins', value: 3, color: '#10b981' }
];

const defaultCollegeDistribution = [
    { college: 'ABC Engg College', students: 480 },
    { college: 'VIT Chennai', students: 390 },
    { college: 'SRM Institute', students: 310 },
    { college: 'IIT Madras', students: 260 },
    { college: 'Anna University', students: 190 }
];

const defaultTechStackDistribution = [
    { tech: 'React / Next.js', count: 420 },
    { tech: 'Python / PyTorch', count: 380 },
    { tech: 'Node.js / Express', count: 290 },
    { tech: 'FastAPI / MongoDB', count: 210 },
    { tech: 'Solidity / Web3', count: 140 }
];

const defaultSubmissionTimelineData = [
    { week: 'Week 1', submissions: 140, evaluated: 110 },
    { week: 'Week 2', submissions: 280, evaluated: 230 },
    { week: 'Week 3', submissions: 520, evaluated: 410 },
    { week: 'Week 4', submissions: 940, evaluated: 820 }
];

const defaultAiQueriesTrend = [
    { day: 'Mon', queries: 1420, avgLatency: '1.1s' },
    { day: 'Tue', queries: 1850, avgLatency: '1.2s' },
    { day: 'Wed', queries: 2400, avgLatency: '1.0s' },
    { day: 'Thu', queries: 3100, avgLatency: '1.3s' },
    { day: 'Fri', queries: 2900, avgLatency: '1.1s' },
    { day: 'Sat', queries: 3800, avgLatency: '1.2s' },
    { day: 'Sun', queries: 4100, avgLatency: '1.1s' }
];

const defaultSystemPerformanceData = [
    { time: '00:00', latency: 42, cpu: 14, memory: 32 },
    { time: '04:00', latency: 38, cpu: 12, memory: 30 },
    { time: '08:00', latency: 45, cpu: 22, memory: 38 },
    { time: '12:00', latency: 52, cpu: 35, memory: 45 },
    { time: '16:00', latency: 48, cpu: 28, memory: 42 },
    { time: '20:00', latency: 41, cpu: 19, memory: 35 }
];

const defaultTopMentors = [
    { rank: '#1', name: 'Ananya Rao', company: 'Microsoft', sessions: 28, rating: '4.95' },
    { rank: '#2', name: 'Priya Sharma', company: 'Google', sessions: 24, rating: '4.92' },
    { rank: '#3', name: 'Kumar S', company: 'Amazon', sessions: 21, rating: '4.88' },
    { rank: '#4', name: 'Rohan Verma', company: 'ProEduvate', sessions: 18, rating: '4.85' }
];

const defaultTopHackathons = [
    { rank: '#1', name: 'Global AI Summit 2026', participants: 642, submissions: 148, completion: '88%' },
    { rank: '#2', name: 'CyberKnights Shield', participants: 410, submissions: 92, completion: '82%' },
    { rank: '#3', name: 'EcoTech Green Sprint', participants: 320, submissions: 78, completion: '79%' },
    { rank: '#4', name: 'FinTech DeFi Challenge', participants: 240, submissions: 54, completion: '74%' }
];

// Custom Theme-Aware Tooltip Component for all Recharts Graphs
const CustomChartTooltip = ({ active, payload, label, isLightTheme }) => {
    if (active && payload && payload.length) {
        return (
            <div className={`p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all ${
                isLightTheme 
                ? 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-300/50' 
                : 'bg-[#1A1F2C]/95 border-white/10 text-white shadow-black/80'
            }`}>
                {label && <p className="text-xs font-black text-[#0ea5e9] dark:text-sky-400 mb-1.5 uppercase tracking-wider">{label}</p>}
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} className="text-xs font-semibold flex items-center justify-between gap-4 my-1">
                        <span className="flex items-center gap-1.5 opacity-90" style={{ color: isLightTheme ? '#334155' : '#e2e8f0' }}>
                            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm" style={{ backgroundColor: entry.color || '#0ea5e9' }}></span>
                            {entry.name || entry.dataKey}:
                        </span>
                        <span className="font-extrabold font-mono" style={{ color: entry.color || (isLightTheme ? '#0f172a' : '#ffffff') }}>
                            {entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// Reusable Top KPI Card Component
const KpiCard = ({ title, value, change, isPositive, icon, onClick }) => (
    <div onClick={onClick} className="adamgiebl-card group cursor-pointer transition-all hover:-translate-y-1 p-4 flex flex-col justify-between w-full h-full">
        <div className="flex items-center justify-between gap-1 mb-1">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">{title}</h3>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 dark:bg-white/10 border border-sky-500/20 dark:border-white/10 flex items-center justify-center shrink-0">
                {icon}
            </div>
        </div>
        <div className="my-2 flex items-baseline gap-1.5">
            <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
            <span className={`text-[10px] font-extrabold whitespace-nowrap ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isPositive ? '↑' : '↓'} {change}
            </span>
        </div>
        <div className="pt-1.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[9px] font-extrabold">
            <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">vs last mo</span>
            <span className="group-hover:translate-x-1 transition-transform opacity-60">→</span>
        </div>
    </div>
);


// Reusable Compact Division Metric Card Component (High Density, Sleek & Fully Visible)
const MetricItemCard = ({ label, value, valueColor, isLightTheme }) => (
    <div className={`p-2.5 rounded-xl border transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[58px] ${
        isLightTheme 
            ? 'bg-slate-100/90 border-slate-200/90 text-slate-900 shadow-sm hover:bg-white hover:border-blue-400' 
            : 'bg-white/[0.04] border-white/10 text-white shadow-sm hover:bg-white/[0.08] hover:border-blue-500/40'
    }`}>
        <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className={`text-base sm:text-lg font-black tracking-tight leading-tight mt-1 ${valueColor || (isLightTheme ? 'text-slate-900' : 'text-white')}`}>
            {value}
        </p>
    </div>
);

// Reusable Collapsible Analytics Section Frame
const AnalyticsSection = ({ id, title, icon, isExpanded, onToggle, children }) => (
    <div id={`section-${id}`} className="absolutestrange-card overflow-hidden transition-all p-0 scroll-mt-6">
        <button 
            onClick={onToggle}
            className="w-full p-5 flex items-center justify-between border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] text-left focus:outline-none"
        >
            <div className="flex items-center gap-3">
                <span className="text-xl p-2 rounded-xl bg-blue-50 dark:bg-white/5 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-white/10">{icon}</span>
                <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{title}</h2>
                    <p className="text-xs text-slate-500 dark:text-gray-400">Detailed metric breakdown and trend indicators</p>
                </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
            </div>
        </button>
        {isExpanded && (
            <div className="p-6 space-y-6 animate-in fade-in duration-300">
                {children}
            </div>
        )}
    </div>
);

const AdminAnalytics = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { theme: currentTheme } = useTheme();
    const isLightTheme = currentTheme === 'light';

    // In-App Toast Notification
    const [toastMessage, setToastMessage] = useState(null);
    const showToast = (text, type = 'info') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    const theme = {
        cardBg: isLightTheme 
            ? 'bg-white border border-slate-300 shadow-sm text-slate-900' 
            : 'glass-strong border-white/5 bg-navy-900/40 text-white shadow-xl',
        headingText: isLightTheme ? 'text-slate-900 font-extrabold' : 'text-white font-bold',
        subText: isLightTheme ? 'text-slate-600 font-medium' : 'text-gray-400 font-medium',
        mutedText: isLightTheme ? 'text-slate-500 font-bold' : 'text-gray-400 font-bold',
        innerBg: isLightTheme ? 'bg-slate-50 border border-slate-200 text-slate-800 shadow-sm' : 'bg-black/20 border border-white/5 text-white',
        inputBg: isLightTheme ? 'bg-white border border-slate-300 text-slate-900 shadow-sm focus:border-blue-600' : 'bg-black/20 border border-white/10 text-white'
    };

    // Filter Controls State
    const [dateRange, setDateRange] = useState('Last 30 Days');
    const [selectedHackathon, setSelectedHackathon] = useState('All Events');
    const [selectedCollege, setSelectedCollege] = useState('All Colleges');
    const [selectedRole, setSelectedRole] = useState('All Roles');

    // Dynamic Live Data States
    const [kpis, setKpis] = useState(null);
    const [userMetrics, setUserMetrics] = useState(null);
    const [roleDistData, setRoleDistData] = useState(defaultRoleDistribution);
    const [collegeDistData, setCollegeDistData] = useState(defaultCollegeDistribution);
    const [registrationData, setRegistrationData] = useState(defaultRegistrationTrendData);
    const [hackathonMetrics, setHackathonMetrics] = useState(null);
    const [topHackathonsData, setTopHackathonsData] = useState(defaultTopHackathons);
    const [teamsMetrics, setTeamsMetrics] = useState(null);
    const [submissionTimeline, setSubmissionTimeline] = useState(defaultSubmissionTimelineData);
    const [techStackData, setTechStackData] = useState(defaultTechStackDistribution);
    const [mentorsMetrics, setMentorsMetrics] = useState(null);
    const [topMentorsData, setTopMentorsData] = useState(defaultTopMentors);
    const [aiCertMetrics, setAiCertMetrics] = useState(null);
    const [aiQueriesData, setAiQueriesData] = useState(defaultAiQueriesTrend);
    const [securityMetrics, setSecurityMetrics] = useState(null);
    const [systemPerfData, setSystemPerfData] = useState(defaultSystemPerformanceData);
    const [aiInsights, setAiInsights] = useState([]);

    // Load Live Analytics Data from Backend
    useEffect(() => {
        const loadAnalyticsData = async () => {
            const params = { range: dateRange, hackathon: selectedHackathon, college: selectedCollege, role: selectedRole };
            
            const [
                overviewRes, usersRes, regRes, hacksRes, teamsRes, mentorsRes, aiCertRes, secRes, insightsRes
            ] = await Promise.all([
                fetchAnalyticsOverview(params),
                fetchUserAnalytics(params),
                fetchRegistrationTrend(params),
                fetchHackathonAnalytics(params),
                fetchTeamsSubmissionsAnalytics(params),
                fetchMentorsJudgesAnalytics(params),
                fetchAiCertificatesAnalytics(params),
                fetchSecurityPerformanceAnalytics(params),
                fetchSmartAiInsights()
            ]);

            if (overviewRes?.kpis) setKpis(overviewRes.kpis);
            if (usersRes?.metrics) setUserMetrics(usersRes.metrics);
            if (usersRes?.roleDistribution) setRoleDistData(usersRes.roleDistribution);
            if (usersRes?.collegeDistribution) setCollegeDistData(usersRes.collegeDistribution);
            if (regRes?.trend && Array.isArray(regRes.trend)) {
                setRegistrationData(regRes.trend.map(t => ({
                    name: t.name || t.month || 'Month',
                    month: t.month || t.name || 'Month',
                    students: Number(t.students) || 0,
                    mentors: Number(t.mentors) || 0,
                    organizers: Number(t.organizers) || 0
                })));
            }
            if (hacksRes?.metrics) setHackathonMetrics(hacksRes.metrics);
            if (hacksRes?.topHackathons) setTopHackathonsData(hacksRes.topHackathons);
            if (teamsRes?.metrics) setTeamsMetrics(teamsRes.metrics);
            if (teamsRes?.submissionTimeline) setSubmissionTimeline(teamsRes.submissionTimeline);
            if (teamsRes?.techStackDistribution) setTechStackData(teamsRes.techStackDistribution);
            if (mentorsRes?.metrics) setMentorsMetrics(mentorsRes.metrics);
            if (mentorsRes?.topMentors) setTopMentorsData(mentorsRes.topMentors);
            if (aiCertRes?.metrics) setAiCertMetrics(aiCertRes.metrics);
            if (aiCertRes?.aiQueriesTrend) setAiQueriesData(aiCertRes.aiQueriesTrend);
            if (secRes?.metrics) setSecurityMetrics(secRes.metrics);
            if (secRes?.systemPerformanceData) setSystemPerfData(secRes.systemPerformanceData);
            if (insightsRes?.insights) setAiInsights(insightsRes.insights);
        };

        loadAnalyticsData();
    }, [dateRange, selectedHackathon, selectedCollege, selectedRole]);

    // Section Expand Collapse State
    const [expandedSections, setExpandedSections] = useState({
        users: true,
        hackathons: true,
        teamsSubmissions: true,
        mentorsJudges: true,
        aiCertificates: true,
        securityPerformance: true,
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const expandAll = () => {
        setExpandedSections({
            users: true,
            hackathons: true,
            teamsSubmissions: true,
            mentorsJudges: true,
            aiCertificates: true,
            securityPerformance: true,
        });
    };

    const collapseAll = () => {
        setExpandedSections({
            users: false,
            hackathons: false,
            teamsSubmissions: false,
            mentorsJudges: false,
            aiCertificates: false,
            securityPerformance: false,
        });
    };

    // Smooth Scroll to Section on KPI Card Click
    const scrollToSection = (sectionId) => {
        setExpandedSections(prev => ({ ...prev, [sectionId]: true }));
        setTimeout(() => {
            const el = document.getElementById(`section-${sectionId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 80);
    };

    // Deep Link URL sync for Section & Focus scrolling (e.g. colleges leaderboard)
    useEffect(() => {
        const focus = searchParams.get('focus') || searchParams.get('section');
        const hash = window.location.hash;
        if (focus === 'colleges' || hash === '#college-breakdown' || hash === '#colleges') {
            setExpandedSections(prev => ({ ...prev, users: true }));
            setTimeout(() => {
                const el = document.getElementById('college-breakdown') || document.getElementById('section-users');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-4', 'ring-sky-500', 'ring-offset-4', 'dark:ring-offset-slate-900');
                    showToast("Scrolled to Top Participating Colleges & Institutions", "info");
                    setTimeout(() => {
                        el.classList.remove('ring-4', 'ring-sky-500', 'ring-offset-4', 'dark:ring-offset-slate-900');
                    }, 3500);
                }
            }, 400);
        }
    }, [searchParams]);

    // Search Omnibar State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                try {
                    const results = await performGlobalSearch(searchQuery);
                    setSearchResults(results);
                } catch (err) {
                    setSearchResults({
                        users: [{ id: 'u1', name: 'Alex Johnson', email: searchQuery, role: 'STUDENT' }],
                        teams: [],
                        hackathons: []
                    });
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults(null);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    // Client-side File Downloader Helper
    const downloadFile = (content, fileName, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Export Generation Logic for CSV, Excel, and PDF
    const handleExport = (format) => {
        if (format === 'PDF') {
            showToast("Opening printable layout for PDF export...", "success");
            setTimeout(() => window.print(), 350);
            return;
        }

        try {
            const timestamp = new Date().toISOString().slice(0, 10);
            const summaryRows = [
                ["HackZen Central Platform Analytics & Intelligence Report"],
                [`Export Generated: ${new Date().toLocaleString()}`],
                [`Date Range: ${dateRange} | Hackathon Scope: ${selectedHackathon} | College: ${selectedCollege} | Role: ${selectedRole}`],
                [],
                ["--- KEY PERFORMANCE INDICATORS ---"],
                ["Metric", "Value", "Growth / Change"],
                ["Total Users", kpis?.totalUsers?.val || "1248", kpis?.totalUsers?.change || "+12.4%"],
                ["Running Hackathons", kpis?.runningHacks?.val || "4", kpis?.runningHacks?.change || "+2"],
                ["Completed Hackathons", kpis?.completedHacks?.val || "12", kpis?.completedHacks?.change || "+4"],
                ["Pending Approvals", kpis?.pendingApprovals?.val || "17", kpis?.pendingApprovals?.change || "Action needed"],
                ["Active Teams", kpis?.activeTeams?.val || "324", kpis?.activeTeams?.change || "+8.7%"],
                ["Submissions", kpis?.submissions?.val || "3842", kpis?.submissions?.change || "+18.2%"],
                ["Certificates Minted", kpis?.certificates?.val || "1126", kpis?.certificates?.change || "+31%"],
                ["System Uptime", kpis?.uptime?.val || "99.98%", kpis?.uptime?.change || "100% Target"],
                [],
                ["--- TOP HACKATHONS ---"],
                ["Rank", "Hackathon Event", "Participants", "Submissions", "Completion Rate"],
                ...topHackathonsData.map(h => [h.rank, h.name, h.participants, h.submissions, h.completion]),
                [],
                ["--- TOP MENTORS ---"],
                ["Rank", "Mentor Name", "Organization", "Sessions", "Rating"],
                ...topMentorsData.map(m => [m.rank, m.name, m.company, m.sessions, m.rating]),
                [],
                ["--- USER DEMOGRAPHICS BY ROLE ---"],
                ["Role", "Percentage", "Count"],
                ...roleDistData.map(r => [r.name, `${r.value}%`, r.count || "N/A"]),
                [],
                ["--- TOP INSTITUTIONS ---"],
                ["Institution", "Registered Students"],
                ...collegeDistData.map(c => [c.college, c.students]),
                [],
                ["--- TECH STACK POPULARITY ---"],
                ["Technology", "Usage Count"],
                ...techStackData.map(t => [t.tech, t.count])
            ];

            if (format === 'CSV') {
                const csvContent = "\uFEFF" + summaryRows
                    .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
                    .join('\n');
                downloadFile(csvContent, `HackZen_Analytics_${timestamp}.csv`, 'text/csv;charset=utf-8;');
                showToast("Analytics report downloaded as CSV successfully!", "success");
            } else if (format === 'Excel') {
                const excelContent = "\uFEFF" + summaryRows
                    .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join('\t'))
                    .join('\n');
                downloadFile(excelContent, `HackZen_Analytics_${timestamp}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
                showToast("Analytics report downloaded as Excel spreadsheet!", "success");
            }
        } catch (err) {
            console.error("Export error:", err);
            showToast("Failed to generate analytics export file.", "error");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-16">

            {/* In-App Toast Alert */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-bottom-5 duration-300 ${
                    toastMessage.type === 'success' ? 'bg-sky-600 text-white border border-sky-400/30 shadow-sky-900/20' :
                    toastMessage.type === 'error' ? 'bg-red-700 text-white' :
                    'bg-slate-900 dark:bg-slate-800 text-white border border-white/10'
                }`}>
                    <span>{toastMessage.text}</span>
                </div>
            )}
            
            {/* 1. TOP HEADER & EXPORT ACTION BUTTONS */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Central Analytics Command</h1>
                    <p className="text-slate-600 dark:text-gray-400 mt-1 text-sm font-medium">Real-time platform intelligence, cross-module monitoring, and AI insights.</p>
                </div>
                
                {/* Export Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => handleExport('PDF')} className="px-4 py-2 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
                        <FileTextIcon className="w-3.5 h-3.5" /> Export PDF
                    </button>
                    <button onClick={() => handleExport('Excel')} className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
                        <ExcelSheetIcon className="w-3.5 h-3.5" /> Export Excel
                    </button>
                    <button onClick={() => handleExport('CSV')} className="px-4 py-2 bg-purple-50 dark:bg-purple-500/20 hover:bg-purple-100 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
                        <FileTextIcon className="w-3.5 h-3.5" /> Export CSV
                    </button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
                        <PrinterIcon className="w-3.5 h-3.5" /> Print Report
                    </button>
                </div>
            </div>

            {/* 2. ADVANCED TOP FILTER CONTROLS BAR */}
            <div className={`p-4 rounded-2xl border ${theme.cardBg} flex flex-wrap items-center justify-between gap-3 shadow-md`}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${theme.mutedText}`}>Date Range:</span>
                        <div className="relative inline-flex items-center">
                            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className={`appearance-none pr-8 pl-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer outline-none transition-all border ${theme.inputBg}`}>
                                <option>Last 30 Days</option>
                                <option>Last 7 Days</option>
                                <option>This Month</option>
                                <option>All Time</option>
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                <svg className="w-3 h-3 text-slate-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${theme.mutedText}`}>Hackathon:</span>
                        <div className="relative inline-flex items-center">
                            <select value={selectedHackathon} onChange={(e) => setSelectedHackathon(e.target.value)} className={`appearance-none pr-8 pl-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer outline-none transition-all border ${theme.inputBg}`}>
                                <option>All Events</option>
                                <option>Global AI Summit 2026</option>
                                <option>CyberKnights Shield</option>
                                <option>EcoTech Green Sprint</option>
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                <svg className="w-3 h-3 text-slate-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${theme.mutedText}`}>College:</span>
                        <div className="relative inline-flex items-center">
                            <select value={selectedCollege} onChange={(e) => setSelectedCollege(e.target.value)} className={`appearance-none pr-8 pl-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer outline-none transition-all border ${theme.inputBg}`}>
                                <option>All Colleges</option>
                                <option>ABC Engineering College</option>
                                <option>VIT Chennai</option>
                                <option>SRM Institute</option>
                                <option>IIT Madras</option>
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                <svg className="w-3 h-3 text-slate-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${theme.mutedText}`}>Role:</span>
                        <div className="relative inline-flex items-center">
                            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className={`appearance-none pr-8 pl-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer outline-none transition-all border ${theme.inputBg}`}>
                                <option>All Roles</option>
                                <option>Students</option>
                                <option>Mentors</option>
                                <option>Organizers</option>
                                <option>Admins</option>
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                <svg className="w-3 h-3 text-slate-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={expandAll} className="px-3 py-1.5 bg-blue-50 dark:bg-white/5 border border-blue-200 dark:border-white/10 rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-white/10 transition-colors active:scale-95">
                        Expand All
                    </button>
                    <button onClick={collapseAll} className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-bold text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors active:scale-95">
                        Collapse All
                    </button>
                </div>
            </div>

            {/* 3. MASTER SEARCH OMNIBAR */}
            <div className="relative z-40" ref={searchRef}>
                <div className="relative">
                    <svg className="w-5 h-5 absolute left-4 top-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        className="block w-full pl-12 pr-4 py-3.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-blue-500/30 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-all shadow-md text-sm font-medium"
                        placeholder="Master Search: Track User, College, Team Code, or Hackathon ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                        <div className="absolute right-4 top-4">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                        </div>
                    )}
                </div>
                {searchResults && (
                    <div className="absolute mt-2 w-full bg-navy-900 border border-white/10 rounded-xl shadow-2xl p-4 animate-in fade-in z-50">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Contextual Search Results</h4>
                        {searchResults.users?.length > 0 && (
                            <div className="space-y-2 mb-2">
                                {searchResults.users.map((u, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => navigate('/admin/users')}
                                        className="bg-black/20 p-3 rounded-lg border border-white/5 flex justify-between items-center hover:bg-white/5 cursor-pointer"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-white">{u.name || u.email} <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded ml-2 uppercase">{u.role || 'USER'}</span></p>
                                            <p className="text-xs text-gray-400">{u.email}</p>
                                        </div>
                                        <span className="text-xs text-sky-400 font-bold">View User →</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 4. TOP 8 PLATFORM KPI CARDS GRID */}
            <div>
                <h2 className={`text-xs font-black uppercase tracking-wider mb-3 ${theme.mutedText}`}>Live Platform Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                    <KpiCard 
                        title="Total Users" 
                        value={kpis?.totalUsers?.val || "1,248"} 
                        change={kpis?.totalUsers?.change || "12.4%"} 
                        isPositive={kpis?.totalUsers?.isPositive ?? true} 
                        icon={<UsersIcon className="w-4 h-4 text-sky-500" />} 
                        onClick={() => scrollToSection('users')}
                    />
                    <KpiCard 
                        title="Running Hacks" 
                        value={kpis?.runningHacks?.val || "4"} 
                        change={kpis?.runningHacks?.change || "+2"} 
                        isPositive={kpis?.runningHacks?.isPositive ?? true} 
                        icon={<RocketIcon className="w-4 h-4 text-sky-500" />} 
                        onClick={() => scrollToSection('hackathons')}
                    />
                    <KpiCard 
                        title="Completed Hacks" 
                        value={kpis?.completedHacks?.val || "12"} 
                        change={kpis?.completedHacks?.change || "+4"} 
                        isPositive={kpis?.completedHacks?.isPositive ?? true} 
                        icon={<FlagIcon className="w-4 h-4 text-emerald-500" />} 
                        onClick={() => scrollToSection('hackathons')}
                    />
                    <KpiCard 
                        title="Pending Approvals" 
                        value={kpis?.pendingApprovals?.val || "17"} 
                        change={kpis?.pendingApprovals?.change || "Action"} 
                        isPositive={kpis?.pendingApprovals?.isPositive ?? false} 
                        icon={<TriangleAlertIcon className="w-4 h-4 text-rose-500" />} 
                        onClick={() => navigate('/admin/approvals')}
                    />
                    <KpiCard 
                        title="Active Teams" 
                        value={kpis?.activeTeams?.val || "324"} 
                        change={kpis?.activeTeams?.change || "8.7%"} 
                        isPositive={kpis?.activeTeams?.isPositive ?? true} 
                        icon={<ShieldIcon className="w-4 h-4 text-purple-500" />} 
                        onClick={() => scrollToSection('teamsSubmissions')}
                    />
                    <KpiCard 
                        title="Submissions" 
                        value={kpis?.submissions?.val || "3,842"} 
                        change={kpis?.submissions?.change || "18.2%"} 
                        isPositive={kpis?.submissions?.isPositive ?? true} 
                        icon={<BoxIcon className="w-4 h-4 text-indigo-500" />} 
                        onClick={() => scrollToSection('teamsSubmissions')}
                    />
                    <KpiCard 
                        title="Certificates" 
                        value={kpis?.certificates?.val || "1,126"} 
                        change={kpis?.certificates?.change || "31%"} 
                        isPositive={kpis?.certificates?.isPositive ?? true} 
                        icon={<CertificateIcon className="w-4 h-4 text-amber-500" />} 
                        onClick={() => scrollToSection('aiCertificates')}
                    />
                    <KpiCard 
                        title="Uptime" 
                        value={kpis?.uptime?.val || "99.98%"} 
                        change={kpis?.uptime?.change || "100%"} 
                        isPositive={kpis?.uptime?.isPositive ?? true} 
                        icon={<ZapIcon className="w-4 h-4 text-emerald-500" />} 
                        onClick={() => scrollToSection('securityPerformance')}
                    />
                </div>
            </div>


            {/* SECTION 1: USER ANALYTICS */}
            <AnalyticsSection 
                id="users" 
                title="1. User Analytics & Demographic Growth" 
                icon={<UsersIcon className="w-5 h-5 text-sky-500" />} 
                isExpanded={expandedSections.users} 
                onToggle={() => toggleSection('users')}
            >
                {/* Compact High-Density User Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    <MetricItemCard label="New Today" value={userMetrics?.newToday || 48} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Weekly Growth" value={userMetrics?.weeklyGrowth || "+14%"} valueColor="text-emerald-600 dark:text-emerald-400" isLightTheme={isLightTheme} />
                    <MetricItemCard label="Monthly Growth" value={userMetrics?.monthlyGrowth || "+28%"} valueColor="text-emerald-600 dark:text-emerald-400" isLightTheme={isLightTheme} />
                    <MetricItemCard label="Retention Rate" value={userMetrics?.retentionRate || "78%"} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Active Users" value={userMetrics?.activeUsers || 846} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Inactive" value={userMetrics?.inactive || 380} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Suspended" value={userMetrics?.suspended || 22} valueColor="text-rose-600 dark:text-rose-400" isLightTheme={isLightTheme} />
                    <MetricItemCard label="Verified Users" value={userMetrics?.verified || 1180} valueColor="text-emerald-600 dark:text-emerald-400" isLightTheme={isLightTheme} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Registration Trend Chart */}
                    <div className={`lg:col-span-2 p-5 rounded-2xl border transition-all duration-500 hover:shadow-xl hover:border-sky-500/30 animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-3 ${theme.cardBg}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`text-sm font-black ${theme.headingText}`}>User Registration Trend by Role</h3>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                                Live Feed
                            </span>
                        </div>
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart key={`reg-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`} data={registrationData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'} vertical={false} />
                                    <XAxis dataKey="name" stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                    <YAxis stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                    <Tooltip content={<CustomChartTooltip isLightTheme={isLightTheme} />} />
                                    <Line 
                                        type="monotone" 
                                        dataKey="students" 
                                        name="Students" 
                                        stroke="#0052cc" 
                                        strokeWidth={3} 
                                        dot={{r: 4, fill: '#0052cc', strokeWidth: 2, stroke: isLightTheme ? '#ffffff' : '#0f172a'}} 
                                        activeDot={{r: 6, stroke: '#0052cc', strokeWidth: 2}}
                                        isAnimationActive={true}
                                        animationDuration={1600}
                                        animationEasing="ease-out"
                                        animationBegin={100}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="mentors" 
                                        name="Mentors" 
                                        stroke="#f59e0b" 
                                        strokeWidth={2}
                                        dot={{r: 3}}
                                        isAnimationActive={true}
                                        animationDuration={1800}
                                        animationEasing="ease-out"
                                        animationBegin={200}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="organizers" 
                                        name="Organizers" 
                                        stroke="#8b5cf6" 
                                        strokeWidth={2}
                                        dot={{r: 3}}
                                        isAnimationActive={true}
                                        animationDuration={2000}
                                        animationEasing="ease-out"
                                        animationBegin={300}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Role Distribution Pie Chart */}
                    <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center transition-all duration-500 hover:shadow-xl hover:border-purple-500/30 animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-3 ${theme.cardBg}`}>
                        <div className="w-full flex justify-between items-center mb-2">
                            <h3 className={`text-sm font-black self-start ${theme.headingText}`}>Role Distribution</h3>
                            <span className="text-[10px] font-bold text-purple-500">Breakdown</span>
                        </div>
                        <div className="h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart key={`role-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`}>
                                    <Pie 
                                        data={roleDistData} 
                                        innerRadius={55} 
                                        outerRadius={75} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                        isAnimationActive={true}
                                        animationDuration={1600}
                                        animationEasing="ease-out"
                                        animationBegin={150}
                                    >
                                        {roleDistData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomChartTooltip isLightTheme={isLightTheme} />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-2 mt-2">
                            {roleDistData.map(r => (
                                <div key={r.name} className={`flex items-center gap-2 text-[10px] font-bold ${theme.subText}`}>
                                    <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: r.color}}></div>
                                    {r.name} ({r.value}%)
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* College-wise breakdown */}
                <div id="college-breakdown" className={`p-5 rounded-2xl border transition-all duration-500 hover:shadow-xl hover:border-sky-500/30 animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-3 ${theme.cardBg}`}>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className={`text-sm font-black ${theme.headingText}`}>Top Registered Colleges & Institutions</h3>
                        <span className="text-[10px] font-bold text-sky-500">Institution Breakdown</span>
                    </div>
                    <div className="h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart key={`college-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`} data={collegeDistData} layout="vertical" margin={{left: 20}}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'} horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="college" type="category" stroke={isLightTheme ? '#475569' : '#94a3b8'} fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomChartTooltip isLightTheme={isLightTheme} />} />
                                <Bar 
                                    dataKey="students" 
                                    fill="#0052cc" 
                                    radius={[0, 6, 6, 0]} 
                                    barSize={16}
                                    isAnimationActive={true}
                                    animationDuration={1500}
                                    animationEasing="ease-out"
                                    animationBegin={150}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </AnalyticsSection>

            {/* SECTION 2: HACKATHON ANALYTICS */}
            <AnalyticsSection 
                id="hackathons" 
                title="2. Hackathon & Event Analytics" 
                icon={<RocketIcon className="w-5 h-5 text-sky-500" />} 
                isExpanded={expandedSections.hackathons} 
                onToggle={() => toggleSection('hackathons')}
            >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <MetricItemCard label="Running Events" value={hackathonMetrics?.running ?? 4} valueColor="text-emerald-600 dark:text-emerald-400" isLightTheme={isLightTheme} />
                    <MetricItemCard label="Upcoming" value={hackathonMetrics?.upcoming ?? 6} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Completed" value={hackathonMetrics?.completed ?? 12} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Cancelled" value={hackathonMetrics?.cancelled ?? 0} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Avg Registrations" value={hackathonMetrics?.avgRegistrations ?? 310} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Completion Rate" value={hackathonMetrics?.completionRate || "84%"} valueColor="text-emerald-600 dark:text-emerald-400" isLightTheme={isLightTheme} />
                </div>

                {/* Top Hackathons Leaderboard Table */}
                <div className={`rounded-2xl border overflow-hidden transition-all duration-500 hover:shadow-xl ${theme.cardBg}`}>
                    <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                        <h3 className={`text-xs font-black uppercase tracking-wider ${theme.headingText}`}>Highest Registered & Most Active Hackathons</h3>
                    </div>
                    <div className="overflow-x-auto p-2">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${isLightTheme ? 'border-slate-200 text-slate-500' : 'border-white/10 text-gray-500'}`}>
                                    <th className="px-4 py-2.5">Rank / Hackathon</th>
                                    <th className="px-4 py-2.5">Participants</th>
                                    <th className="px-4 py-2.5">Submissions</th>
                                    <th className="px-4 py-2.5">Completion Rate</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isLightTheme ? 'divide-slate-200' : 'divide-white/5'}`}>
                                {topHackathonsData.map((h, i) => (
                                    <tr key={i} className={theme.hoverRow}>
                                        <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>{h.rank}</span> {h.name}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-gray-300">{h.participants}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-gray-300">{h.submissions}</td>
                                        <td className="px-4 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">{h.completion}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </AnalyticsSection>

            {/* SECTION 3: TEAM & SUBMISSION ANALYTICS */}
            <AnalyticsSection 
                id="teamsSubmissions" 
                title="3. Team Formation & Submission Analytics" 
                icon={<ToolsIcon className="w-5 h-5 text-purple-500" />} 
                isExpanded={expandedSections.teamsSubmissions} 
                onToggle={() => toggleSection('teamsSubmissions')}
            >
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    <MetricItemCard label="Teams Created" value={teamsMetrics?.teamsCreated || 324} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Avg Team Size" value={teamsMetrics?.avgTeamSize || 3.4} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Solo Teams" value={teamsMetrics?.soloTeams || 42} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Full Teams" value={teamsMetrics?.fullTeams || 282} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Submissions" value={teamsMetrics?.submissions || 3842} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Reviewed" value={teamsMetrics?.reviewed || 3100} valueColor="text-blue-600 dark:text-blue-400" isLightTheme={isLightTheme} />
                    <MetricItemCard label="Approved" value={teamsMetrics?.approved || 2680} valueColor="text-emerald-600 dark:text-emerald-400" isLightTheme={isLightTheme} />
                    <MetricItemCard label="GitHub %" value={teamsMetrics?.githubPct || "92%"} valueColor="text-purple-600 dark:text-purple-400" isLightTheme={isLightTheme} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Submission Timeline Area Chart */}
                    <div className={`p-5 rounded-2xl border transition-all duration-500 hover:shadow-xl hover:border-purple-500/30 animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-3 ${theme.cardBg}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`text-sm font-black ${theme.headingText}`}>Submission Progress & Evaluation Timeline</h3>
                            <span className="text-[10px] font-bold text-purple-500">Timeline</span>
                        </div>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart key={`sub-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`} data={submissionTimeline}>
                                    <defs>
                                        <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                                        </linearGradient>
                                        <linearGradient id="colorEval" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'} vertical={false} />
                                    <XAxis dataKey="week" stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                    <YAxis stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                    <Tooltip content={<CustomChartTooltip isLightTheme={isLightTheme} />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="submissions" 
                                        name="Submissions" 
                                        stroke="#8b5cf6" 
                                        fill="url(#colorSub)" 
                                        strokeWidth={2.5} 
                                        isAnimationActive={true}
                                        animationDuration={1600}
                                        animationEasing="ease-out"
                                        animationBegin={100}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="evaluated" 
                                        name="Evaluated" 
                                        stroke="#10b981" 
                                        fill="url(#colorEval)" 
                                        strokeWidth={2.5} 
                                        isAnimationActive={true}
                                        animationDuration={1800}
                                        animationEasing="ease-out"
                                        animationBegin={250}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Technology Stack Distribution Bar Chart */}
                    <div className={`p-5 rounded-2xl border transition-all duration-500 hover:shadow-xl hover:border-sky-500/30 animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-3 ${theme.cardBg}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`text-sm font-black ${theme.headingText}`}>Most Popular Tech Stacks Used</h3>
                            <span className="text-[10px] font-bold text-sky-500">Frameworks</span>
                        </div>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart key={`tech-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`} data={techStackData} layout="vertical" margin={{left: 25}}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'} horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="tech" type="category" stroke={isLightTheme ? '#475569' : '#94a3b8'} fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomChartTooltip isLightTheme={isLightTheme} />} />
                                    <Bar 
                                        dataKey="count" 
                                        fill="#3b82f6" 
                                        radius={[0, 6, 6, 0]} 
                                        barSize={16}
                                        isAnimationActive={true}
                                        animationDuration={1500}
                                        animationEasing="ease-out"
                                        animationBegin={150}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </AnalyticsSection>

            {/* SECTION 4: MENTOR & JUDGE ANALYTICS */}
            <AnalyticsSection 
                id="mentorsJudges" 
                title="4. Mentor & Judge Capacity Analytics" 
                icon={<TeacherIcon className="w-5 h-5 text-amber-500" />} 
                isExpanded={expandedSections.mentorsJudges} 
                onToggle={() => toggleSection('mentorsJudges')}
            >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    <MetricItemCard label="Total Mentors" value={mentorsMetrics?.totalMentors || 150} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Active Mentors" value={mentorsMetrics?.activeMentors || 110} valueColor="text-emerald-600 dark:text-emerald-400" isLightTheme={isLightTheme} />
                    <MetricItemCard label="Available Capacity" value={mentorsMetrics?.availableCapacity || 38} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Judges Assigned" value={mentorsMetrics?.judgesAssigned || 24} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Avg Eval Time" value={mentorsMetrics?.avgEvalTime || "12 min"} valueColor="text-purple-600 dark:text-purple-400" isLightTheme={isLightTheme} />
                </div>

                {/* Top Mentors Leaderboard */}
                <div className={`rounded-2xl border overflow-hidden transition-all duration-500 hover:shadow-xl ${theme.cardBg}`}>
                    <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                        <h3 className={`text-xs font-black uppercase tracking-wider ${theme.headingText}`}>Top Mentors Leaderboard</h3>
                    </div>
                    <div className="overflow-x-auto p-2">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${isLightTheme ? 'border-slate-200 text-slate-500' : 'border-white/10 text-gray-500'}`}>
                                    <th className="px-4 py-2.5">Rank / Mentor</th>
                                    <th className="px-4 py-2.5">Organization</th>
                                    <th className="px-4 py-2.5">Sessions Conducted</th>
                                    <th className="px-4 py-2.5">Rating</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isLightTheme ? 'divide-slate-200' : 'divide-white/5'}`}>
                                {topMentorsData.map((m, i) => (
                                    <tr key={i} className={theme.hoverRow}>
                                        <td className="px-4 py-3 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>{m.rank}</span> {m.name}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-gray-300">{m.company}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-slate-600 dark:text-gray-300">{m.sessions} sessions</td>
                                        <td className="px-4 py-3 text-xs font-bold text-amber-500 flex items-center gap-1"><StarIcon className="w-3.5 h-3.5 text-amber-500" /> {m.rating}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </AnalyticsSection>

            {/* SECTION 5: AI & CERTIFICATE ANALYTICS */}
            <AnalyticsSection 
                id="aiCertificates" 
                title="5. AI Co-Mentor & Certificate Ledger Analytics" 
                icon={<RobotIcon className="w-5 h-5 text-emerald-500" />} 
                isExpanded={expandedSections.aiCertificates} 
                onToggle={() => toggleSection('aiCertificates')}
            >
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    <MetricItemCard label="AI Queries" value={aiCertMetrics?.aiQueries || 14280} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Unique Users" value={aiCertMetrics?.uniqueUsers || 1040} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Avg Latency" value={aiCertMetrics?.avgLatency || "1.1s"} valueColor="text-emerald-600 dark:text-emerald-400" isLightTheme={isLightTheme} />
                    <MetricItemCard label="Helpful Rate" value={aiCertMetrics?.helpfulRate || "94.2%"} valueColor="text-emerald-600 dark:text-emerald-400" isLightTheme={isLightTheme} />
                    <MetricItemCard label="Cert Minted" value={aiCertMetrics?.certsMinted || 1126} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Downloaded" value={aiCertMetrics?.downloaded || 892} valueColor="text-blue-600 dark:text-blue-400" isLightTheme={isLightTheme} />
                    <MetricItemCard label="Verified" value={aiCertMetrics?.verified || 640} valueColor="text-emerald-600 dark:text-emerald-400" isLightTheme={isLightTheme} />
                    <MetricItemCard label="Revoked" value={aiCertMetrics?.revoked || 2} valueColor="text-rose-600 dark:text-rose-400" isLightTheme={isLightTheme} />
                </div>

                <div className={`p-5 rounded-2xl border transition-all duration-500 hover:shadow-xl hover:border-emerald-500/30 animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-3 ${theme.cardBg}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-sm font-black ${theme.headingText}`}>Daily AI Assistant Queries Volume</h3>
                        <span className="text-[10px] font-bold text-emerald-500">AI Traffic</span>
                    </div>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart key={`ai-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`} data={aiQueriesData}>
                                <defs>
                                    <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'} vertical={false} />
                                <XAxis dataKey="day" stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                <YAxis stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                <Tooltip content={<CustomChartTooltip isLightTheme={isLightTheme} />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="queries" 
                                    name="AI Queries" 
                                    stroke="#10b981" 
                                    fill="url(#colorAi)" 
                                    strokeWidth={2.5} 
                                    isAnimationActive={true}
                                    animationDuration={1600}
                                    animationEasing="ease-out"
                                    animationBegin={150}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </AnalyticsSection>

            {/* SECTION 6: SECURITY & SYSTEM PERFORMANCE */}
            <AnalyticsSection 
                id="securityPerformance" 
                title="6. Security & Infrastructure Performance Analytics" 
                icon={<LockIcon className="w-5 h-5 text-sky-500" />} 
                isExpanded={expandedSections.securityPerformance} 
                onToggle={() => toggleSection('securityPerformance')}
            >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <MetricItemCard label="Failed Logins" value={securityMetrics?.failedLogins || 14} valueColor="text-amber-500" isLightTheme={isLightTheme} />
                    <MetricItemCard label="Blocked IPs" value={securityMetrics?.blockedIps || 2} isLightTheme={isLightTheme} />
                    <MetricItemCard label="API Latency" value={securityMetrics?.apiLatency || "42ms"} valueColor="text-emerald-600 dark:text-emerald-400" isLightTheme={isLightTheme} />
                    <MetricItemCard label="CPU Load" value={securityMetrics?.cpuLoad || "18%"} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Memory Used" value={securityMetrics?.memoryUsed || "34%"} isLightTheme={isLightTheme} />
                    <MetricItemCard label="Server Uptime" value={securityMetrics?.serverUptime || "99.98%"} valueColor="text-emerald-600 dark:text-emerald-400" isLightTheme={isLightTheme} />
                </div>

                <div className={`p-5 rounded-2xl border transition-all duration-500 hover:shadow-xl hover:border-sky-500/30 animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-3 ${theme.cardBg}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-sm font-black ${theme.headingText}`}>API Response Time & System Load (24 Hours)</h3>
                        <span className="text-[10px] font-bold text-sky-500">Latency & CPU</span>
                    </div>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart key={`perf-${dateRange}-${selectedHackathon}-${selectedCollege}-${selectedRole}`} data={systemPerfData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'} vertical={false} />
                                <XAxis dataKey="time" stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                <YAxis stroke={isLightTheme ? '#475569' : '#64748b'} fontSize={10} tickLine={false} />
                                <Tooltip content={<CustomChartTooltip isLightTheme={isLightTheme} />} />
                                <Line 
                                    type="monotone" 
                                    dataKey="latency" 
                                    name="Latency (ms)" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2.5} 
                                    dot={{r: 3, fill: '#3b82f6'}}
                                    isAnimationActive={true}
                                    animationDuration={1600}
                                    animationEasing="ease-out"
                                    animationBegin={100}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="cpu" 
                                    name="CPU Load (%)" 
                                    stroke="#f59e0b" 
                                    strokeWidth={2.5} 
                                    dot={{r: 3, fill: '#f59e0b'}}
                                    isAnimationActive={true}
                                    animationDuration={1800}
                                    animationEasing="ease-out"
                                    animationBegin={250}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </AnalyticsSection>

            {/* SECTION 7: SMART AI ADMIN INSIGHTS (BOTTOM) */}
            <div className={`p-6 rounded-2xl border relative overflow-hidden shadow-xl ${isLightTheme ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 border-blue-200 text-slate-900' : 'bg-gradient-to-r from-blue-900/30 via-navy-900/50 to-purple-900/30 border-blue-500/30 text-white'}`}>
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                        ✦
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-extrabold uppercase tracking-widest text-[#0052cc] dark:text-blue-400">Smart Admin Intelligence (AI Summary)</h2>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Updated Just Now</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-medium leading-relaxed">
                            {aiInsights.length > 0 ? (
                                aiInsights.map((insight, idx) => (
                                    <div key={idx} className={`p-3.5 rounded-xl border ${theme.innerBg}`}>
                                        <p className={`font-bold mb-1 ${insight.type === 'danger' ? 'text-rose-600 dark:text-rose-400' : insight.type === 'warning' ? 'text-amber-600 dark:text-amber-400' : insight.type === 'purple' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{insight.title}</p>
                                        <p className={theme.subText}>{insight.content}</p>
                                    </div>
                                ))
                            ) : (
                                <>
                                    <div className={`p-3.5 rounded-xl border ${theme.innerBg}`}>
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1.5"><ZapIcon className="w-4 h-4 text-emerald-500" /> User Growth Surge</p>
                                        <p className={theme.subText}>User registrations increased by <strong>18%</strong> compared to last month. Peak registration occurred during AI Summit announcement.</p>
                                    </div>
                                    <div className={`p-3.5 rounded-xl border ${theme.innerBg}`}>
                                        <p className="font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1.5"><RocketIcon className="w-4 h-4 text-blue-500" /> Top Event Participation</p>
                                        <p className={theme.subText}><strong>Global AI Summit</strong> has the highest participation with <strong>642 registered students</strong> and an 88% completion rate.</p>
                                    </div>
                                    <div className={`p-3.5 rounded-xl border ${theme.innerBg}`}>
                                        <p className="font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5"><TriangleAlertIcon className="w-4 h-4 text-amber-500" /> Mentor Workload Alert</p>
                                        <p className={theme.subText}>Mentor <strong>Priya Sharma</strong> currently mentors <strong>8 teams</strong>, exceeding the recommended max capacity of 5 teams.</p>
                                    </div>
                                    <div className={`p-3.5 rounded-xl border ${theme.innerBg}`}>
                                        <p className="font-bold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1.5"><TeacherIcon className="w-4 h-4 text-purple-500" /> College Performance</p>
                                        <p className={theme.subText}><strong>ABC Engineering College</strong> achieved the highest submission success rate at <strong>94%</strong> across all participating teams.</p>
                                    </div>
                                    <div className={`p-3.5 rounded-xl border ${theme.innerBg}`}>
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1.5"><CertificateIcon className="w-4 h-4 text-emerald-500" /> Certificate Velocity</p>
                                        <p className={theme.subText}>Certificate downloads spiked by <strong>31%</strong> following the AI Summit winner announcements.</p>
                                    </div>
                                    <div className={`p-3.5 rounded-xl border ${theme.innerBg}`}>
                                        <p className="font-bold text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1.5"><SirenIcon className="w-4 h-4 text-rose-500" /> Deadline Action Required</p>
                                        <p className={theme.subText}><strong>12 teams</strong> have not submitted their final project repositories prior to the upcoming 5 PM deadline.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AdminAnalytics;
