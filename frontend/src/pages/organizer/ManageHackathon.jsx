import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    broadcastHackathonUpdate,
    contactHackathonAdmin,
    fetchManageHackathonData,
    updateManageHackathonVisibility,
    updateManageHackathonRegistration,
} from '../../services/organizer/manageHackathonApi';

// --- Stat Card Helper Component (Lifted outside for performance and clarity) ---
const StatCard = ({ stat }) => (
    <div className="glass p-5 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-all group">
        <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl">
                {stat.icon}
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stat.trend.startsWith('+') ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                {stat.trend}
            </span>
        </div>
        <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
        <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
    </div>
);

const ManageHackathon = () => {
    const { hackathonId } = useParams();
    const navigate = useNavigate();

// --- State Management ---
    const [hackathon, setHackathon] = useState(null);
    const [teams, setTeams] = useState([]);
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [pageError, setPageError] = useState(null);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [contactForm, setContactForm] = useState({ subject: '', message: '' });
    const [contactStatus, setContactStatus] = useState('');
    const [isContactSending, setIsContactSending] = useState(false);
    const [broadcastForm, setBroadcastForm] = useState({ subject: '', message: '' });
    const [broadcastStatus, setBroadcastStatus] = useState('');
    const [isBroadcastSending, setIsBroadcastSending] = useState(false);

    const tabs = ['Overview', 'Participants', 'Submissions', 'Mentors', 'Broadcast'];

    // --- Data Fetching ---
    useEffect(() => {
        const fetchHackathonDetails = async () => {
            setIsLoading(true);
            setPageError(null);
            try {
                if (!hackathonId) {
                    setPageError("Hackathon ID not found.");
                    return;
                }
                const data = await fetchManageHackathonData(hackathonId);
                setHackathon(data.hackathon);
                setTeams(data.teams);
                setApplications(data.applications);
            } catch (error) {
                console.error("Error fetching hackathon details:", error);
                setPageError("Failed to load hackathon details. Please refresh the page.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchHackathonDetails();
    }, [hackathonId]);

    // --- Derived Stats ---
    const stats = useMemo(() => {
        const totalRegistrations = applications.length;
        const activeTeams = teams.filter(team => team.status !== 'Rejected').length;
        const submissions = teams.reduce((total, team) => total + (team.submissions || 0), 0);
        const members = teams.reduce((total, team) => total + (Number(team.members) || 0), 0);
        const averageTeamSize = activeTeams ? (members / activeTeams).toFixed(1) : '0';

        return [
            { label: "Total Registrations", value: String(totalRegistrations), icon: "👥", trend: "+0", color: "cyan" },
            { label: "Active Teams", value: String(activeTeams), icon: "🚀", trend: "+0", color: "purple" },
            { label: "Submissions", value: String(submissions), icon: "📁", trend: "—", color: "blue" },
            { label: "Avg. Team Size", value: averageTeamSize, icon: "Avg", trend: "Live", color: "green" },
        ];
    }, [applications, teams]);

    const recentActivity = useMemo(() => {
        const teamActivities = teams.slice(0, 3).map(team => ({
            id: `team-${team.id}`,
            title: team.name,
            message: team.submissionStatus === 'Pending' ? 'registered for the hackathon.' : 'has a project submission update.',
            time: team.registrationDate,
        }));

        if (teamActivities.length > 0) return teamActivities;

        return applications.slice(0, 3).map(application => ({
            id: application.id || application._id,
            title: application.userId || 'Participant',
            message: 'submitted a registration request.',
            time: application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : 'Recently',
        }));
    }, [applications, teams]);

    // --- Filter Logic ---
    const filteredTeams = useMemo(() => {
        return teams.filter(team =>
            team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.leader.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [teams, searchQuery]);

    const systemLogs = useMemo(() => {
        const baseLogs = [
            {
                id: 'event-loaded',
                type: 'Event',
                title: `${hackathon?.title || 'Hackathon'} loaded in control room`,
                detail: `Status: ${hackathon?.status || 'Unknown'}, visibility: ${hackathon?.visibility ? 'Public' : 'Private'}`,
                time: 'Now',
            },
            {
                id: 'registration-state',
                type: 'Registration',
                title: hackathon?.registrationOpen ? 'Registrations are open' : 'Registrations are closed',
                detail: `Registration window: ${hackathon?.registrationStart || 'TBD'} to ${hackathon?.registrationEnd || 'TBD'}`,
                time: 'Live',
            },
            {
                id: 'team-summary',
                type: 'Teams',
                title: `${teams.length} team(s) registered`,
                detail: `${applications.length} total registration request(s), ${teams.reduce((total, team) => total + (team.submissions || 0), 0)} submission update(s).`,
                time: 'Live',
            },
        ];

        const teamLogs = teams.map(team => ({
            id: `team-log-${team.id}`,
            type: 'Team',
            title: `${team.name} registration tracked`,
            detail: `Leader: ${team.leader}. Members: ${team.members || 0}. Submission: ${team.submissionStatus || 'Pending'}.`,
            time: team.registrationDate || 'Recently',
        }));

        return [...baseLogs, ...teamLogs];
    }, [applications.length, hackathon, teams]);

    const operationalAlerts = useMemo(() => {
        const alerts = [];
        const teamsWithoutMentors = teams.filter(team => !team.mentorId).length;
        const pendingSubmissions = teams.filter(team => team.submissionStatus === 'Pending').length;

        if (teamsWithoutMentors > 0) {
            alerts.push({
                id: 'mentor-coverage',
                level: 'warning',
                title: 'Mentor Coverage Needed',
                detail: `${teamsWithoutMentors} team(s) do not have assigned mentors yet.`,
            });
        }

        if (pendingSubmissions > 0) {
            alerts.push({
                id: 'submission-pending',
                level: 'warning',
                title: 'Pending Submissions',
                detail: `${pendingSubmissions} team(s) have not submitted project updates yet.`,
            });
        }

        if (!hackathon?.registrationOpen && applications.length === 0) {
            alerts.push({
                id: 'registration-closed-empty',
                level: 'info',
                title: 'No Active Registrations',
                detail: 'Registrations are closed and no participant requests are recorded.',
            });
        }

        if (alerts.length === 0) {
            alerts.push({
                id: 'healthy',
                level: 'healthy',
                title: 'Event Running Smoothly',
                detail: 'No immediate action is required for this hackathon.',
            });
        }

        return alerts;
    }, [applications.length, hackathon?.registrationOpen, teams]);

    const toggleRegistration = async () => {
        if (!hackathon) return;
        const previous = hackathon;
        setHackathon(prev => ({ ...prev, registrationOpen: !prev.registrationOpen }));
        try {
            const updated = await updateManageHackathonRegistration(hackathonId, !previous.registrationOpen);
            setHackathon(prev => ({ ...prev, ...updated }));
        } catch (error) {
            console.error("Failed to update registration status:", error);
            setHackathon(previous);
            alert("Failed to update registration. Please try again.");
        }
    };

    const toggleVisibility = async () => {
        if (!hackathon) return;
        const previous = hackathon;
        setHackathon(prev => ({ ...prev, visibility: !prev.visibility }));
        try {
            const updated = await updateManageHackathonVisibility(hackathonId, !previous.visibility);
            setHackathon(prev => ({ ...prev, ...updated }));
        } catch (error) {
            console.error("Failed to update visibility:", error);
            setHackathon(previous);
            alert("Failed to update visibility. Please try again.");
        }
    };

    const handleEmergencyStop = async () => {
        if (!hackathon) return;
        const confirmed = window.confirm('Emergency Stop will close registrations and hide this hackathon from public discovery. Continue?');
        if (!confirmed) return;

        const previous = hackathon;
        setHackathon(prev => ({ ...prev, registrationOpen: false, visibility: false }));

        try {
            const closed = await updateManageHackathonRegistration(hackathonId, false);
            const hidden = await updateManageHackathonVisibility(hackathonId, false);
            setHackathon(prev => ({ ...prev, ...closed, ...hidden, registrationOpen: false, visibility: false }));
            setContactStatus('Emergency Stop completed. Registrations are closed and event visibility is private.');
        } catch (error) {
            console.error('Emergency Stop failed:', error);
            setHackathon(previous);
            alert('Emergency Stop failed. Please try again.');
        }
    };

    const handleContactAdmin = async (event) => {
        event.preventDefault();
        if (!contactForm.message.trim()) {
            setContactStatus('Please enter a message before sending.');
            return;
        }

        setIsContactSending(true);
        setContactStatus('');
        try {
            const result = await contactHackathonAdmin(hackathonId, {
                subject: contactForm.subject || 'Organizer Support Request',
                message: contactForm.message,
            });
            setContactStatus(result.message || 'Message sent to admin.');
            setContactForm({ subject: '', message: '' });
        } catch (error) {
            console.error('Failed to contact admin:', error);
            setContactStatus(error.response?.data?.detail || 'Failed to contact admin. Please try again.');
        } finally {
            setIsContactSending(false);
        }
    };

    const handleBroadcast = async () => {
        if (!broadcastForm.subject.trim() || !broadcastForm.message.trim()) {
            setBroadcastStatus('Please add both a broadcast subject and message.');
            return;
        }

        setIsBroadcastSending(true);
        setBroadcastStatus('');
        try {
            const result = await broadcastHackathonUpdate(hackathonId, applications, broadcastForm);
            setBroadcastStatus(result.message);
            if (result.success) {
                setBroadcastForm({ subject: '', message: '' });
            }
        } catch (error) {
            console.error('Failed to send broadcast:', error);
            setBroadcastStatus(error.response?.data?.detail || 'Failed to send broadcast. Please try again.');
        } finally {
            setIsBroadcastSending(false);
        }
    };

    // --- Render States ---
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] text-gray-400 animate-pulse">
                <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
                <p className="font-bold tracking-widest uppercase text-xs">Initializing Command Center...</p>
            </div>
        );
    }

    if (pageError || !hackathon) {
        return (
            <div className="p-20 text-center flex flex-col items-center space-y-6">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center text-2xl font-bold">!</div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{pageError || "Something went wrong."}</h2>
                <button
                    onClick={() => navigate('/organizer/my-hackathons')}
                    className="text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-widest text-xs border-b border-cyan-500/20 pb-1"
                >
                    ← Back to My Hackathons
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto pb-10 px-0">

            {/* Back Button */}
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => navigate('/organizer/my-hackathons')}
                    className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/5 transition-all active:scale-90"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-white">Manage Hackathon</h1>
                    <p className="text-sm text-gray-400 mt-1">Control and monitor your event operations</p>
                </div>
            </div>

            {/* Header / Hero Section */}
            <div className="relative group rounded-3xl overflow-hidden border border-white/10 h-64 md:h-80 shadow-2xl">
                <img
                    src={hackathon.banner}
                    alt="Banner"
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/60 to-transparent"></div>

                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-cyan-600/90 text-white rounded-full">
                                {hackathon.category}
                            </span>
                            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
                                {hackathon.status}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-white">
                            {hackathon.title}
                        </h1>
                        <p className="text-gray-300 font-medium flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            {hackathon.location} • {hackathon.mode}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <Link
                            to={`/organizer/hackathons/${hackathonId}/edit-timeline`}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Timeline
                        </Link>
                        <button
                            onClick={() => setActiveTab('Broadcast')}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-sm font-semibold shadow-2xl shadow-cyan-500/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            Launch Hub
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => <StatCard key={i} stat={stat} />)}
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

                {/* Left Column - Tabs & Controls */}
                <div className="xl:col-span-3 space-y-6">

                    {/* Tabs Navigation */}
                    <div className="glass-strong p-1.5 rounded-2xl border border-white/10 flex gap-1 overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-1 ${activeTab === tab
                                        ? 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Panels */}
                    <div className="min-h-[500px]">

                        {activeTab === 'Overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass p-6 rounded-xl border border-white/10 space-y-6">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                                        <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                                        Recent Activity
                                    </h3>
                                    <div className="space-y-4">
                                        {recentActivity.length > 0 ? recentActivity.map(activity => (
                                            <div key={activity.id} className="flex gap-4 group cursor-pointer">
                                                <div className="w-10 h-10 rounded-full bg-navy-900 border border-white/5 flex items-center justify-center text-lg flex-shrink-0 group-hover:border-cyan-500/50 transition-colors">
                                                    +
                                                </div>
                                                <div className="pb-4 border-b border-white/5 flex-1">
                                                    <p className="text-sm text-gray-300">
                                                        <span className="font-bold text-white">{activity.title}</span> {activity.message}
                                                    </p>
                                                    <span className="text-xs text-gray-500 mt-1 block font-medium uppercase tracking-tighter">{activity.time}</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400">
                                                No team or registration activity yet.
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setShowLogsModal(true)}
                                        className="w-full py-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-sm font-semibold transition-all active:scale-95"
                                    >
                                        View All System Logs
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="glass p-6 rounded-xl border border-white/10">
                                        <h3 className="text-lg font-semibold text-white mb-6">Quick Actions</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-cyan-500/30 transition-all">
                                                <div>
                                                    <p className="font-semibold text-white text-sm">Registrations</p>
                                                    <p className="text-xs text-gray-400">Toggle new signups</p>
                                                </div>
<button
                                                    onClick={() => toggleRegistration()}
                                                    className={`w-12 h-6 rounded-full relative transition-colors ${hackathon.registrationOpen ? 'bg-cyan-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-700'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hackathon.registrationOpen ? 'right-1' : 'left-1'}`}></div>
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-cyan-500/30 transition-all">
                                                <div>
                                                    <p className="font-semibold text-white text-sm">Make Public</p>
                                                    <p className="text-xs text-gray-400">Event search visibility</p>
                                                </div>
<button
                                                    onClick={() => toggleVisibility()}
                                                    className={`w-12 h-6 rounded-full relative transition-colors ${hackathon.visibility ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-gray-700'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hackathon.visibility ? 'right-1' : 'left-1'}`}></div>
                                                </button>
                                            </div>
                                            <button
                                                onClick={handleEmergencyStop}
                                                className="w-full py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-500 transition-all hover:text-white active:scale-95"
                                            >
                                                Emergency Stop
                                            </button>
                                        </div>
                                    </div>

                                    <div className="glass p-6 rounded-xl border border-white/10 bg-gradient-to-br from-cyan-600/10 to-transparent">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold text-white">Event Health</h3>
                                            <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">⚡</span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase">
                                                <span>PROJECT COMPLETION</span>
                                                <span className="text-cyan-400">{hackathon.progress}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-1000"
                                                    style={{ width: `${hackathon.progress}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2 text-center">Everything is running smoothly</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Participants' && (
                            <div className="glass rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5">
                                    <h3 className="text-lg font-semibold text-white">Registered Teams</h3>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search teams..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-cyan-500/50 w-full md:w-64 transition-all placeholder:text-gray-500"
                                        />
                                        <svg className="absolute left-3 top-3 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    </div>
                                </div>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-white/5">
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Team Name</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase text-center">Members</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase text-center">Reg. Date</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase text-center">Status</th>
                                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase text-right">Submission</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredTeams.map(team => (
                                                <tr key={team.id} className="hover:bg-white/10 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-navy-900 border border-white/10 flex items-center justify-center font-black italic text-cyan-400 shadow-lg">
                                                                {team.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-white group-hover:text-cyan-400 transition-colors text-sm">{team.name}</p>
                                                                <p className="text-xs text-gray-400">LEAD: {team.leader}</p>
                                                            </div>
                                                        </div>
                                                    </td>
<td className="px-6 py-5 text-center text-sm text-gray-300 font-semibold">
                                                        {team.members || 1} / {hackathon.maxTeamSize || 4}
                                                    </td>
                                                    <td className="px-6 py-5 text-center text-xs text-gray-400">
                                                        {team.registrationDate}
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${team.status === 'Approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                                team.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                            }`}>
                                                            {team.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <span className="text-xs text-gray-300 font-semibold">
                                                            {team.submissionStatus || 'Pending'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredTeams.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-400">
                                                        No teams registered for this hackathon yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 bg-white/5 text-center border-t border-white/5">
                                    <button
                                        onClick={() => navigate('/organizer/teams-mentors')}
                                        className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-all"
                                    >
                                        Open Teams & Mentors
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Broadcast' && (
                            <div className="glass p-8 md:p-12 rounded-3xl border border-white/10 max-w-3xl mx-auto shadow-2xl">
                                <div className="space-y-8">
                                    <div className="flex items-center gap-5 border-b border-white/10 pb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center text-3xl shadow-lg italic">
                                            📢
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white italic tracking-tight">Mass Broadcast</h3>
                                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Direct deployment to all command devices</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Broadcast Signature</label>
                                            <input
                                                type="text"
                                                placeholder="PHASE 1 DEADLINE EXTENSION"
                                                value={broadcastForm.subject}
                                                onChange={(e) => setBroadcastForm(prev => ({ ...prev, subject: e.target.value }))}
                                                className="w-full px-6 py-4 bg-navy-900/50 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-purple-500/50 transition-all font-bold placeholder-gray-800"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Core Information Transmittance</label>
                                            <textarea
                                                rows="6"
                                                placeholder="Write your mission objective here..."
                                                value={broadcastForm.message}
                                                onChange={(e) => setBroadcastForm(prev => ({ ...prev, message: e.target.value }))}
                                                className="w-full px-6 py-4 bg-navy-900/50 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-purple-500/50 transition-all font-medium placeholder-gray-800 resize-none"
                                            ></textarea>
                                        </div>
                                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Delivery Method</p>
                                            <p className="text-sm text-white font-semibold mt-2">Platform notification to registered participants</p>
                                            <p className="text-xs text-gray-500 mt-1">Email delivery can be added later when the email service is connected.</p>
                                        </div>
                                        {broadcastStatus && (
                                            <p className="text-sm text-purple-200 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
                                                {broadcastStatus}
                                            </p>
                                        )}
                                        <button
                                            onClick={handleBroadcast}
                                            disabled={isBroadcastSending}
                                            className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-xl hover:shadow-purple-500/40 text-white rounded-2xl font-black italic uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isBroadcastSending ? 'Sending...' : 'Execute Broadcast'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Mentors' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass p-8 rounded-3xl border border-white/10 space-y-5">
                                    <h3 className="text-xl font-bold text-white">Mentor Coverage</h3>
                                    <p className="text-sm text-gray-400">
                                        {teams.filter(team => team.mentorId).length} of {teams.length} team(s) currently have an assigned mentor.
                                    </p>
                                    <div className="space-y-3">
                                        {teams.length > 0 ? teams.map(team => (
                                            <div key={team.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                                <div>
                                                    <p className="text-sm font-bold text-white">{team.name}</p>
                                                    <p className="text-xs text-gray-400">Leader: {team.leader}</p>
                                                </div>
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${team.mentorId ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                                    {team.mentorId ? 'Assigned' : 'Needs Mentor'}
                                                </span>
                                            </div>
                                        )) : (
                                            <div className="p-5 bg-white/5 border border-white/10 rounded-2xl text-sm text-gray-400">
                                                No teams are available for mentor assignment yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/organizer/invite-mentors')}
                                    className="border-3 border-dashed border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-gray-500 hover:text-purple-400 hover:border-purple-500/50 transition-all group bg-white/5 hover:bg-purple-500/5"
                                >
                                    <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-3xl font-bold border border-white/10">
                                        +
                                    </div>
                                    <span className="font-black uppercase tracking-[0.2em] text-[11px]">Enlist Mentor</span>
                                </button>
                            </div>
                        )}

                        {(activeTab === 'Submissions') && (
                            <div className="glass-strong rounded-3xl border border-white/10 p-24 text-center space-y-6 shadow-2xl">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-4xl mb-4">📂</div>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Deployment phase not yet finalized</p>
                                <button
                                    onClick={() => navigate('/organizer/evaluation')}
                                    className="px-8 py-3 bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-cyan-600 hover:text-white transition-all italic active:scale-95"
                                >
                                    Launch Evaluation Interface
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Mission Specs */}
                <div className="space-y-6">

                    {/* Time Counter */}
                    <div className="glass-strong p-8 rounded-3xl border border-white/10 text-center relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-pulse"></div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6 italic opacity-70">Operation Remaining</p>
                        <div className="flex justify-center gap-5">
                            <div className="space-y-1">
                                <p className="text-4xl font-black text-white italic tracking-tighter shadow-cyan-500/10">{hackathon.timeRemaining?.days ?? 0}</p>
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Days</p>
                            </div>
                            <div className="text-3xl font-black text-cyan-500 mt-0.5 animate-pulse">:</div>
                            <div className="space-y-1">
                                <p className="text-4xl font-black text-white italic tracking-tighter">{String(hackathon.timeRemaining?.hours ?? 0).padStart(2, '0')}</p>
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Hrs</p>
                            </div>
                            <div className="text-3xl font-black text-cyan-500 mt-0.5 animate-pulse">:</div>
                            <div className="space-y-1">
                                <p className="text-4xl font-black text-white italic tracking-tighter">{String(hackathon.timeRemaining?.minutes ?? 0).padStart(2, '0')}</p>
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Mins</p>
                            </div>
                        </div>
                    </div>

                    {/* Operational Alerts */}
                    <div className="glass p-6 rounded-3xl border border-white/10 space-y-5 bg-gradient-to-b from-white/5 to-transparent shadow-xl">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                            System Alerts
                        </h4>
                        <div className="space-y-3">
                            {operationalAlerts.map(alert => (
                                <div
                                    key={alert.id}
                                    className={`p-4 border rounded-2xl transition-all ${
                                        alert.level === 'healthy'
                                            ? 'bg-green-500/10 border-green-500/20'
                                            : alert.level === 'info'
                                                ? 'bg-cyan-500/10 border-cyan-500/20'
                                                : 'bg-yellow-500/10 border-yellow-500/20'
                                    }`}
                                >
                                    <p className={`text-xs font-black uppercase tracking-tight italic ${
                                        alert.level === 'healthy'
                                            ? 'text-green-400'
                                            : alert.level === 'info'
                                                ? 'text-cyan-400'
                                                : 'text-yellow-500'
                                    }`}>
                                        {alert.title}
                                    </p>
                                    <p className="text-[9px] text-gray-300/70 mt-1 uppercase font-bold leading-relaxed">{alert.detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Operational Linkage */}
                    <div className="glass p-7 rounded-3xl border border-white/10 space-y-5 shadow-xl">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">Command Links</h4>
                        <div className="grid grid-cols-1 gap-3">
                            <Link to="/organizer/analytics" className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all flex items-center justify-between group">
                                <span className="text-[11px] font-black text-gray-400 group-hover:text-cyan-400 uppercase tracking-widest transition-colors">Tactical Data</span>
                                <span className="text-lg group-hover:scale-125 transition-transform duration-300">📈</span>
                            </Link>
                            <Link to="/organizer/results" className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all flex items-center justify-between group">
                                <span className="text-[11px] font-black text-gray-400 group-hover:text-blue-400 uppercase tracking-widest transition-colors">Official Assets</span>
                                <span className="text-lg group-hover:scale-125 transition-transform duration-300">🎓</span>
                            </Link>
                            <Link to="/organizer/evaluation" className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all flex items-center justify-between group">
                                <span className="text-[11px] font-black text-gray-400 group-hover:text-purple-400 uppercase tracking-widest transition-colors">Review Center</span>
                                <span className="text-lg group-hover:scale-125 transition-transform duration-300">⚖️</span>
                            </Link>
                        </div>
                    </div>

                    {/* HQ Uplink */}
                    <div className="glass-strong p-8 rounded-3xl border border-white/10 text-center space-y-4 shadow-2xl bg-navy-950/40">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.25em]">HQ Connectivity</p>
                        <button
                            onClick={() => setShowContactModal(true)}
                            className="w-full py-4 bg-white text-navy-950 rounded-2xl font-black italic uppercase tracking-[0.25em] text-[10px] hover:bg-cyan-500 hover:text-white transition-all shadow-lg active:scale-95"
                        >
                            Contact Admin
                        </button>
                    </div>

                </div>

            </div>

            {showLogsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="glass-strong border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">System Logs</h2>
                                <p className="text-sm text-gray-400 mt-1">{hackathon.title}</p>
                            </div>
                            <button
                                onClick={() => setShowLogsModal(false)}
                                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                            >
                                X
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh] custom-scrollbar">
                            {systemLogs.map(log => (
                                <div key={log.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{log.type}</span>
                                            <h3 className="text-sm font-bold text-white mt-1">{log.title}</h3>
                                            <p className="text-xs text-gray-400 mt-1">{log.detail}</p>
                                        </div>
                                        <span className="text-[10px] text-gray-500 uppercase whitespace-nowrap">{log.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showContactModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <form
                        onSubmit={handleContactAdmin}
                        className="glass-strong border border-white/10 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Contact Admin</h2>
                                <p className="text-sm text-gray-400 mt-1">Send a support request for {hackathon.title}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowContactModal(false)}
                                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                            >
                                X
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Subject</label>
                                <input
                                    type="text"
                                    value={contactForm.subject}
                                    onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                                    placeholder="Approval issue, event support, technical help..."
                                    className="w-full px-4 py-3 bg-navy-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message</label>
                                <textarea
                                    rows="5"
                                    value={contactForm.message}
                                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                                    placeholder="Explain what you need help with..."
                                    className="w-full px-4 py-3 bg-navy-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                                />
                            </div>
                            {contactStatus && (
                                <p className="text-sm text-cyan-200 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3">
                                    {contactStatus}
                                </p>
                            )}
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowContactModal(false)}
                                    className="px-5 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-all"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={isContactSending}
                                    className="px-5 py-3 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isContactSending ? 'Sending...' : 'Send Message'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

        </div>
    );
};

export default ManageHackathon;
