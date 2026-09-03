import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    fetchAllHackathonsForAdmin, 
    approveHackathon, 
    requestHackathonChanges, 
    rejectHackathon, 
    revertHackathonToPending,
    fetchHackathonAiReview 
} from '../../services/admin/hackathonApprovalsApi';
import { CheckIcon, TriangleAlertIcon, ShieldIcon, UsersIcon, RocketIcon, StarIcon, SearchIcon, ZapIcon, EditIcon, ClockIcon } from '../../components/AdminIcons';
import { useTheme } from '../../context/ThemeContext';
import AiAnalysisLoader from '../../components/AiAnalysisLoader';
import AiAnalysisPopup from '../../components/AiAnalysisPopup';

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

const HackathonApprovals = () => {
    const { theme: currentTheme } = useTheme();
    const isLightTheme = currentTheme === 'light';
    const [searchParams] = useSearchParams();

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

    const [hackathons, setHackathons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedHackathonId, setSelectedHackathonId] = useState(null);
    const [activeDetailTab, setActiveDetailTab] = useState('proposal'); // 'proposal' | 'stats' | 'ai-review'
    const [actionLoading, setActionLoading] = useState(false);

    // AI Review State per Hackathon ID
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
    
    // Form States
    const [changeSections, setChangeSections] = useState({
        titleOrTagline: false,
        descriptionOrProblem: false,
        scheduleDates: false,
        challengeTracks: false,
        teamRules: false,
        submissionGuidelines: false
    });
    const [feedbackNote, setFeedbackNote] = useState('');
    const [rejectReason, setRejectReason] = useState('Insufficient Problem Statement');
    const [rejectExplanation, setRejectExplanation] = useState('');

    const loadHackathons = async () => {
        setIsLoading(true);
        try {
            const data = await fetchAllHackathonsForAdmin();
            setHackathons(data || []);
            if (data && data.length > 0) {
                if (!selectedHackathonId || !data.find(d => d.id === selectedHackathonId)) {
                    setSelectedHackathonId(data[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to load hackathons:", error);
            setHackathons([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadHackathons();
    }, []);

    // Sync URL search params (id, title/search, filter tab)
    useEffect(() => {
        if (!hackathons || hackathons.length === 0) return;

        const paramId = searchParams.get('id');
        const paramSearch = searchParams.get('search') || searchParams.get('title') || searchParams.get('hackathon');
        const filter = searchParams.get('filter');

        // 1. If explicit filter tab is passed
        if (filter) {
            const f = filter.toLowerCase();
            if (f === 'approved' || f === 'active' || f === 'running' || f === 'healthy') setActiveTab('Approved');
            else if (f === 'pending' || f === 'critical') setActiveTab('Pending');
            else if (f === 'needs revision' || f === 'needs_revision' || f === 'draft' || f === 'at_risk' || f === 'at risk') setActiveTab('Needs Revision');
            else if (f === 'rejected') setActiveTab('Rejected');
            else if (f === 'all') setActiveTab('All');
        }

        // 2. If target Hackathon ID is passed
        if (paramId) {
            const found = hackathons.find(h => String(h.id) === String(paramId) || String(h._id) === String(paramId));
            if (found) {
                setSelectedHackathonId(found.id);
                if (!filter) {
                    if (found.status === 'Pending') setActiveTab('Pending');
                    else if (found.status === 'Approved' || found.status === 'Active') setActiveTab('Approved');
                    else if (found.status === 'Needs Revision' || found.status === 'Draft') setActiveTab('Needs Revision');
                    else if (found.status === 'Rejected') setActiveTab('Rejected');
                    else setActiveTab('All');
                }
                return;
            }
        }

        // 3. If target Title / Search Query is passed (e.g. "Global AI Summit 2026")
        if (paramSearch) {
            const searchLower = paramSearch.toLowerCase();
            const found = hackathons.find(h => 
                (h.title || '').toLowerCase().includes(searchLower) ||
                searchLower.includes((h.title || '').toLowerCase())
            );
            if (found) {
                setSelectedHackathonId(found.id);
                if (!filter) {
                    if (found.status === 'Pending') setActiveTab('Pending');
                    else if (found.status === 'Approved' || found.status === 'Active') setActiveTab('Approved');
                    else if (found.status === 'Needs Revision' || found.status === 'Draft') setActiveTab('Needs Revision');
                    else if (found.status === 'Rejected') setActiveTab('Rejected');
                    else setActiveTab('All');
                }
                return;
            }
        }
    }, [searchParams, hackathons]);

    // Summary Counts
    const stats = useMemo(() => {
        const total = hackathons.length;
        const pending = hackathons.filter(h => h.status === 'Pending').length;
        const approved = hackathons.filter(h => h.status === 'Approved' || h.status === 'Active').length;
        const needsRevision = hackathons.filter(h => h.status === 'Needs Revision').length;
        const rejected = hackathons.filter(h => h.status === 'Rejected').length;
        return { total, pending, approved, needsRevision, rejected };
    }, [hackathons]);

    const filteredHackathons = useMemo(() => {
        return hackathons.filter(h => {
            let matchesTab = true;
            if (activeTab === 'Pending') {
                matchesTab = h.status === 'Pending';
            } else if (activeTab === 'Approved') {
                matchesTab = h.status === 'Approved' || h.status === 'Active';
            } else if (activeTab === 'Needs Revision') {
                matchesTab = h.status === 'Needs Revision';
            } else if (activeTab === 'Rejected') {
                matchesTab = h.status === 'Rejected';
            }
            
            const q = searchQuery.toLowerCase();
            const themesStr = Array.isArray(h.themes) ? h.themes.join(' ') : String(h.themes || '');
            const matchesSearch = 
                (h.title || '').toLowerCase().includes(q) ||
                themesStr.toLowerCase().includes(q) ||
                (h.organizer?.name || '').toLowerCase().includes(q) ||
                (h.organizer?.org || '').toLowerCase().includes(q);
                
            return matchesTab && matchesSearch;
        });
    }, [hackathons, activeTab, searchQuery]);

    const selectedHackathon = hackathons.find(h => h.id === selectedHackathonId) || filteredHackathons[0] || null;

    const selectedHackathonTargetId = selectedHackathon?.id || selectedHackathon?._id;
    const currentAiReview = selectedHackathonTargetId 
        ? (aiReviewsMap[selectedHackathonTargetId] || (selectedHackathon?.id && aiReviewsMap[selectedHackathon.id]) || (selectedHackathon?._id && aiReviewsMap[selectedHackathon._id])) 
        : null;

    // Run AI review whenever switching to AI review tab or selecting another hackathon
    const handleRunAiReview = async (force = false, explicitId = null) => {
        const targetId = explicitId || selectedHackathon?.id || selectedHackathon?._id;
        if (!targetId) return;
        if (!force && (aiReviewsMap[targetId] || (selectedHackathon?.id && aiReviewsMap[selectedHackathon.id]))) return;
        
        setIsAiReviewLoading(true);
        try {
            const review = await fetchHackathonAiReview(targetId);
            if (review) {
                setAiReviewsMap(prev => ({
                    ...prev,
                    [targetId]: review,
                    ...(selectedHackathon?.id ? { [selectedHackathon.id]: review } : {}),
                    ...(selectedHackathon?._id ? { [selectedHackathon._id]: review } : {})
                }));
            } else {
                showToast("AI review generated empty evaluation", "warning");
            }
        } catch (error) {
            console.error("AI review evaluation failed:", error);
            showToast("AI evaluation failed to respond", "error");
        } finally {
            setIsAiReviewLoading(false);
        }
    };

    useEffect(() => {
        const targetId = selectedHackathon?.id || selectedHackathon?._id;
        if (activeDetailTab === 'ai-review' && targetId) {
            if (!aiReviewsMap[targetId] && !aiReviewsMap[selectedHackathon?.id]) {
                handleRunAiReview(false, targetId);
            }
        }
    }, [activeDetailTab, selectedHackathon?.id, selectedHackathon?._id]);

    // Actions
    const handleApprove = async (id) => {
        setActionLoading(true);
        try {
            await approveHackathon(id);
            setHackathons(prev => prev.map(h => h.id === id ? { ...h, status: 'Approved' } : h));
            showToast('Hackathon proposal approved and published!', 'success');
        } catch (error) {
            showToast('Failed to approve hackathon', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendChangeRequest = async () => {
        if (!selectedHackathon) return;
        setActionLoading(true);
        try {
            const selected = Object.keys(changeSections).filter(k => changeSections[k]);
            await requestHackathonChanges(selectedHackathon.id, selected, feedbackNote);
            setHackathons(prev => prev.map(h => h.id === selectedHackathon.id ? { 
                ...h, 
                status: 'Needs Revision',
                feedbackNote,
                feedbackSections: selected
            } : h));
            setIsRequestChangesOpen(false);
            setFeedbackNote('');
            setChangeSections({
                titleOrTagline: false,
                descriptionOrProblem: false,
                scheduleDates: false,
                challengeTracks: false,
                teamRules: false,
                submissionGuidelines: false
            });
            showToast('Revision request sent to organizer!', 'info');
        } catch (error) {
            showToast('Failed to send revision request', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedHackathon) return;
        setActionLoading(true);
        try {
            await rejectHackathon(selectedHackathon.id, rejectReason, rejectExplanation);
            setHackathons(prev => prev.map(h => h.id === selectedHackathon.id ? { 
                ...h, 
                status: 'Rejected',
                rejectionReason: rejectReason
            } : h));
            setIsRejectOpen(false);
            setRejectExplanation('');
            showToast('Hackathon proposal marked as Rejected', 'warning');
        } catch (error) {
            showToast('Failed to reject hackathon', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevert = async (id) => {
        setActionLoading(true);
        try {
            await revertHackathonToPending(id);
            setHackathons(prev => prev.map(h => h.id === id ? { ...h, status: 'Pending' } : h));
            showToast('Hackathon proposal reverted to Pending review', 'info');
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
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Hackathon Approvals</h1>
                    <p className="text-slate-600 dark:text-gray-400 mt-0.5 text-xs sm:text-sm font-medium">
                        Audit hackathon proposals directly matching the organizer creation flow across Basic Details, Tracks, and Rules.
                    </p>
                </div>
                <button 
                    onClick={loadHackathons} 
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
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">Total Proposals</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
                </div>
                <div className={`p-3 rounded-xl border flex flex-col justify-between ${theme.statBoxBg}`}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Review</p>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pending}</p>
                </div>
                <div className={`p-3 rounded-xl border flex flex-col justify-between ${theme.statBoxBg}`}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Approved Active</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.approved}</p>
                </div>
                <div className={`p-3 rounded-xl border flex flex-col justify-between ${theme.statBoxBg}`}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Needs Revision / Rejected</p>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.needsRevision + stats.rejected}</p>
                </div>
            </div>

            {/* Main Split-Pane Layout */}
            <div className="flex flex-col lg:flex-row gap-5 min-h-[580px]">
                
                {/* LEFT COLUMN: Hackathon Directory & Queue */}
                <div className="w-full lg:w-1/3 flex flex-col absolutestrange-card overflow-hidden p-0 h-[640px]">
                    
                    {/* Status Filter Tabs */}
                    <div className="p-2.5 border-b border-slate-200 dark:border-white/5 flex gap-1 shrink-0 bg-slate-50/70 dark:bg-white/[0.02] overflow-x-auto scrollbar-hide">
                        {['All', 'Pending', 'Approved', 'Needs Revision', 'Rejected'].map((tab) => {
                            const count = tab === 'All' ? hackathons.length :
                                          tab === 'Pending' ? stats.pending :
                                          tab === 'Approved' ? stats.approved :
                                          tab === 'Needs Revision' ? stats.needsRevision :
                                          stats.rejected;
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
                                placeholder="Search by title, track, organizer..." 
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
                                Loading Hackathon Proposals...
                            </div>
                        ) : filteredHackathons.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 dark:text-gray-500 text-xs">
                                No hackathons match the selected filter.
                            </div>
                        ) : (
                            filteredHackathons.map((hackathon) => {
                                const isSelected = selectedHackathonId === hackathon.id;
                                return (
                                    <div 
                                        key={hackathon.id} 
                                        onClick={() => setSelectedHackathonId(hackathon.id)}
                                        className={`p-3 rounded-xl cursor-pointer transition-all border text-left ${
                                            isSelected 
                                            ? 'bg-sky-50/90 dark:bg-sky-500/15 border-sky-400 dark:border-sky-500/60 shadow-sm' 
                                            : 'bg-white dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5 hover:border-sky-300 dark:hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className="pr-2 truncate">
                                                <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{hackathon.title}</h4>
                                                <p className="text-[11px] text-sky-600 dark:text-sky-400 font-bold truncate mt-0.5">{hackathon.organizer?.name || 'Platform Organizer'}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate">{hackathon.organizer?.org}</p>
                                            </div>
                                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                hackathon.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                                                hackathon.status === 'Needs Revision' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' :
                                                hackathon.status === 'Rejected' ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                                                'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-white/10'
                                            }`}>
                                                {hackathon.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-500 dark:text-gray-500 font-mono">
                                            <span className="truncate max-w-[150px]">
                                                {Array.isArray(hackathon.themes) ? hackathon.themes.join(', ') : hackathon.themes || 'General'}
                                            </span>
                                            <span>{hackathon.dates?.start || 'TBD'}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Detail Investigation Workspace */}
                <div className="w-full lg:w-2/3 absolutestrange-card flex flex-col overflow-hidden relative p-0 h-[640px]">
                    {selectedHackathon ? (
                        <>
                            {/* Selected Hackathon Top Bar */}
                            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 font-black text-lg flex items-center justify-center shadow-sm">
                                        <RocketIcon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{selectedHackathon.title}</h2>
                                            <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                                                selectedHackathon.status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                                                selectedHackathon.status === 'Needs Revision' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' :
                                                selectedHackathon.status === 'Rejected' ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                                                'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                            }`}>
                                                {selectedHackathon.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-gray-400 font-medium mt-0.5">
                                            Organized by <span className="text-sky-600 dark:text-sky-400 font-bold">{selectedHackathon.organizer?.name}</span> ({selectedHackathon.organizer?.org})
                                        </p>
                                    </div>
                                </div>

                                <div className="text-left sm:text-right flex items-center sm:block gap-3">
                                    <p className="text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider font-extrabold">Event Schedule</p>
                                    <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                                        {selectedHackathon.dates?.start} &rarr; {selectedHackathon.dates?.end}
                                    </p>
                                </div>
                            </div>

                            {/* Sub-tab Navigation */}
                            <div className="flex border-b border-slate-200 dark:border-white/10 px-4 pt-2 gap-3 shrink-0 bg-white dark:bg-transparent">
                                {[
                                    { id: 'proposal', label: '1. Proposal Details', icon: <RocketIcon className="w-3.5 h-3.5" /> },
                                    { id: 'stats', label: '2. Organizer & Event Stats', icon: <UsersIcon className="w-3.5 h-3.5" /> },
                                    { id: 'ai-review', label: '3. Feasibility & AI Review', icon: <ZapIcon className="w-3.5 h-3.5" /> },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveDetailTab(tab.id);
                                            if (tab.id === 'ai-review') {
                                                const targetId = selectedHackathon?.id || selectedHackathon?._id;
                                                if (targetId && !aiReviewsMap[targetId]) {
                                                    handleRunAiReview(false, targetId);
                                                }
                                            }
                                        }}
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
                                
                                {activeDetailTab === 'proposal' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* Status Alert if Needs Revision or Rejected */}
                                        {selectedHackathon.status === 'Needs Revision' && selectedHackathon.feedbackNote && (
                                            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                                                <p className="font-extrabold flex items-center gap-1.5 mb-1">
                                                    <TriangleAlertIcon className="w-4 h-4 text-amber-500" /> Organizer Revision Requested:
                                                </p>
                                                <p className="font-medium pl-5">{selectedHackathon.feedbackNote}</p>
                                            </div>
                                        )}

                                        {selectedHackathon.status === 'Rejected' && selectedHackathon.rejectionReason && (
                                            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs">
                                                <p className="font-extrabold flex items-center gap-1.5 mb-1">
                                                    <TriangleAlertIcon className="w-4 h-4 text-rose-500" /> Proposal Rejection Justification:
                                                </p>
                                                <p className="font-medium pl-5">{selectedHackathon.rejectionReason}</p>
                                            </div>
                                        )}

                                        {/* 1. Step 1: Basic Details & Overview */}
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3 flex items-center justify-between">
                                                <span>Step 1: Basic Details & Overview</span>
                                                <span className="text-sky-600 dark:text-sky-400 font-mono">Status: {selectedHackathon.status}</span>
                                            </h4>
                                            
                                            <div className="space-y-3 text-xs">
                                                <div>
                                                    <span className="text-slate-500 dark:text-gray-400 font-bold block mb-0.5">Tagline / Motto</span>
                                                    <p className="text-sky-600 dark:text-sky-400 font-medium italic">"{selectedHackathon.tagline}"</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 dark:text-gray-400 font-bold block mb-0.5">Event Description</span>
                                                    <p className="text-slate-800 dark:text-gray-200 leading-relaxed">{selectedHackathon.description}</p>
                                                </div>
                                                {selectedHackathon.problemStatement && (
                                                    <div className="pt-2 border-t border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400 font-bold block mb-0.5">Problem Statement</span>
                                                        <p className="text-slate-800 dark:text-gray-200 leading-relaxed font-mono bg-white/50 dark:bg-black/20 p-2.5 rounded-lg border border-slate-200/50 dark:border-white/5">
                                                            {selectedHackathon.problemStatement}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 2. Timeline & Registration Windows */}
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3">
                                                Event Timeline & Registration Windows
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                <div className="p-3 rounded-lg bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">Registration Window</span>
                                                    <p className="font-bold text-slate-900 dark:text-white font-mono">
                                                        {selectedHackathon.dates?.regStart} &rarr; {selectedHackathon.dates?.regEnd}
                                                    </p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 space-y-1">
                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">Hackathon Execution Window</span>
                                                    <p className="font-bold text-sky-600 dark:text-sky-400 font-mono">
                                                        {selectedHackathon.dates?.start} &rarr; {selectedHackathon.dates?.end}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Step 2: Tracks & Categories */}
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3 flex items-center justify-between">
                                                <span>Step 2: Challenge Tracks & Themes</span>
                                                <span className="font-mono text-sky-600 dark:text-sky-400">{selectedHackathon.tracks?.length || 1} Tracks Configured</span>
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {selectedHackathon.tracks?.map((track, i) => (
                                                    <div key={i} className="p-3 rounded-lg bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-xs">
                                                        <h5 className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                                            {track.title}
                                                        </h5>
                                                        <p className="text-[11px] text-slate-600 dark:text-gray-400">{track.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 4. Step 3: Rules & Participation Settings */}
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3">
                                                Step 3: Participation Settings & Rules
                                            </h4>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-xs">
                                                <div className="p-2.5 rounded-lg bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-center">
                                                    <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-gray-400 block">Team Limit</span>
                                                    <span className="font-bold text-slate-900 dark:text-white">{selectedHackathon.minTeamSize}-{selectedHackathon.maxTeamSize} Members</span>
                                                </div>
                                                <div className="p-2.5 rounded-lg bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-center">
                                                    <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-gray-400 block">Visibility</span>
                                                    <span className="font-bold text-sky-600 dark:text-sky-400">{selectedHackathon.isPublic ? 'Public Event' : 'Private Event'}</span>
                                                </div>
                                                <div className="p-2.5 rounded-lg bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-center">
                                                    <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-gray-400 block">Auto-Approval</span>
                                                    <span className="font-bold text-slate-900 dark:text-white">{selectedHackathon.autoApprove ? 'Enabled' : 'Manual'}</span>
                                                </div>
                                                <div className="p-2.5 rounded-lg bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-center">
                                                    <span className="text-[9px] font-bold uppercase text-slate-500 dark:text-gray-400 block">Submission Fee</span>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Free</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-white/5">
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase block mb-1">Official Submission Rules</span>
                                                <ul className="space-y-1 text-xs text-slate-700 dark:text-gray-300">
                                                    {Array.isArray(selectedHackathon.rules) ? selectedHackathon.rules.map((rule, idx) => (
                                                        <li key={idx} className="flex items-start gap-2">
                                                            <span className="font-bold text-sky-500">{idx + 1}.</span>
                                                            <span>{rule}</span>
                                                        </li>
                                                    )) : (
                                                        <p className="font-mono">{selectedHackathon.rules}</p>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {activeDetailTab === 'stats' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        {/* Organizer Intelligence Card */}
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3">
                                                Host Organizer Profile & Trust Matrix
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                                <div className="space-y-2">
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Organizer Name</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedHackathon.organizer?.name}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Organization</span>
                                                        <span className="font-bold text-sky-600 dark:text-sky-400">{selectedHackathon.organizer?.org}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Official Email</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{selectedHackathon.organizer?.email || "organizer@platform.org"}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b pb-1.5 border-slate-200/60 dark:border-white/5">
                                                        <span className="text-slate-500 dark:text-gray-400">Past Events Hosted</span>
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedHackathon.organizer?.pastEvents || 1} Events</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Real-time Activity Stats */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className={`p-3.5 rounded-xl border text-center ${theme.statBoxBg}`}>
                                                <p className="text-2xl font-black text-slate-900 dark:text-white">{selectedHackathon.stats?.participants || 0}</p>
                                                <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-gray-400 mt-1">Registrations</p>
                                            </div>
                                            <div className={`p-3.5 rounded-xl border text-center ${theme.statBoxBg}`}>
                                                <p className="text-2xl font-black text-sky-600 dark:text-sky-400">{selectedHackathon.stats?.teams || 0}</p>
                                                <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-gray-400 mt-1">Teams Formed</p>
                                            </div>
                                            <div className={`p-3.5 rounded-xl border text-center ${theme.statBoxBg}`}>
                                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{selectedHackathon.stats?.submissions || 0}</p>
                                                <p className="text-[9px] font-bold uppercase text-slate-500 dark:text-gray-400 mt-1">Submissions</p>
                                            </div>
                                        </div>

                                        {/* Audit Timeline */}
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3">
                                                Proposal Milestone Record
                                            </h4>
                                            <div className="space-y-3 text-xs">
                                                <div className="flex items-start gap-3">
                                                    <span className="w-2 h-2 rounded-full bg-sky-500 mt-1 shrink-0"></span>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">Proposal Drafted by Organizer</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-gray-400">{selectedHackathon.createdAt}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0"></span>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white">Submitted for Administrative Review</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-gray-400">Current Queue State</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                )}

                                {activeDetailTab === 'ai-review' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                                                <ZapIcon className="w-4 h-4" /> AI Feasibility & Rubric Analysis
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
                                                label="Performing AI Feasibility Analysis..." 
                                                subtext="Evaluating track problem statements, timeline schedule sanity, and rule compliance..."
                                            />
                                        ) : currentAiReview ? (
                                            <div className="space-y-4 text-xs">
                                                {/* Score Overview */}
                                                <div className="p-4 rounded-xl border bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30 flex items-center justify-between">
                                                    <div>
                                                        <span className="font-black uppercase tracking-wider text-[10px] text-sky-700 dark:text-sky-300 block mb-1">Proposal Score</span>
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-3xl font-black text-sky-600 dark:text-sky-400">
                                                                {currentAiReview.overallScore !== undefined ? currentAiReview.overallScore : 75}
                                                            </span>
                                                            <span className="text-xs text-slate-500 font-bold">/ 100</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-black uppercase tracking-wider text-[10px] text-slate-500 block mb-1">AI Recommendation</span>
                                                        <span className={`px-3 py-1 rounded-full font-extrabold text-xs uppercase border ${
                                                            currentAiReview.recommendation === 'APPROVE' 
                                                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                                                                : currentAiReview.recommendation === 'REJECT'
                                                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                                                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                        }`}>
                                                            {currentAiReview.recommendation ? currentAiReview.recommendation.replace(/_/g, ' ') : 'APPROVE'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Metric Bars */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
                                                        <div className="flex justify-between font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                                                            <span>Clarity & Problem Scope</span>
                                                            <span className="text-sky-600 dark:text-sky-400">
                                                                {currentAiReview.clarityScore !== undefined ? currentAiReview.clarityScore : 70}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-sky-500 rounded-full transition-all duration-500" 
                                                                style={{ width: `${Math.min(100, Math.max(5, currentAiReview.clarityScore !== undefined ? currentAiReview.clarityScore : 70))}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>

                                                    <div className={`p-3 rounded-xl border ${theme.innerBg}`}>
                                                        <div className="flex justify-between font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                                                            <span>Timeline & Feasibility</span>
                                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                                {currentAiReview.feasibilityScore !== undefined ? currentAiReview.feasibilityScore : 70}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                                                                style={{ width: `${Math.min(100, Math.max(5, currentAiReview.feasibilityScore !== undefined ? currentAiReview.feasibilityScore : 70))}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Strengths & Concerns */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {currentAiReview.strengths && (
                                                        <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20">
                                                            <span className="font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 text-[10px] block mb-1.5">✓ Strengths</span>
                                                            <ul className="space-y-1 list-disc pl-4 text-slate-700 dark:text-slate-300 text-[11px]">
                                                                {currentAiReview.strengths.map((s, i) => (
                                                                    <li key={i}>{s}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {currentAiReview.concerns && (
                                                        <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/20">
                                                            <span className="font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 text-[10px] block mb-1.5">⚠ Improvement Areas</span>
                                                            <ul className="space-y-1 list-disc pl-4 text-slate-700 dark:text-slate-300 text-[11px]">
                                                                {currentAiReview.concerns.map((c, i) => (
                                                                    <li key={i}>{c}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Suggested Feedback Note */}
                                                {currentAiReview.suggestedFeedback && (
                                                    <div className="p-3.5 rounded-xl border bg-sky-50 dark:bg-black/30 border-sky-200 dark:border-white/5">
                                                        <span className="font-bold text-[10px] uppercase text-sky-700 dark:text-sky-400 block mb-1">Recommended Organizer Guidance</span>
                                                        <p className="text-slate-700 dark:text-gray-300 italic mb-2">{currentAiReview.suggestedFeedback}</p>
                                                        <button 
                                                            onClick={() => {
                                                                setFeedbackNote(currentAiReview.suggestedFeedback);
                                                                setIsRequestChangesOpen(true);
                                                            }}
                                                            className="px-3.5 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 rounded-xl text-[10px] font-bold transition-all shadow-sm"
                                                        >
                                                            Use as Revision Feedback &rarr;
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-3">
                                                <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                                                    <ZapIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white">AI Feasibility Rubric Ready to Run</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">Click below to generate an automated feasibility, clarity, and rules evaluation.</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleRunAiReview(true)}
                                                    disabled={isAiReviewLoading}
                                                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    <ZapIcon className="w-3.5 h-3.5" />
                                                    {isAiReviewLoading ? 'Analyzing...' : 'Generate AI Proposal Review'}
                                                </button>
                                            </div>
                                        )}

                                    </div>
                                )}

                            </div>

                            {/* Bottom Action Bar */}
                            <div className="p-3.5 sm:p-4 bg-white dark:bg-navy-900 border-t border-slate-200 dark:border-white/10 flex flex-wrap justify-between items-center gap-3 shrink-0 shadow-lg">
                                <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
                                    Status: <span className="font-black text-slate-900 dark:text-white uppercase">{selectedHackathon.status}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                    {(selectedHackathon.status === 'Pending' || selectedHackathon.status === 'Needs Revision') && (
                                        <>
                                            <button 
                                                onClick={() => setIsRejectOpen(true)}
                                                disabled={actionLoading}
                                                className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-bold rounded-xl transition-all active:scale-95"
                                            >
                                                Reject Proposal
                                            </button>
                                            <button 
                                                onClick={() => setIsRequestChangesOpen(true)}
                                                disabled={actionLoading}
                                                className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-xs font-bold rounded-xl transition-all active:scale-95"
                                            >
                                                Request Revision
                                            </button>
                                            <button 
                                                onClick={() => handleApprove(selectedHackathon.id)}
                                                disabled={actionLoading}
                                                className="px-5 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                                            >
                                                <CheckIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                                Approve & Publish
                                            </button>
                                        </>
                                    )}

                                    {selectedHackathon.status === 'Approved' && (
                                        <button 
                                            onClick={() => handleRevert(selectedHackathon.id)}
                                            disabled={actionLoading}
                                            className="px-4 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-all"
                                        >
                                            Revert to Pending
                                        </button>
                                    )}

                                    {selectedHackathon.status === 'Rejected' && (
                                        <>
                                            <button 
                                                onClick={() => handleApprove(selectedHackathon.id)}
                                                disabled={actionLoading}
                                                className="px-4 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 text-xs font-bold rounded-xl shadow-sm transition-all"
                                            >
                                                Re-Approve Proposal
                                            </button>
                                            <button 
                                                onClick={() => handleRevert(selectedHackathon.id)}
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
                            <RocketIcon className="w-12 h-12 mb-3 opacity-30" />
                            <p className="font-bold text-sm">Select a hackathon proposal from the left list to review.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* REQUEST REVISION MODAL */}
            <ActionModal 
                isOpen={isRequestChangesOpen} 
                onClose={() => setIsRequestChangesOpen(false)} 
                title="Request Proposal Revisions"
                subtitle="Select specific sections the organizer needs to modify before publishing."
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2.5">
                        {[
                            { key: 'titleOrTagline', label: 'Title or Tagline Details' },
                            { key: 'descriptionOrProblem', label: 'Description & Problem Statement' },
                            { key: 'scheduleDates', label: 'Event Schedule & Timelines' },
                            { key: 'challengeTracks', label: 'Challenge Tracks & Themes' },
                            { key: 'teamRules', label: 'Team Limit Constraints' },
                            { key: 'submissionGuidelines', label: 'Submission Rules & Policy' },
                        ].map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300 cursor-pointer p-2 rounded-lg bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5">
                                <input 
                                    type="checkbox" 
                                    className="rounded text-sky-600 focus:ring-sky-500" 
                                    checked={changeSections[key]} 
                                    onChange={(e) => setChangeSections({...changeSections, [key]: e.target.checked})} 
                                /> 
                                <span className="font-medium truncate">{label}</span>
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">Revision Feedback Note to Organizer:</label>
                        <textarea 
                            placeholder="Detail exactly what modifications are requested..." 
                            rows="3" 
                            value={feedbackNote} 
                            onChange={(e) => setFeedbackNote(e.target.value)} 
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
                            {actionLoading ? 'Submitting...' : 'Send Revision Request'}
                        </button>
                    </div>
                </div>
            </ActionModal>

            {/* REJECT MODAL */}
            <ActionModal 
                isOpen={isRejectOpen} 
                onClose={() => setIsRejectOpen(false)} 
                title="Reject Hackathon Proposal"
                subtitle="Select the justification for rejecting this proposal."
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        {[
                            'Insufficient Problem Statement',
                            'Invalid Event Timeline / Schedule',
                            'Policy Violation',
                            'Duplicate Event Proposal',
                            'Organizer Verification Incomplete',
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
                        <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">Additional Context (Optional):</label>
                        <textarea 
                            placeholder="Provide any additional explanation for audit log..." 
                            rows="2" 
                            value={rejectExplanation} 
                            onChange={(e) => setRejectExplanation(e.target.value)} 
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

        </div>
    );
};

export default HackathonApprovals;
