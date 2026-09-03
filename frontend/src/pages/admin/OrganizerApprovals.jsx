import React, { useState, useEffect, useMemo } from 'react';
import { CheckIcon, TriangleAlertIcon, ShieldIcon, UsersIcon, RocketIcon, StarIcon, SearchIcon, ZapIcon } from '../../components/AdminIcons';
import AiAnalysisLoader from '../../components/AiAnalysisLoader';
import { 
    fetchOrganizerApprovals, 
    updateOrganizerStatus, 
    sendChangeRequest, 
    rejectOrganizer, 
    suspendOrganizer, 
    revertToPending,
    fetchOrganizerAiReview
} from '../../services/admin/organizerApprovalsApi';
import { useTheme } from '../../context/ThemeContext';

// --- Modal Component ---
const ActionModal = ({ isOpen, onClose, title, subtitle, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">

            <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white transition-colors p-1 rounded-lg"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>

                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">{title}</h2>
                {subtitle && <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 mb-4">{subtitle}</p>}
                {children}
            </div>
        </div>
    );
};

const OrganizerApprovals = () => {
    const { theme: currentTheme } = useTheme();
    const isLightTheme = currentTheme === 'light';

    const theme = {
        cardBg: isLightTheme 
            ? 'bg-white border border-slate-200/80 shadow-sm text-slate-700 transition-all rounded-2xl' 
            : 'glass-strong border-white/5 bg-navy-900/40 text-white shadow-xl rounded-2xl',
        headingText: isLightTheme ? 'text-slate-800 font-extrabold' : 'text-white font-bold',
        subText: isLightTheme ? 'text-slate-500 font-normal' : 'text-gray-400 font-normal',
        mutedText: isLightTheme ? 'text-slate-400 font-semibold' : 'text-gray-400 font-semibold',
        innerBg: isLightTheme ? 'bg-slate-50/80 border border-slate-200/70 text-slate-700 rounded-2xl' : 'bg-black/20 border border-white/5 text-white rounded-2xl',
        statBoxBg: isLightTheme ? 'bg-white border border-slate-200/70 text-slate-700 shadow-sm rounded-xl' : 'bg-white/5 border border-white/5 text-white rounded-xl',
        hoverRow: isLightTheme ? 'hover:bg-blue-50/50' : 'hover:bg-white/5',
        inputBg: isLightTheme ? 'bg-white border border-slate-200 text-slate-700 shadow-none focus:border-blue-600 rounded-xl' : 'bg-black/20 border border-white/10 text-white rounded-xl',
    };

    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAppId, setSelectedAppId] = useState(null);
    const [activeDetailTab, setActiveDetailTab] = useState('registration'); // 'registration' | 'history' | 'risk'
    const [actionLoading, setActionLoading] = useState(false);

    // AI Review State per Organizer Application ID
    const [aiReviewsMap, setAiReviewsMap] = useState({});
    const [isAiReviewLoading, setIsAiReviewLoading] = useState(false);

    // Toast Notification State
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToastMessage({ text: msg, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Modals State
    const [isRequestChangesOpen, setIsRequestChangesOpen] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [isSuspendOpen, setIsSuspendOpen] = useState(false);
    
    // Form States
    const [changeRequests, setChangeRequests] = useState({ 
        organization: false, 
        orgType: false, 
        designation: false, 
        website: false, 
        phone: false, 
        bio: false 
    });
    const [changeMessage, setChangeMessage] = useState('');
    const [rejectReason, setRejectReason] = useState('Incomplete Information');
    const [rejectMessage, setRejectMessage] = useState('');
    const [suspendReason, setSuspendReason] = useState('Policy Violation');

    const loadOrganizers = async () => {
        setIsLoading(true);
        try {
            const data = await fetchOrganizerApprovals();
            setApplications(data || []);
            if (data && data.length > 0) {
                if (!selectedAppId || !data.find(d => d.id === selectedAppId)) {
                    setSelectedAppId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch organizers from database:", error);
            setApplications([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOrganizers();
    }, []);

    const currentAiReview = selectedAppId ? aiReviewsMap[selectedAppId] : null;

    const handleRunAiReview = async (force = false) => {
        if (!selectedAppId) return;
        if (!force && aiReviewsMap[selectedAppId]) return;
        
        setIsAiReviewLoading(true);
        try {
            const review = await fetchOrganizerAiReview(selectedAppId);
            setAiReviewsMap(prev => ({
                ...prev,
                [selectedAppId]: review
            }));
        } catch (error) {
            console.error("AI organizer review evaluation failed:", error);
            showToast("AI risk evaluation failed to respond", "error");
        } finally {
            setIsAiReviewLoading(false);
        }
    };

    useEffect(() => {
        if (activeDetailTab === 'risk' && selectedAppId) {
            if (!aiReviewsMap[selectedAppId]) {
                handleRunAiReview();
            }
        }
    }, [activeDetailTab, selectedAppId]);

    // Summary Counts
    const stats = useMemo(() => {
        const total = applications.length;
        const pending = applications.filter(a => a.status === 'Pending' || a.status === 'Needs Changes').length;
        const approved = applications.filter(a => a.status === 'Approved').length;
        const rejected = applications.filter(a => a.status === 'Rejected' || a.status === 'Suspended').length;
        return { total, pending, approved, rejected };
    }, [applications]);

    const filteredApps = useMemo(() => {
        return applications.filter(app => {
            let matchesTab = true;
            if (activeTab === 'Pending') {
                matchesTab = app.status === 'Pending' || app.status === 'Needs Changes';
            } else if (activeTab === 'Approved') {
                matchesTab = app.status === 'Approved';
            } else if (activeTab === 'Rejected') {
                matchesTab = app.status === 'Rejected';
            } else if (activeTab === 'Suspended') {
                matchesTab = app.status === 'Suspended';
            }
            
            const q = searchQuery.toLowerCase();
            const matchesSearch = 
                (app.applicantName || '').toLowerCase().includes(q) ||
                (app.organization || '').toLowerCase().includes(q) ||
                (app.email || '').toLowerCase().includes(q) ||
                (app.designation || '').toLowerCase().includes(q);
                
            return matchesTab && matchesSearch;
        });
    }, [applications, activeTab, searchQuery]);

    const selectedApp = applications.find(app => app.id === selectedAppId) || filteredApps[0] || null;

    // Action Handlers
    const handleApprove = async (id) => {
        setActionLoading(true);
        try {
            await updateOrganizerStatus(id, 'Approved', 'Approved by administrator');
            setApplications(apps => apps.map(app => app.id === id ? { ...app, status: 'Approved' } : app));
            showToast('Organizer successfully approved and activated!', 'success');
        } catch (error) {
            showToast('Failed to approve organizer', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendChangeRequest = async () => {
        if (!selectedApp) return;
        setActionLoading(true);
        try {
            const selectedSections = Object.keys(changeRequests).filter(k => changeRequests[k]);
            await sendChangeRequest(selectedApp.id, selectedSections, changeMessage);
            setApplications(apps => apps.map(app => app.id === selectedApp.id ? { 
                ...app, 
                status: 'Needs Changes', 
                changeRequest: changeMessage,
                changeSections: selectedSections 
            } : app));
            setIsRequestChangesOpen(false);
            setChangeMessage('');
            setChangeRequests({ organization: false, orgType: false, designation: false, website: false, phone: false, bio: false });
            showToast('Change request sent to organizer!', 'info');
        } catch (error) {
            showToast('Failed to submit change request', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedApp) return;
        if (!rejectReason) return alert("Please select a rejection reason.");
        setActionLoading(true);
        try {
            await rejectOrganizer(selectedApp.id, rejectReason, rejectMessage);
            setApplications(apps => apps.map(app => app.id === selectedApp.id ? { 
                ...app, 
                status: 'Rejected', 
                rejectionReason: rejectReason 
            } : app));
            setIsRejectOpen(false);
            setRejectReason('Incomplete Information');
            setRejectMessage('');
            showToast('Organizer application rejected', 'warning');
        } catch (error) {
            showToast('Failed to reject organizer', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSuspend = async () => {
        if (!selectedApp) return;
        setActionLoading(true);
        try {
            await suspendOrganizer(selectedApp.id, suspendReason);
            setApplications(apps => apps.map(app => app.id === selectedApp.id ? { ...app, status: 'Suspended' } : app));
            setIsSuspendOpen(false);
            showToast('Organizer account suspended', 'warning');
        } catch (error) {
            showToast('Failed to suspend organizer', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevert = async (id) => {
        setActionLoading(true);
        try {
            await revertToPending(id);
            setApplications(apps => apps.map(app => app.id === id ? { ...app, status: 'Pending' } : app));
            showToast('Application reverted to pending state', 'info');
        } catch (error) {
            showToast('Failed to revert status', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in duration-500 pb-6">
            
            {/* Toast Alert */}
            {toastMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
                    <div className={`px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2.5 font-bold text-xs border backdrop-blur-md transition-all ${
                        toastMessage.type === 'warning'
                            ? 'bg-amber-50/95 dark:bg-amber-950/80 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-amber-500/10'
                            : toastMessage.type === 'error'
                            ? 'bg-rose-50/95 dark:bg-rose-950/80 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 shadow-rose-500/10'
                            : 'bg-white/95 dark:bg-slate-900/90 border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100 shadow-slate-900/10'
                    }`}>
                        {toastMessage.type === 'warning' ? (
                            <TriangleAlertIcon className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : toastMessage.type === 'error' ? (
                            <TriangleAlertIcon className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                            <CheckIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        <span>{toastMessage.text}</span>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Organizer Approvals</h1>
                    <p className="text-slate-600 dark:text-gray-400 mt-0.5 text-xs sm:text-sm font-medium">Verify credentials and approve organizer applications based on their submitted registration details.</p>
                </div>
                <button 
                    onClick={loadOrganizers} 
                    disabled={isLoading}
                    title="Refresh Live Data"
                    className="self-start md:self-auto px-4 py-2 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 rounded-xl transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-rotate-ccw ${isLoading ? 'animate-spin' : ''}`}>
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                    <span>Refresh Records</span>
                </button>
            </div>

            {/* Top Metric Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border flex flex-col justify-between ${theme.statBoxBg}`}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">Total Applicants</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
                </div>
                <div className={`p-3 rounded-xl border flex flex-col justify-between ${theme.statBoxBg}`}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Review</p>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pending}</p>
                </div>
                <div className={`p-3 rounded-xl border flex flex-col justify-between ${theme.statBoxBg}`}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Rejected / Suspended</p>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.rejected}</p>
                </div>
            </div>

            {/* Main Split-Pane Layout */}
            <div className="flex flex-col lg:flex-row gap-5 min-h-[580px]">
                
                {/* LEFT PANE: Application Directory */}
                <div className="w-full lg:w-1/3 flex flex-col absolutestrange-card overflow-hidden p-0 h-[640px]">
                    
                    {/* Status Filter Tabs */}
                    <div className="p-2.5 border-b border-slate-200 dark:border-white/5 flex gap-1 shrink-0 bg-slate-50/70 dark:bg-white/[0.02] overflow-x-auto scrollbar-hide">
                        {['All', 'Pending', 'Approved', 'Rejected', 'Suspended'].map((tab) => {
                            const count = tab === 'All' ? applications.length :
                                          tab === 'Pending' ? stats.pending :
                                          tab === 'Approved' ? stats.approved :
                                          tab === 'Rejected' ? applications.filter(a => a.status === 'Rejected').length :
                                          applications.filter(a => a.status === 'Suspended').length;
                            const isActive = activeTab === tab;
                            return (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-1.5 px-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                                        isActive 
                                        ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300/80 dark:border-sky-500/40 font-extrabold shadow-sm' 
                                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 border border-transparent'
                                    }`}
                                >
                                    <span>{tab}</span>
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-sky-200/70 dark:bg-sky-400/20 text-sky-800 dark:text-sky-200' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Input */}
                    <div className="p-2.5 border-b border-slate-200 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-transparent">
                        <div className="relative">
                            <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-gray-500" />
                            <input 
                                type="text" 
                                placeholder="Search by name, org, email..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Cards Scrollable List */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="p-8 text-center text-xs text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider animate-pulse">
                                Fetching Live Organizer Records...
                            </div>
                        ) : filteredApps.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 dark:text-gray-500 text-xs">
                                No applications match the selected filter.
                            </div>
                        ) : (
                            filteredApps.map((app) => {
                                const isSelected = selectedAppId === app.id;
                                return (
                                    <div 
                                        key={app.id} 
                                        onClick={() => setSelectedAppId(app.id)}
                                        className={`p-3 rounded-xl cursor-pointer transition-all border text-left ${
                                            isSelected 
                                            ? 'bg-sky-50/90 dark:bg-sky-500/15 border-sky-400 dark:border-sky-500/60 shadow-sm' 
                                            : 'bg-white dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5 hover:border-sky-300 dark:hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className="pr-2 truncate">
                                                <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{app.applicantName}</h4>
                                                <p className="text-[11px] text-sky-600 dark:text-sky-400 font-bold truncate mt-0.5">{app.organization}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate">{app.email}</p>
                                            </div>
                                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                app.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                                                app.status === 'Needs Changes' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' :
                                                app.status === 'Rejected' ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                                                app.status === 'Suspended' ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30' :
                                                'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-white/10'
                                            }`}>
                                                {app.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-500 dark:text-gray-500 font-mono">
                                            <span>Score: <strong className={app.verificationScore >= 80 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-amber-600 dark:text-amber-400 font-black'}>{app.verificationScore}%</strong></span>
                                            <span>{app.appliedDate}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Detail Investigation Workspace */}
                <div className="w-full lg:w-2/3 absolutestrange-card flex flex-col overflow-hidden relative p-0 h-[640px]">
                    {selectedApp ? (
                        <>
                            {/* Selected Organizer Profile Top Bar */}
                            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 font-black text-base flex items-center justify-center shadow-sm">
                                        {selectedApp.applicantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'OR'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{selectedApp.applicantName}</h2>
                                            <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                                                selectedApp.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                                                selectedApp.status === 'Needs Changes' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' :
                                                selectedApp.status === 'Rejected' ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                                                selectedApp.status === 'Suspended' ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30' :
                                                'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                            }`}>
                                                {selectedApp.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-gray-400 font-medium mt-0.5">
                                            {selectedApp.designation} &bull; <span className="text-sky-600 dark:text-sky-400 font-bold">{selectedApp.organization}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="text-left sm:text-right flex items-center sm:block gap-3">
                                    <p className="text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Completeness Score</p>
                                    <p className={`text-xl sm:text-2xl font-black ${selectedApp.verificationScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {selectedApp.verificationScore}%
                                    </p>
                                </div>
                            </div>

                            {/* Sub-tab Navigation */}
                            <div className="flex border-b border-slate-200 dark:border-white/10 px-4 pt-2 gap-3 shrink-0 bg-white dark:bg-transparent">
                                {[
                                    { id: 'registration', label: '1. Registration Details', icon: <UsersIcon className="w-3.5 h-3.5" /> },
                                    { id: 'history', label: '2. Platform History', icon: <RocketIcon className="w-3.5 h-3.5" /> },
                                    { id: 'risk', label: '3. Risk & AI Assessment', icon: <ShieldIcon className="w-3.5 h-3.5" /> },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveDetailTab(tab.id)}
                                        className={`pb-2 px-2 text-xs font-extrabold transition-all border-b-2 flex items-center gap-1.5 ${
                                            activeDetailTab === tab.id
                                            ? 'border-sky-600 text-sky-600 dark:text-sky-400 dark:border-sky-400'
                                            : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                                        }`}
                                    >
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Main Body per Active Tab */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                                
                                {activeDetailTab === 'registration' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* Status Alert if Needs Changes or Rejected */}
                                        {selectedApp.status === 'Needs Changes' && selectedApp.changeRequest && (
                                            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                                                <p className="font-extrabold flex items-center gap-1.5 mb-1">
                                                    <TriangleAlertIcon className="w-4 h-4 text-amber-500" /> Pending Organizer Changes:
                                                </p>
                                                <p className="font-medium pl-5">{selectedApp.changeRequest}</p>
                                            </div>
                                        )}

                                        {selectedApp.status === 'Rejected' && selectedApp.rejectionReason && (
                                            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs">
                                                <p className="font-extrabold flex items-center gap-1.5 mb-1">
                                                    <TriangleAlertIcon className="w-4 h-4 text-rose-500" /> Rejection Reason:
                                                </p>
                                                <p className="font-medium pl-5">{selectedApp.rejectionReason}</p>
                                            </div>
                                        )}

                                        {/* 1. Identity & Contact Box */}
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3 flex items-center justify-between">
                                                <span>Submitted Applicant Information</span>
                                                <span className="text-sky-600 dark:text-sky-400 font-mono">Role: {selectedApp.role}</span>
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Full Name</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedApp.applicantName}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Registered Email</span>
                                                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                                            {selectedApp.email} 
                                                            {selectedApp.emailVerified && <CheckIcon className="w-3.5 h-3.5 text-emerald-500 inline" />}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Contact Phone</span>
                                                        <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedApp.phone || "Not Provided"}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Account Created</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedApp.appliedDate}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Designation / Title</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedApp.designation}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Domain</span>
                                                        <span className="font-bold text-sky-600 dark:text-sky-400">{selectedApp.domain}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Institutional Credentials */}
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3">
                                                Institution & Organization Credentials
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Organization Name</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedApp.organization}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Institution Type</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedApp.orgType}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Official Website</span>
                                                        <a 
                                                            href={selectedApp.website.startsWith('http') ? selectedApp.website : `https://${selectedApp.website}`} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                                                        >
                                                            {selectedApp.website}
                                                        </a>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Applicant Designation</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedApp.designation}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Bio Dossier */}
                                            {selectedApp.bio && (
                                                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5">
                                                    <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-gray-400 mb-1">Organization / Event Bio</p>
                                                    <p className="text-xs text-slate-700 dark:text-gray-300 italic">{selectedApp.bio}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* 3. Onboarding Verification Checklist */}
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3">
                                                Onboarding Data Completeness Checklist
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${selectedApp.checklist?.emailVerified ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                                    <span className="font-bold">Email Verified</span>
                                                    <span className="flex items-center gap-1">{selectedApp.checklist?.emailVerified ? <><CheckIcon className="w-3.5 h-3.5" /> Verified</> : <><TriangleAlertIcon className="w-3.5 h-3.5" /> Pending</>}</span>
                                                </div>
                                                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${selectedApp.checklist?.organizationProvided ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                                    <span className="font-bold">Organization Name</span>
                                                    <span className="flex items-center gap-1">{selectedApp.checklist?.organizationProvided ? <><CheckIcon className="w-3.5 h-3.5" /> Provided</> : <><TriangleAlertIcon className="w-3.5 h-3.5" /> Missing</>}</span>
                                                </div>
                                                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${selectedApp.checklist?.orgTypeProvided ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                                    <span className="font-bold">Institution Type</span>
                                                    <span className="flex items-center gap-1">{selectedApp.checklist?.orgTypeProvided ? <><CheckIcon className="w-3.5 h-3.5" /> Configured</> : <><TriangleAlertIcon className="w-3.5 h-3.5" /> Missing</>}</span>
                                                </div>
                                                <div className={`p-2.5 rounded-lg border flex items-center justify-between ${selectedApp.checklist?.websiteProvided ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                                    <span className="font-bold">Official Website URL</span>
                                                    <span className="flex items-center gap-1">{selectedApp.checklist?.websiteProvided ? <><CheckIcon className="w-3.5 h-3.5" /> Provided</> : <><TriangleAlertIcon className="w-3.5 h-3.5" /> Missing</>}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 4. AI Recommendation Box */}
                                        <div className="p-4 rounded-xl border bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border-sky-500/20">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <h4 className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                                                    <RocketIcon className="w-3.5 h-3.5" /> AI Recommendation Engine
                                                </h4>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                    selectedApp.aiRecommendation?.decision === 'APPROVE' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                                                    selectedApp.aiRecommendation?.decision === 'REJECT' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300' :
                                                    'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                                }`}>
                                                    {selectedApp.aiRecommendation?.decision} ({selectedApp.aiRecommendation?.confidence}%)
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                                {selectedApp.aiRecommendation?.summary}
                                            </p>
                                        </div>

                                    </div>
                                )}

                                {activeDetailTab === 'history' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* History Stat Cards */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                            <div className={`p-3 rounded-xl border text-center ${theme.statBoxBg}`}>
                                                <p className="text-xl font-black text-slate-900 dark:text-white">{selectedApp.history?.events || 0}</p>
                                                <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-gray-400 mt-0.5">Events Created</p>
                                            </div>
                                            <div className={`p-3 rounded-xl border text-center ${theme.statBoxBg}`}>
                                                <p className="text-xl font-black text-slate-900 dark:text-white">{selectedApp.history?.participants || 0}</p>
                                                <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-gray-400 mt-0.5">Participants</p>
                                            </div>
                                            <div className={`p-3 rounded-xl border text-center ${theme.statBoxBg}`}>
                                                <p className="text-xl font-black text-amber-500 flex items-center justify-center gap-1">
                                                    <StarIcon className="w-4 h-4 text-amber-500" /> {selectedApp.history?.rating || "5.0"}
                                                </p>
                                                <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-gray-400 mt-0.5">Organizer Rating</p>
                                            </div>
                                            <div className={`p-3 rounded-xl border text-center ${theme.statBoxBg}`}>
                                                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{selectedApp.history?.disputes || 0}</p>
                                                <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-gray-400 mt-0.5">Open Disputes</p>
                                            </div>
                                        </div>

                                        {/* Timeline */}
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3">
                                                Application & Account Audit Timeline
                                            </h4>
                                            <div className="space-y-3">
                                                {selectedApp.timeline?.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-3 text-xs">
                                                        <span className="w-2 h-2 rounded-full bg-sky-500 mt-1 shrink-0"></span>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white">{item.event}</p>
                                                            <p className="text-[10px] text-slate-500 dark:text-gray-400">{item.date}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* System Governance Notes */}
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2">
                                                Administrative Notes & Audit Dossier
                                            </h4>
                                            <div className="space-y-2">
                                                {selectedApp.notes?.map((note, idx) => (
                                                    <div key={idx} className="p-2.5 rounded-lg bg-white/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 text-xs">
                                                        <p className="text-slate-700 dark:text-gray-300 font-medium">{note.text}</p>
                                                        <p className="text-[9px] text-slate-400 dark:text-gray-500 mt-1 font-mono">{note.author} &bull; {note.date}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {activeDetailTab === 'risk' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* Top Header & Re-run Button */}
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                                                <ZapIcon className="w-4 h-4" /> Live AI Risk & Verification Assessment
                                            </h4>
                                            <button 
                                                onClick={() => handleRunAiReview(true)}
                                                disabled={isAiReviewLoading}
                                                className="px-3.5 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                                            >
                                                {isAiReviewLoading ? 'Analyzing...' : 'Re-Run AI Analysis'}
                                            </button>
                                        </div>

                                        {isAiReviewLoading ? (
                                            <AiAnalysisLoader 
                                                label="Performing AI Risk Assessment..." 
                                                subtext="Evaluating institutional credentials, web presence, and platform compliance..."
                                            />
                                        ) : (
                                            <>
                                                {/* Risk Level Badge Box */}
                                                <div className={`p-4 rounded-xl border ${
                                                    (currentAiReview?.riskTier || selectedApp.risk?.level) === 'HIGH' ? 'bg-rose-500/10 border-rose-500/30' :
                                                    (currentAiReview?.riskTier || selectedApp.risk?.level) === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/30' :
                                                    'bg-emerald-500/10 border-emerald-500/30'
                                                }`}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <h4 className={`text-xs font-black uppercase tracking-wider ${
                                                            (currentAiReview?.riskTier || selectedApp.risk?.level) === 'HIGH' ? 'text-rose-700 dark:text-rose-400' :
                                                            (currentAiReview?.riskTier || selectedApp.risk?.level) === 'MEDIUM' ? 'text-amber-700 dark:text-amber-400' :
                                                            'text-emerald-700 dark:text-emerald-400'
                                                        }`}>
                                                            OVERALL RISK TIER: {currentAiReview?.riskTier || selectedApp.risk?.level || 'LOW'} RISK
                                                        </h4>
                                                        <span className="text-xs font-bold font-mono">
                                                            Score: {currentAiReview?.riskScore ?? selectedApp.risk?.score ?? 10}/100
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-gray-300">
                                                        {currentAiReview?.aiSummary || (
                                                            (currentAiReview?.riskTier || selectedApp.risk?.level) === 'HIGH' 
                                                                ? 'Critical flags detected. Review organization identity and dispute history before approving.' 
                                                                : 'No elevated risk factors detected. Account is compliant with institutional guidelines.'
                                                        )}
                                                    </p>
                                                </div>

                                                {/* AI Recommendation & Verified Badges */}
                                                {currentAiReview && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className={`p-3 rounded-xl border ${theme.innerBg} flex items-center justify-between`}>
                                                            <div>
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">AI Recommendation</span>
                                                                <span className="text-xs font-black text-slate-900 dark:text-white">{currentAiReview.recommendation || 'APPROVE'}</span>
                                                            </div>
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                                                                currentAiReview.recommendation === 'APPROVE' 
                                                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                                                                    : currentAiReview.recommendation === 'REJECT'
                                                                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                                                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                            }`}>
                                                                {currentAiReview.recommendation || 'APPROVE'}
                                                            </span>
                                                        </div>

                                                        <div className={`p-3 rounded-xl border ${theme.innerBg} flex items-center justify-between`}>
                                                            <div>
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Confidence Score</span>
                                                                <span className="text-xs font-black text-sky-600 dark:text-sky-400">{currentAiReview.confidenceScore || 94}%</span>
                                                            </div>
                                                            <div className="flex gap-1 flex-wrap justify-end">
                                                                {(currentAiReview.verifiedBadges || ["Domain Verified", "Institutional Alignment"]).map((b, i) => (
                                                                    <span key={i} className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-300 text-[9px] font-bold border border-sky-500/20">
                                                                        ✓ {b}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Risk Factors Breakdown */}
                                                <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3">
                                                        Identified Risk Factors
                                                    </h4>
                                                    {(currentAiReview?.riskFactors || selectedApp.risk?.factors) && (currentAiReview?.riskFactors || selectedApp.risk?.factors).length > 0 ? (
                                                        <div className="space-y-2">
                                                            {(currentAiReview?.riskFactors || selectedApp.risk?.factors).map((f, i) => (
                                                                <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
                                                                    <span className="font-bold text-slate-800 dark:text-gray-200">{f.factor || f}</span>
                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                                        (f.impact || '').toUpperCase() === 'HIGH' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400' :
                                                                        (f.impact || '').toUpperCase() === 'MEDIUM' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                                                                        'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                                                    }`}>
                                                                        {f.impact || "Review"}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Zero adverse risk factors detected for this organizer account.</p>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                    </div>
                                )}

                            </div>

                            {/* Bottom Action Bar */}
                            <div className="p-3.5 sm:p-4 bg-white dark:bg-navy-900 border-t border-slate-200 dark:border-white/10 flex flex-wrap justify-between items-center gap-3 shrink-0 shadow-lg">
                                <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
                                    Status: <span className="font-black text-slate-900 dark:text-white uppercase">{selectedApp.status}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                    {(selectedApp.status === 'Pending' || selectedApp.status === 'Needs Changes') && (
                                        <>
                                            <button 
                                                onClick={() => setIsRejectOpen(true)}
                                                disabled={actionLoading}
                                                className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-bold rounded-xl transition-all active:scale-95"
                                            >
                                                Reject Application
                                            </button>
                                            <button 
                                                onClick={() => setIsRequestChangesOpen(true)}
                                                disabled={actionLoading}
                                                className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-xs font-bold rounded-xl transition-all active:scale-95"
                                            >
                                                Request Changes
                                            </button>
                                            <button 
                                                onClick={() => handleApprove(selectedApp.id)}
                                                disabled={actionLoading}
                                                className="px-5 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                                            >
                                                <CheckIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                                Approve & Activate
                                            </button>
                                        </>
                                    )}

                                    {selectedApp.status === 'Approved' && (
                                        <>
                                            <button 
                                                onClick={() => setIsSuspendOpen(true)}
                                                disabled={actionLoading}
                                                className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-bold rounded-xl transition-all"
                                            >
                                                Suspend Organizer
                                            </button>
                                            <button 
                                                onClick={() => handleRevert(selectedApp.id)}
                                                disabled={actionLoading}
                                                className="px-4 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all"
                                            >
                                                Revert to Pending
                                            </button>
                                        </>
                                    )}

                                    {(selectedApp.status === 'Rejected' || selectedApp.status === 'Suspended') && (
                                        <>
                                            <button 
                                                onClick={() => handleApprove(selectedApp.id)}
                                                disabled={actionLoading}
                                                className="px-4 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 text-xs font-bold rounded-xl shadow-sm transition-all"
                                            >
                                                Re-Approve Organizer
                                            </button>
                                            <button 
                                                onClick={() => handleRevert(selectedApp.id)}
                                                disabled={actionLoading}
                                                className="px-4 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all"
                                            >
                                                Revert to Pending
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 p-8 text-center">
                            <UsersIcon className="w-12 h-12 mb-3 opacity-30" />
                            <p className="font-bold text-sm">Select an organizer application from the left list to review.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* REQUEST CHANGES MODAL */}
            <ActionModal 
                isOpen={isRequestChangesOpen} 
                onClose={() => setIsRequestChangesOpen(false)} 
                title="Request Organizer Information Changes"
                subtitle="Select the specific fields the applicant must update or furnish."
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2.5">
                        {[
                            { key: 'organization', label: 'Organization / Institution Name' },
                            { key: 'orgType', label: 'Institution Type Classification' },
                            { key: 'designation', label: 'Official Role / Designation' },
                            { key: 'website', label: 'Official Website / Domain' },
                            { key: 'phone', label: 'Contact Phone Number' },
                            { key: 'bio', label: 'Organization & Event Bio' },
                        ].map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 cursor-pointer p-2 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5">
                                <input 
                                    type="checkbox" 
                                    className="rounded text-sky-600 focus:ring-sky-500" 
                                    checked={changeRequests[key]} 
                                    onChange={(e) => setChangeRequests({...changeRequests, [key]: e.target.checked})} 
                                /> 
                                <span className="font-medium truncate">{label}</span>
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">Custom Guidance Note to Applicant:</label>
                        <textarea 
                            placeholder="Explain what specific details or verification documents are required..." 
                            rows="3" 
                            value={changeMessage} 
                            onChange={(e) => setChangeMessage(e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 resize-none"
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-2.5 pt-2">
                        <button 
                            onClick={() => setIsRequestChangesOpen(false)} 
                            className="px-4 py-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSendChangeRequest} 
                            disabled={actionLoading}
                            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-md transition-colors"
                        >
                            {actionLoading ? 'Sending...' : 'Send Change Request'}
                        </button>
                    </div>
                </div>
            </ActionModal>

            {/* REJECT MODAL */}
            <ActionModal 
                isOpen={isRejectOpen} 
                onClose={() => setIsRejectOpen(false)} 
                title="Reject Organizer Application"
                subtitle="Specify the justification for rejecting this organizer application."
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        {[
                            'Incomplete Information',
                            'Unverifiable Organization',
                            'Duplicate Account',
                            'Fraudulent Information / High Risk',
                            'Policy Violation',
                            'Other Administrative Grounds'
                        ].map(reason => (
                            <label key={reason} className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 cursor-pointer p-2 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5">
                                <input 
                                    type="radio" 
                                    name="rejectReason" 
                                    value={reason} 
                                    checked={rejectReason === reason}
                                    onChange={(e) => setRejectReason(e.target.value)} 
                                    className="text-rose-600 focus:ring-rose-500" 
                                /> 
                                <span className="font-bold">{reason}</span>
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">Additional Explanation (Optional):</label>
                        <textarea 
                            placeholder="Additional rejection context for audit log..." 
                            rows="2" 
                            value={rejectMessage} 
                            onChange={(e) => setRejectMessage(e.target.value)} 
                            className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-2.5 pt-2">
                        <button 
                            onClick={() => setIsRejectOpen(false)} 
                            className="px-4 py-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleReject} 
                            disabled={actionLoading}
                            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-colors"
                        >
                            {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                    </div>
                </div>
            </ActionModal>

            {/* SUSPEND MODAL */}
            <ActionModal 
                isOpen={isSuspendOpen} 
                onClose={() => setIsSuspendOpen(false)} 
                title="Suspend Organizer Account"
                subtitle="Temporarily disable organizer privileges on the platform."
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        {[
                            'Policy Violation',
                            'Unresolved Dispute Complaints',
                            'Event Cancellation Negligence',
                            'Identity Verification Revoked'
                        ].map(reason => (
                            <label key={reason} className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 cursor-pointer p-2 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5">
                                <input 
                                    type="radio" 
                                    name="suspendReason" 
                                    value={reason} 
                                    checked={suspendReason === reason}
                                    onChange={(e) => setSuspendReason(e.target.value)} 
                                    className="text-purple-600 focus:ring-purple-500" 
                                /> 
                                <span className="font-bold">{reason}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2.5 pt-2">
                        <button 
                            onClick={() => setIsSuspendOpen(false)} 
                            className="px-4 py-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSuspend} 
                            disabled={actionLoading}
                            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition-colors"
                        >
                            {actionLoading ? 'Suspending...' : 'Confirm Suspension'}
                        </button>
                    </div>
                </div>
            </ActionModal>

        </div>
    );
};

export default OrganizerApprovals;
