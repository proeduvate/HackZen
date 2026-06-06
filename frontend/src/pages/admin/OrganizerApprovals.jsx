import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchOrganizerApprovals, updateOrganizerStatus } from '../../services/admin/organizerApprovalsApi';

const tabs = ['Pending', 'Approved', 'Rejected', 'All Organizers'];
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

const OrganizerApprovals = () => {
    const [organizers, setOrganizers] = useState([]);
    const [activeTab, setActiveTab] = useState('Pending');
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [toast, setToast] = useState(null);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const data = await fetchOrganizerApprovals();
                setOrganizers(data);
                setSelectedId((current) => current ?? data[0]?.id ?? null);
            } catch (error) {
                console.error('Failed to fetch approvals:', error);
                setToast({ message: 'Failed to load organizer approvals.', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, []);

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return organizers
            .filter((item) => activeTab === 'All Organizers' || item.status === activeTab)
            .filter((item) => !query || item.name.toLowerCase().includes(query) || item.organization.toLowerCase().includes(query) || item.orgType.toLowerCase().includes(query));
    }, [activeTab, organizers, searchQuery]);

    useEffect(() => {
        if (!filtered.some((item) => item.id === selectedId)) {
            setSelectedId(filtered[0]?.id ?? null);
        }
    }, [filtered, selectedId]);

    const counts = useMemo(() => organizers.reduce((acc, item) => {
        acc.pending += item.status === 'Pending' ? 1 : 0;
        acc.approved += item.status === 'Approved' ? 1 : 0;
        acc.rejected += item.status === 'Rejected' ? 1 : 0;
        return acc;
    }, { pending: 0, approved: 0, rejected: 0 }), [organizers]);

    const selected = organizers.find((item) => item.id === selectedId) || filtered[0] || null;

    const handleAction = useCallback(async (id, action) => {
        if (actionLoading[id]) return;
        setActionLoading((current) => ({ ...current, [id]: action }));
        try {
            const response = await updateOrganizerStatus(id, action);
            if (!response.success) throw new Error('Status update failed.');
            setOrganizers(response.updatedData);
            setToast({ message: `Organizer ${action === 'approving' ? 'approved' : 'rejected'}.`, type: 'success' });
        } catch (error) {
            console.error('Action failed:', error);
            setToast({ message: error.message || 'Failed to update organizer.', type: 'error' });
        } finally {
            setActionLoading((current) => {
                const next = { ...current };
                delete next[id];
                return next;
            });
        }
    }, [actionLoading]);

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in">
            {toast && <Toast toast={toast} clear={() => setToast(null)} />}

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Organizer Approvals</h1>
                <p className="text-gray-400">Verify organizer applications with the same investigation-oriented layout used in admin review flows.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SummaryTile label="Pending" value={counts.pending} accent="text-amber-300" />
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
                        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search organizer, organization, or type" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {isLoading ? Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse">
                                <div className="h-3 w-20 rounded bg-white/10" />
                                <div className="mt-3 h-4 w-40 rounded bg-white/10" />
                                <div className="mt-3 h-3 w-28 rounded bg-white/10" />
                            </div>
                        )) : filtered.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center">
                                <p className="text-sm font-semibold text-white">No approval requests found.</p>
                                <p className="mt-2 text-sm text-gray-400">Try a different filter or search term.</p>
                            </div>
                        ) : filtered.map((org) => (
                            <button key={org.id} onClick={() => setSelectedId(org.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === org.id ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.08]'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <img src={org.image} alt="" className="h-11 w-11 rounded-xl border border-white/10 object-cover" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">{org.name}</p>
                                            <p className="truncate text-xs text-gray-400">{org.organization}</p>
                                        </div>
                                    </div>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${statusMap[org.status]}`}>{org.status}</span>
                                </div>
                                <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                                    <span>{org.orgType}</span>
                                    <span>{org.appliedAt}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="flex-1 overflow-y-auto">
                    {!selected ? (
                        <div className="flex h-full items-center justify-center p-10 text-center">
                            <div>
                                <p className="text-lg font-semibold text-white">Select an organizer request to review.</p>
                                <p className="mt-2 text-sm text-gray-400">The detail panel shows organization profile, identity info, and approval actions.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 lg:p-8 space-y-6">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div className="flex items-start gap-4">
                                    <img src={selected.image} alt="" className="h-16 w-16 rounded-2xl border border-white/10 object-cover" />
                                    <div>
                                        <div className="mb-3 flex flex-wrap items-center gap-3">
                                            <h2 className="text-2xl font-bold text-white">{selected.name}</h2>
                                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${statusMap[selected.status]}`}>{selected.status}</span>
                                        </div>
                                        <p className="text-sm text-gray-400">{selected.role} at {selected.organization}</p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">{selected.orgType}</span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">Applied {selected.appliedAt}</span>
                                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">{selected.website}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 xl:min-w-[280px]">
                                    <SummaryTile label="Organization" value={selected.organization} accent="text-white" />
                                    <SummaryTile label="Type" value={selected.orgType} accent="text-white" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Application Snapshot</p>
                                    <div className="mt-5 space-y-4 text-sm">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-gray-400">Applicant</span><span className="font-semibold text-white">{selected.name}</span></div>
                                        <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-gray-400">Role</span><span className="font-semibold text-white">{selected.role}</span></div>
                                        <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-gray-400">Organization</span><span className="font-semibold text-white">{selected.organization}</span></div>
                                        <div className="flex items-center justify-between"><span className="text-gray-400">Website</span><span className="font-semibold text-white">{selected.website}</span></div>
                                    </div>
                                </div>
                                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Approval Checklist</p>
                                    <div className="mt-5 grid gap-3 text-sm text-gray-300">
                                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">Identity and organization fields are present.</div>
                                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">Website and organization type are supplied for verification.</div>
                                        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">Application is ready for approve or reject admin action.</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Admin Action</p>
                                <p className="mt-2 text-sm text-gray-400">Use the same straightforward approval controls as the rest of the admin review system.</p>
                                <div className="mt-5 flex flex-wrap gap-3">
                                    <button onClick={() => handleAction(selected.id, 'rejecting')} disabled={!!actionLoading[selected.id] || selected.status !== 'Pending'} className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50">{actionLoading[selected.id] === 'rejecting' ? 'Updating...' : 'Reject Organizer'}</button>
                                    <button onClick={() => handleAction(selected.id, 'approving')} disabled={!!actionLoading[selected.id] || selected.status !== 'Pending'} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50">{actionLoading[selected.id] === 'approving' ? 'Updating...' : 'Approve Organizer'}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default OrganizerApprovals;
