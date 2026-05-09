import React, { useEffect, useMemo, useState } from 'react';
import { fetchAdminSubmissions, updateSubmissionStatus } from '../../services/admin/adminSubmissionsApi';

const tabs = ['Pending Review', 'Approved', 'Rejected'];
const statusMap = {
    Pending: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    Approved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    Rejected: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
};

const Toast = ({ toast, clear }) => {
    useEffect(() => {
        const timer = setTimeout(clear, 2800);
        return () => clearTimeout(timer);
    }, [clear]);

    return (
        <div className={`fixed bottom-6 right-6 z-50 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-2xl ${toast.type === 'error' ? 'bg-rose-500/90' : 'bg-emerald-500/90'}`}>
            {toast.message}
        </div>
    );
};

const SummaryTile = ({ label, value, accent }) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">{label}</p>
        <p className={`mt-2 text-2xl font-black ${accent}`}>{value}</p>
    </div>
);

const getTabStatus = (tab) => (tab === 'Pending Review' ? 'Pending' : tab);

const AdminSubmissions = () => {
    const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('admin_sub_activeTab') || 'Pending Review');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [sortOrder, setSortOrder] = useState('recent');
    const [searchTerm, setSearchTerm] = useState('');
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [reviewNote, setReviewNote] = useState('');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        sessionStorage.setItem('admin_sub_activeTab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const data = await fetchAdminSubmissions();
                setSubmissions(data);
                setSelectedId((current) => current ?? data[0]?.id ?? null);
            } catch (error) {
                console.error('Failed to load submission ledger', error);
                setToast({ message: 'Failed to load submissions.', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, []);

    const categories = useMemo(() => Array.from(new Set(submissions.map((item) => item.hackathon))), [submissions]);

    const filtered = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return submissions
            .filter((item) => item.status === getTabStatus(activeTab))
            .filter((item) => !categoryFilter || item.hackathon === categoryFilter)
            .filter((item) => !query || item.project.toLowerCase().includes(query) || item.team.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query))
            .sort((a, b) => (sortOrder === 'oldest' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp));
    }, [activeTab, categoryFilter, searchTerm, sortOrder, submissions]);

    useEffect(() => {
        if (!filtered.some((item) => item.id === selectedId)) {
            setSelectedId(filtered[0]?.id ?? null);
            setReviewNote('');
        }
    }, [filtered, selectedId]);

    const selected = submissions.find((item) => item.id === selectedId) || filtered[0] || null;

    const counts = useMemo(() => ({
        pending: submissions.filter((item) => item.status === 'Pending').length,
        approved: submissions.filter((item) => item.status === 'Approved').length,
        rejected: submissions.filter((item) => item.status === 'Rejected').length,
    }), [submissions]);

    const handleStatus = async (id, status) => {
        if (actionLoading[id]) return;
        const previous = submissions;
        setSubmissions((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
        setActionLoading((current) => ({ ...current, [id]: true }));

        try {
            const result = await updateSubmissionStatus(id, status);
            if (!result.success) throw new Error('Status update failed.');
            setReviewNote('');
            setToast({ message: `Submission marked ${status.toLowerCase()}.`, type: 'success' });
        } catch (error) {
            setSubmissions(previous);
            setToast({ message: error.message || 'Failed to update submission.', type: 'error' });
        } finally {
            setActionLoading((current) => ({ ...current, [id]: false }));
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in">
            {toast && <Toast toast={toast} clear={() => setToast(null)} />}

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Submissions</h1>
                <p className="text-gray-400">Review project entries in the same split-pane workflow used for disputes and reports.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SummaryTile label="Pending Review" value={counts.pending} accent="text-amber-300" />
                <SummaryTile label="Approved" value={counts.approved} accent="text-emerald-300" />
                <SummaryTile label="Rejected" value={counts.rejected} accent="text-rose-300" />
            </div>

            <div className="flex flex-1 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
                <aside className="w-full lg:w-[380px] border-r border-white/10 flex flex-col">
                    <div className="p-5 border-b border-white/10 space-y-4">
                        <div className="flex gap-2 overflow-x-auto">
                            {tabs.map((tab) => (
                                <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition ${activeTab === tab ? 'bg-white text-slate-950' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                                    {tab}
                                </button>
                            ))}
                        </div>
                        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search project, team, or category" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
                        <div className="grid grid-cols-2 gap-3">
                            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-gray-300 focus:outline-none">
                                <option value="">All events</option>
                                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-gray-300 focus:outline-none">
                                <option value="recent">Most recent</option>
                                <option value="oldest">Oldest first</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {isLoading ? Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse">
                                <div className="h-3 w-20 rounded bg-white/10" />
                                <div className="mt-3 h-4 w-40 rounded bg-white/10" />
                                <div className="mt-3 h-3 w-24 rounded bg-white/10" />
                            </div>
                        )) : filtered.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
                                <p className="text-sm font-semibold text-white">No submissions found.</p>
                                <p className="mt-2 text-sm text-gray-400">Try a different status, search, or event filter.</p>
                            </div>
                        ) : filtered.map((item) => (
                            <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === item.id ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.08]'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <img src={item.team.avatar} alt="" className="h-11 w-11 rounded-xl border border-white/10 object-cover" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">{item.project}</p>
                                            <p className="truncate text-xs text-gray-400">{item.team.name}</p>
                                        </div>
                                    </div>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${statusMap[item.status]}`}>{item.status}</span>
                                </div>
                                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                                    <span>{item.hackathon}</span>
                                    <span>{item.date}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="flex-1 overflow-y-auto">
                    {!selected ? (
                        <div className="flex h-full items-center justify-center p-10 text-center">
                            <div>
                                <p className="text-lg font-semibold text-white">Select a submission to review.</p>
                                <p className="mt-2 text-sm text-gray-400">The detail panel shows deliverables, event context, and approval actions.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 lg:p-8 space-y-6">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div className="flex items-start gap-4">
                                    <img src={selected.team.avatar} alt="" className="h-16 w-16 rounded-2xl border border-white/10 object-cover" />
                                    <div>
                                        <div className="mb-3 flex flex-wrap items-center gap-3">
                                            <h2 className="text-2xl font-bold text-white">{selected.project}</h2>
                                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${statusMap[selected.status]}`}>{selected.status}</span>
                                        </div>
                                        <p className="text-sm text-gray-400">{selected.desc}</p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">{selected.team.name}</span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">{selected.hackathon}</span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">{selected.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 xl:min-w-[280px]">
                                    <SummaryTile label="Status" value={selected.status} accent="text-white" />
                                    <SummaryTile label="Submitted" value={selected.date} accent="text-white" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Review Snapshot</p>
                                    <div className="mt-5 space-y-4 text-sm">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-gray-400">Team</span><span className="font-semibold text-white">{selected.team.name}</span></div>
                                        <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-gray-400">Hackathon</span><span className="font-semibold text-white">{selected.hackathon}</span></div>
                                        <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-gray-400">Category</span><span className="font-semibold text-white">{selected.category}</span></div>
                                        <div className="flex items-center justify-between"><span className="text-gray-400">Deliverables</span><span className="font-semibold text-white">{selected.docs.length}</span></div>
                                    </div>
                                </div>
                                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Deliverables</p>
                                    <div className="mt-5 grid gap-3">
                                        {selected.docs.map((doc) => (
                                            <div key={doc.type} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{doc.icon}</span>
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">{doc.type}</p>
                                                        <p className="text-xs text-gray-400">Ready for admin audit</p>
                                                    </div>
                                                </div>
                                                <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/10">Preview</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Decision Notes</p>
                                <p className="mt-2 text-sm text-gray-400">Capture internal reasoning before approving or rejecting the entry.</p>
                                <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Add quality notes, policy concerns, or escalation comments..." className="mt-5 h-32 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
                                <div className="mt-5 flex flex-wrap gap-3">
                                    <button onClick={() => handleStatus(selected.id, 'Rejected')} disabled={!!actionLoading[selected.id]} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50">{actionLoading[selected.id] ? 'Updating...' : 'Reject Submission'}</button>
                                    <button onClick={() => handleStatus(selected.id, 'Approved')} disabled={!!actionLoading[selected.id]} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50">{actionLoading[selected.id] ? 'Updating...' : 'Approve Submission'}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default AdminSubmissions;
