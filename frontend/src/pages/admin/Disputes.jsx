import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../../services/admin/adminDisputesApi';

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────
const statusMeta = (status = '') => {
    const s = status.toLowerCase();
    if (s === 'resolved') return { color: 'emerald', label: 'Resolved' };
    if (s === 'investigating') return { color: 'blue', label: 'Investigating' };
    return { color: 'blue', label: 'Open' };
};

const matchesFilter = (dispute, filter) => {
    if (filter === 'Open') return dispute.status !== 'resolved';
    if (filter === 'Resolved') return dispute.status === 'resolved';
    return true;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Skeleton loaders (no layout shift)
// ─────────────────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="p-4 rounded-2xl border glass border-white/10 animate-pulse space-y-3">
        <div className="flex justify-between">
            <div className="h-3 w-16 bg-white/10 rounded" />
            <div className="h-3 w-12 bg-white/10 rounded" />
        </div>
        <div className="h-4 w-36 bg-white/10 rounded" />
        <div className="flex justify-between">
            <div className="h-3 w-24 bg-white/10 rounded" />
            <div className="h-3 w-14 bg-white/10 rounded" />
        </div>
    </div>
);

const SkeletonDetail = () => (
    <div className="p-8 space-y-8 animate-pulse">
        <div className="grid grid-cols-2 gap-6">
            {[0, 1].map((i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="h-2 w-16 bg-white/10 rounded" />
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10" />
                        <div className="space-y-2">
                            <div className="h-3 w-24 bg-white/10 rounded" />
                            <div className="h-2 w-32 bg-white/10 rounded" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
        <div className="space-y-3">
            <div className="h-5 w-36 bg-white/10 rounded" />
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="h-3 w-full bg-white/10 rounded" />
                <div className="h-3 w-5/6 bg-white/10 rounded" />
                <div className="h-3 w-4/6 bg-white/10 rounded" />
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Toast notification (no layout shift – absolute positioned)
// ─────────────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onDone }) => {
    useEffect(() => {
        const t = setTimeout(onDone, 3200);
        return () => clearTimeout(t);
    }, [onDone]);

    const bg = type === 'error' ? 'bg-red-500/90' : 'bg-emerald-500/90';
    return (
        <div
            className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-2xl ${bg} backdrop-blur-md transition-all`}
        >
            {message}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────────────────
const AdminDisputes = () => {
    // ── State ──────────────────────────────────────────────────────────────
    const [disputes, setDisputes] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('Open');
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState({}); // { [actionKey]: bool }
    const [resolution, setResolution] = useState('');
    const [toast, setToast] = useState(null); // { message, type }
    const [error, setError] = useState(null);

    const pollingRef = useRef(null);

    // ── Helpers ────────────────────────────────────────────────────────────
    const showToast = (message, type = 'success') =>
        setToast({ message, type });

    const setActionBusy = (key, val) =>
        setActionLoading((prev) => ({ ...prev, [key]: val }));

    // ── Data Fetching ──────────────────────────────────────────────────────
    const fetchDisputes = useCallback(async (preserveSelection = true) => {
        try {
            const data = await api.getDisputes(statusFilter);
            const list = Array.isArray(data) ? data : data.disputes || [];
            setDisputes(list);
            setError(null);
            if (!preserveSelection || !selectedId) {
                setSelectedId(list[0]?.id ?? null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, selectedId]);

    // Initial load and tab change
    useEffect(() => {
        setLoading(true);
        setSelectedId(null);
        fetchDisputes(false);
    }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    // Polling – refresh list every 30 s (real-time fallback)
    useEffect(() => {
        pollingRef.current = setInterval(() => fetchDisputes(true), 30_000);
        return () => clearInterval(pollingRef.current);
    }, [fetchDisputes]);

    // When selected ID changes and we have full detail from the server, fetch it
    useEffect(() => {
        if (!selectedId) return;
        setDetailLoading(true);
        api.getDisputeById(selectedId)
            .then((data) => {
                setDisputes((prev) =>
                    prev.map((d) => (d.id === data.id ? { ...d, ...data } : d))
                );
            })
            .catch(() => { /* silently keep cached data */ })
            .finally(() => setDetailLoading(false));
    }, [selectedId]);

    // ── Derived State ──────────────────────────────────────────────────────
    const filteredDisputes = disputes.filter((d) => matchesFilter(d, statusFilter));
    const currentDispute = disputes.find((d) => d.id === selectedId) || filteredDisputes[0] || null;
    const sm = currentDispute ? statusMeta(currentDispute.status) : { color: 'gray', label: '' };

    // ── Action Handlers ────────────────────────────────────────────────────
    const handleSelectDispute = (id) => {
        if (id === selectedId) return;
        setResolution('');
        setSelectedId(id);
    };

    const handleViewHackathon = () => {
        if (!currentDispute?.hackathonId) return;
        window.open(`/admin/hackathon-approvals`, '_blank');
    };

    const handleSuspendUser = async () => {
        if (!currentDispute) return;
        const key = `suspend-${currentDispute.id}`;
        if (actionLoading[key]) return;
        setActionBusy(key, true);
        try {
            await api.suspendUser(currentDispute.id);
            showToast('User suspended successfully.');
            await fetchDisputes(true);
        } catch (e) {
            showToast(e.message || 'Failed to suspend user.', 'error');
        } finally {
            setActionBusy(key, false);
        }
    };

    const handleRequestMoreInfo = async () => {
        if (!currentDispute) return;
        const key = `info-${currentDispute.id}`;
        if (actionLoading[key]) return;
        const msg = resolution.trim();
        if (!msg) {
            showToast('Please add an update message before requesting more info.', 'error');
            return;
        }
        setActionBusy(key, true);
        try {
            await api.requestMoreInfo(currentDispute.id, msg);
            showToast('Request for more info sent.');
            setResolution('');
            await fetchDisputes(true);
        } catch (e) {
            showToast(e.message || 'Failed to send request.', 'error');
        } finally {
            setActionBusy(key, false);
        }
    };

    const handleSubmitResolution = async () => {
        if (!currentDispute) return;
        const key = `resolve-${currentDispute.id}`;
        if (actionLoading[key]) return;
        const text = resolution.trim();
        if (!text) {
            showToast('Resolution text cannot be empty.', 'error');
            return;
        }
        setActionBusy(key, true);
        try {
            await api.submitResolution(currentDispute.id, text);
            // Optimistic update
            setDisputes((prev) =>
                prev.map((d) =>
                    d.id === currentDispute.id
                        ? {
                            ...d,
                            status: 'resolved',
                            workflow: d.workflow?.map((step, i) =>
                                i === 2
                                    ? { ...step, active: true, detail: text }
                                    : step
                            ),
                        }
                        : d
                )
            );
            setResolution('');
            showToast('Resolution submitted successfully.');
        } catch (e) {
            showToast(e.message || 'Failed to submit resolution.', 'error');
        } finally {
            setActionBusy(key, false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in">
            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onDone={() => setToast(null)}
                />
            )}

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Disputes &amp; Reports</h1>
                <p className="text-gray-400">Manage platform disputes and conduct investigations.</p>
            </div>

            {/* Split Layout */}
            <div className="flex flex-1 gap-6 overflow-hidden">

                {/* ── Left Panel: Case List ── */}
                <div className="w-1/3 flex flex-col gap-4">
                    {/* Tab Filters */}
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                        {['Open', 'Resolved'].map((filter) => (
                            <button
                                key={filter}
                                id={`tab-${filter.toLowerCase()}`}
                                onClick={() => setStatusFilter(filter)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${statusFilter === filter
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>

                    {/* Scrollable Case List */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {loading ? (
                            [1, 2, 3].map((i) => <SkeletonCard key={i} />)
                        ) : filteredDisputes.length === 0 ? (
                            <div className="glass border border-white/10 rounded-2xl p-6 text-center text-gray-400 text-sm">
                                No {statusFilter.toLowerCase()} disputes found.
                            </div>
                        ) : (
                            filteredDisputes.map((item) => {
                                const { color, label } = statusMeta(item.status);
                                const isActive = item.id === selectedId;
                                return (
                                    <div
                                        key={item.id}
                                        id={`dispute-card-${item.id}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleSelectDispute(item.id)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSelectDispute(item.id)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer group ${isActive
                                                ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/10'
                                                : 'glass border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span
                                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${item.priority === 'Critical'
                                                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                                        : 'bg-white/5 border-white/10 text-gray-400'
                                                    }`}
                                            >
                                                {item.priority}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-medium">{item.time}</span>
                                        </div>
                                        <h3 className="text-white font-bold mb-1 group-hover:text-blue-400 transition-colors">
                                            {item.type}
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-400">
                                                Team:{' '}
                                                <span className="text-gray-300 font-medium">{item.team}</span>
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border bg-${color}-500/10 border-${color}-500/20 text-${color}-400`}
                                            >
                                                {label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── Right Panel: Case Details ── */}
                <div className="flex-1 glass border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                    {!currentDispute ? (
                        <div className="flex flex-1 items-center justify-center text-gray-500 text-sm">
                            {loading ? 'Loading…' : 'Select a dispute to view details.'}
                        </div>
                    ) : (
                        <>
                            {/* Details Header */}
                            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl font-bold text-white">{currentDispute.type}</h2>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold border bg-${sm.color}-500/10 border-${sm.color}-500/20 text-${sm.color}-400`}
                                    >
                                        {sm.label}
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        id="btn-view-hackathon"
                                        onClick={handleViewHackathon}
                                        className="px-4 py-2 glass rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors border border-white/10"
                                    >
                                        View Hackathon
                                    </button>
                                    <button
                                        id={`btn-suspend-${currentDispute.id}`}
                                        onClick={handleSuspendUser}
                                        disabled={!!actionLoading[`suspend-${currentDispute.id}`]}
                                        className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/20 transition-colors border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {actionLoading[`suspend-${currentDispute.id}`] ? 'Suspending…' : 'Suspend User'}
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="p-8 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
                                {detailLoading ? (
                                    <SkeletonDetail />
                                ) : (
                                    <>
                                        {/* Reporter & Reported Team */}
                                        <div className="grid grid-cols-2 gap-6">
                                            {/* Reporter */}
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                                <p className="text-[10px] uppercase font-bold text-gray-500 mb-3 tracking-widest">
                                                    Reporter
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-sm">
                                                        {currentDispute.reporter?.initials || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-sm">
                                                            {currentDispute.reporter?.name || 'Unknown'}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {currentDispute.reporter?.role || ''} •{' '}
                                                            {currentDispute.reporter?.org || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reported Team */}
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                                <p className="text-[10px] uppercase font-bold text-gray-500 mb-3 tracking-widest">
                                                    Reported Team
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-pink-600 flex items-center justify-center font-bold text-sm">
                                                        {currentDispute.reportedTeam?.initials || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold text-sm">
                                                            {currentDispute.reportedTeam?.name || currentDispute.team}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {currentDispute.reportedTeam?.type || 'Team'} •{' '}
                                                            {currentDispute.reportedTeam?.members || 0} Members
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Complaint Details */}
                                        <div className="space-y-3">
                                            <h3 className="text-lg font-bold text-white">Complaint Details</h3>
                                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                                                <p className="text-sm text-gray-300 leading-relaxed font-light">
                                                    {currentDispute.description || 'No description provided.'}
                                                </p>
                                                {currentDispute.evidence?.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {currentDispute.evidence.map((ev, i) => (
                                                            <a
                                                                key={i}
                                                                href={ev.url || '#'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                                </svg>
                                                                {ev.label}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Resolution Workflow */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-bold text-white">Resolution Workflow</h3>
                                            <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                                                {(currentDispute.workflow || [
                                                    { label: 'Report Received', detail: '', active: true },
                                                    { label: 'Under Investigation', detail: '', active: false },
                                                    { label: 'Final Decision', detail: '', active: false },
                                                ]).map((step, i) => (
                                                    <div
                                                        key={i}
                                                        className={`relative flex items-start gap-4 transition-opacity ${step.active ? 'opacity-100' : 'opacity-40'}`}
                                                    >
                                                        <div
                                                            className={`absolute -left-[27px] w-4 h-4 rounded-full z-10 ${step.active
                                                                    ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                                                                    : 'bg-white/20'
                                                                }`}
                                                        />
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{step.label}</p>
                                                            {step.detail && (
                                                                <p className={`text-xs ${step.sub ? 'text-gray-400 font-medium' : 'text-gray-500'}`}>
                                                                    {step.detail}
                                                                </p>
                                                            )}
                                                            {step.sub && (
                                                                <p className="text-[10px] text-gray-600 mt-1">{step.sub}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Update / Resolution Section */}
                                        <div className="space-y-3 pt-4">
                                            <textarea
                                                id="resolution-input"
                                                value={resolution}
                                                onChange={(e) => setResolution(e.target.value)}
                                                placeholder="Add an update or final decision..."
                                                className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none font-light"
                                            />
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    id={`btn-request-info-${currentDispute.id}`}
                                                    onClick={handleRequestMoreInfo}
                                                    disabled={!!actionLoading[`info-${currentDispute.id}`]}
                                                    className="px-6 py-2.5 glass rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {actionLoading[`info-${currentDispute.id}`] ? 'Sending…' : 'Request More Info'}
                                                </button>
                                                <button
                                                    id={`btn-submit-resolution-${currentDispute.id}`}
                                                    onClick={handleSubmitResolution}
                                                    disabled={!!actionLoading[`resolve-${currentDispute.id}`]}
                                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {actionLoading[`resolve-${currentDispute.id}`] ? 'Submitting…' : 'Submit Resolution'}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDisputes;
