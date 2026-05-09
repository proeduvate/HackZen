import React, { useEffect, useMemo, useState } from 'react';
import { getAnalyticsDashboard } from '../../services/admin/adminAnalyticsApi';

const lenses = ['Growth', 'Registrations', 'Sentiment'];

const SummaryTile = ({ label, value, hint }) => (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">{label}</p>
        <p className="mt-2 text-2xl font-black text-white">{value}</p>
        {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
);

const AdminAnalytics = () => {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLens, setSelectedLens] = useState('Growth');

    useEffect(() => {
        const loadDashboard = async () => {
            setIsLoading(true);
            try {
                const data = await getAnalyticsDashboard();
                setAnalyticsData(data);
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboard();
    }, []);

    const metrics = analyticsData?.metrics;
    const registrationData = analyticsData?.registrationData || [];
    const growthData = analyticsData?.growthData || [];
    const reviews = analyticsData?.reviews || [];

    const peakMonth = useMemo(() => registrationData.reduce((best, item) => (!best || item.value > best.value ? item : best), null), [registrationData]);
    const currentMonth = registrationData.find((item) => item.current) || peakMonth;
    const peakGrowth = useMemo(() => growthData.reduce((best, item) => (!best || item.value > best.value ? item : best), null), [growthData]);
    const currentGrowth = growthData.find((item) => item.current) || peakGrowth;
    const growthMax = useMemo(() => Math.max(...growthData.map((item) => item.value), 100), [growthData]);
    const averageRating = useMemo(() => (reviews.length ? (reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1) : '0.0'), [reviews]);

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] animate-fade-in">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
                <p className="text-gray-400">Track platform health in the same split-pane admin layout used across disputes, reports, and reviews.</p>
            </div>

            {isLoading ? (
                <div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-gray-400">
                    Loading analytics...
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <SummaryTile label="New Users" value={metrics?.newUsers?.value ?? 0} hint={metrics?.newUsers?.growth} />
                        <SummaryTile label="Active Entities" value={metrics?.activeEntities?.value ?? 0} hint={metrics?.activeEntities?.growth} />
                        <SummaryTile label="Satisfaction" value={metrics?.satisfaction?.value ?? 0} hint={metrics?.satisfaction?.subtitle} />
                    </div>

                    <div className="flex flex-1 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
                        <aside className="w-full lg:w-[360px] border-r border-white/10 flex flex-col">
                            <div className="p-5 border-b border-white/10 space-y-4">
                                <div className="flex gap-2 overflow-x-auto">
                                    {lenses.map((lens) => (
                                        <button key={lens} onClick={() => setSelectedLens(lens)} className={`rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition ${selectedLens === lens ? 'bg-white text-slate-950' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                                            {lens}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                <div className={`rounded-2xl border p-4 text-left ${selectedLens === 'Growth' ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/[0.03]'}`}>
                                    <p className="text-sm font-semibold text-white">Growth snapshot</p>
                                    <p className="mt-2 text-sm text-gray-400">Monthly user growth and active entity movement.</p>
                                </div>
                                <div className={`rounded-2xl border p-4 text-left ${selectedLens === 'Registrations' ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/[0.03]'}`}>
                                    <p className="text-sm font-semibold text-white">Registration trend</p>
                                    <p className="mt-2 text-sm text-gray-400">Current month versus yearly peak registration volume.</p>
                                </div>
                                <div className={`rounded-2xl border p-4 text-left ${selectedLens === 'Sentiment' ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/[0.03]'}`}>
                                    <p className="text-sm font-semibold text-white">Sentiment stream</p>
                                    <p className="mt-2 text-sm text-gray-400">Verified feedback and average satisfaction score.</p>
                                </div>
                            </div>
                        </aside>

                        <section className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
                            {selectedLens === 'Growth' && (
                                <>
                                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Growth Overview</p>
                                        <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
                                            <SummaryTile label="New Users" value={metrics?.newUsers?.value ?? 0} hint={metrics?.newUsers?.growth} />
                                            <SummaryTile label="Active Entities" value={metrics?.activeEntities?.value ?? 0} hint={metrics?.activeEntities?.growth} />
                                            <SummaryTile label="Current Growth" value={currentGrowth?.value ?? 0} hint={`${currentGrowth?.month ?? '-'} month`} />
                                        </div>
                                    </div>
                                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Growth Chart</p>
                                                <p className="mt-2 text-sm text-gray-400">Monthly growth pattern for platform engagement.</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <SummaryTile label="Current Month" value={currentGrowth?.month ?? '-'} hint={`${currentGrowth?.value ?? 0} pts`} />
                                                <SummaryTile label="Peak Month" value={peakGrowth?.month ?? '-'} hint={`${peakGrowth?.value ?? 0} pts`} />
                                            </div>
                                        </div>
                                        <div className="mt-8 flex items-end gap-3 h-72">
                                            {growthData.map((item) => (
                                                <div key={item.month} className="flex-1 flex flex-col items-center justify-end gap-3 h-full">
                                                    <div className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500 to-emerald-300" style={{ height: `${(item.value / growthMax) * 100}%` }} />
                                                    <span className={`text-xs font-semibold ${item.current ? 'text-emerald-300' : 'text-gray-500'}`}>{item.month}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Admin Insight</p>
                                        <p className="mt-4 text-sm leading-7 text-gray-300">User acquisition is trending upward alongside active platform participation. This view is designed to read like the rest of the admin dashboard: a concise overview up top, then a focused detail panel for the current analysis lens.</p>
                                    </div>
                                </>
                            )}

                            {selectedLens === 'Registrations' && (
                                <>
                                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Registration Trend</p>
                                                <p className="mt-2 text-sm text-gray-400">Monthly registration pattern across the current reporting window.</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <SummaryTile label="Current Month" value={currentMonth?.month ?? '-'} hint={`${currentMonth?.value ?? 0} points`} />
                                                <SummaryTile label="Peak Month" value={peakMonth?.month ?? '-'} hint={`${peakMonth?.value ?? 0} points`} />
                                            </div>
                                        </div>
                                        <div className="mt-8 flex items-end gap-3 h-72">
                                            {registrationData.map((item) => (
                                                <div key={item.month} className="flex-1 flex flex-col items-center justify-end gap-3 h-full">
                                                    <div className="w-full rounded-t-xl bg-gradient-to-t from-cyan-700 to-cyan-400" style={{ height: `${item.value}%` }} />
                                                    <span className={`text-xs font-semibold ${item.current ? 'text-cyan-300' : 'text-gray-500'}`}>{item.month}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedLens === 'Sentiment' && (
                                <>
                                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-500">Sentiment Overview</p>
                                                <p className="mt-2 text-sm text-gray-400">Recent reviews from organizers, mentors, and students.</p>
                                            </div>
                                            <SummaryTile label="Average Rating" value={averageRating} hint={`${reviews.length} reviews`} />
                                        </div>
                                    </div>
                                    <div className="grid gap-4">
                                        {reviews.map((review) => (
                                            <div key={review.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                                                <div className="flex items-center gap-4">
                                                    <img src={review.avatar} alt="" className="h-12 w-12 rounded-xl border border-white/10 object-cover" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">{review.name}</p>
                                                        <p className="text-xs text-gray-400">{review.role} � {review.time}</p>
                                                    </div>
                                                    <div className="ml-auto text-sm font-semibold text-amber-300">{review.rating}/5</div>
                                                </div>
                                                <p className="mt-4 text-sm leading-7 text-gray-300">{review.feedback}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminAnalytics;
