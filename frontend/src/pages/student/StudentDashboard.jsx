import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardData } from '../../services/student/dashboardApi';

const metricDefinitions = [
    { key: 'registeredHackathons', label: 'Registered Hackathons', accent: 'purple' },
    { key: 'activeTeams', label: 'Active Teams', accent: 'cyan' },
    { key: 'submissions', label: 'Submissions', accent: 'indigo' },
    { key: 'certificates', label: 'Certificates', accent: 'emerald' },
];

const formatDate = (value) => {
    if (!value) return 'Date to be announced';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Date to be announced'
        : new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
};

const formatDateRange = (start, end) => {
    if (!start && !end) return 'Dates to be announced';
    if (!end) return formatDate(start);
    if (!start) return formatDate(end);
    return `${formatDate(start)} – ${formatDate(end)}`;
};

const formatStatus = (status) => {
    if (!status) return 'Registered';
    return status
        .split(/[-_ ]/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const prizePool = (prizes) => {
    if (!Array.isArray(prizes) || prizes.length === 0) return null;

    const values = prizes
        .map((prize) => (typeof prize === 'object' ? prize.amount ?? prize.value ?? prize.prize ?? null : prize))
        .filter((value) => value !== null && value !== undefined && value !== '');

    return values.length ? values.join(' · ') : null;
};

const getStatusClasses = (status) => {
    const normalized = `${status || ''}`.toLowerCase();
    if (normalized.includes('accepted') || normalized.includes('active') || normalized.includes('approved')) {
        return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
    }
    if (normalized.includes('pending') || normalized.includes('in review') || normalized.includes('review')) {
        return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
    }
    if (normalized.includes('rejected') || normalized.includes('declined')) {
        return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
    }
    return 'border-violet-500/20 bg-violet-500/10 text-violet-300';
};

const DashboardSkeleton = () => (
    <div className="space-y-8 animate-pulse">
        <div className="h-12 w-72 rounded-xl bg-white/5" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-32 rounded-2xl border border-white/10 bg-white/5" />
            ))}
        </div>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
            <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="h-8 w-52 rounded bg-white/10" />
                <div className="h-56 rounded-2xl bg-white/5" />
            </div>
            <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="h-8 w-40 rounded bg-white/10" />
                <div className="h-48 rounded-2xl bg-white/5" />
            </div>
        </div>
    </div>
);

const MetricCard = ({ label, value, accent = 'purple', icon }) => (
    <div className="glass rounded-2xl border border-white/5 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-gray-400">{label}</div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${accent === 'purple' ? 'border-violet-500/20 bg-violet-500/10 text-violet-300' : accent === 'cyan' ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300' : accent === 'indigo' ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>
                {icon}
            </div>
        </div>
        <div className="mt-6 text-3xl font-black tracking-tight text-white sm:text-4xl">{value}</div>
    </div>
);

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            setDashboard(await fetchDashboardData());
        } catch (requestError) {
            console.error('Unable to load student dashboard:', requestError);
            setError('We could not load your dashboard. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
        const refreshDashboard = () => loadDashboard();
        window.addEventListener('user-update', refreshDashboard);
        return () => window.removeEventListener('user-update', refreshDashboard);
    }, [loadDashboard]);

    const registeredHackathons = dashboard?.registeredHackathons ?? [];
    const upcomingHackathons = dashboard?.upcomingHackathons ?? [];
    const studentName = dashboard?.student?.name?.split(' ')[0] || 'Student';

    const iconSet = {
        registeredHackathons: (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 7V4m8 3V4M5 11h14M7 18h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2Z" />
            </svg>
        ),
        activeTeams: (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
                <circle cx="10" cy="7" r="4" />
                <path d="M22 20v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
        submissions: (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
                <path d="M9 12h6M9 16h6" />
            </svg>
        ),
        certificates: (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l7 3v6c0 4.2-2.7 7.9-7 9-4.3-1.1-7-4.8-7-9V6l7-3Z" />
                <path d="m9.5 12 1.5 1.5 3.5-3.5" />
            </svg>
        ),
    };

    return (
        <div className="space-y-8 pb-4 text-white">
            {isLoading ? (
                <DashboardSkeleton />
            ) : error ? (
                <div className="mx-auto flex min-h-[420px] max-w-lg flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-[#111827]/80 p-8 text-center shadow-[0_20px_45px_rgba(15,23,42,0.22)]">
                    <h1 className="text-2xl font-bold text-white">Dashboard unavailable</h1>
                    <p className="mt-3 text-sm text-slate-300">{error}</p>
                    <button onClick={loadDashboard} className="mt-6 rounded-xl bg-[#5740d6] px-5 py-3 font-semibold text-white transition hover:bg-[#4530bd]">Try again</button>
                </div>
            ) : (
                <>
                    <header>
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-violet-300/80">Student Portal</p>
                                <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl xl:text-[2.8rem]">Welcome back, <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">{studentName}</span>!</h1>
                                <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">Track your hackathon journey, upcoming events, team momentum, and achievements in one place.</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <button onClick={() => navigate('/student/hackathons')} className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-100 transition hover:border-violet-400 hover:bg-violet-500/20">Explore Hackathons</button>
                                <button onClick={() => navigate('/student/teams')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10">My Teams</button>
                            </div>
                        </div>
                    </header>

                    <section aria-label="Dashboard metrics" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {metricDefinitions.map((metric) => (
                            <MetricCard
                                key={metric.key}
                                label={metric.label}
                                value={dashboard?.metrics?.[metric.key] ?? 0}
                                accent={metric.accent}
                                icon={iconSet[metric.key]}
                            />
                        ))}
                    </section>

                    <section className="grid gap-8 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
                        <div className="glass rounded-2xl border border-white/5 p-5 sm:p-6">
                            <div className="mb-6 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300/80">Active Journey</p>
                                    <h2 className="mt-2 text-2xl font-black tracking-tight text-white">My Hackathons</h2>
                                </div>
                                <button onClick={() => navigate('/student/hackathons')} className="text-sm font-semibold text-violet-300 transition hover:text-violet-200">See all</button>
                            </div>

                            {registeredHackathons.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0f172a]/60 p-8 text-center">
                                    <h3 className="text-lg font-bold text-white">No registered hackathons yet</h3>
                                    <p className="mt-2 text-sm text-slate-300">Explore upcoming events and register for a hackathon to see it here.</p>
                                    <button onClick={() => navigate('/student/hackathons')} className="mt-5 rounded-xl bg-[#5740d6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4530bd]">Explore Hackathons</button>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {registeredHackathons.map((hackathon) => {
                                        const progress = hackathon.team?.progress;
                                        const percentage = progress?.percentage;
                                        const status = hackathon.team ? progress?.status || hackathon.status : hackathon.applicationStatus;
                                        const primaryAction = hackathon.team ? 'View Workspace' : 'View Details';

                                        return (
                                            <article key={hackathon.id} className="rounded-2xl border border-white/10 bg-[#0f172a]/70 p-4 sm:p-5">
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                                    <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/20 via-indigo-500/10 to-cyan-500/10 sm:w-40">
                                                        {hackathon.posterUrl ? (
                                                            <img src={hackathon.posterUrl} alt={hackathon.title} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span aria-hidden="true" className="text-3xl font-black text-violet-200">{hackathon.title?.charAt(0)?.toUpperCase() || 'H'}</span>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                            <h3 className="truncate text-xl font-bold text-white sm:text-2xl">{hackathon.title}</h3>
                                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getStatusClasses(status)}`}>
                                                                {formatStatus(status)}
                                                            </span>
                                                        </div>

                                                        <p className="mt-2 text-sm text-slate-300">
                                                            {hackathon.team ? `Team: ${hackathon.team.name}` : `Registration: ${formatStatus(hackathon.applicationStatus)}`}
                                                        </p>

                                                        {percentage !== null && percentage !== undefined ? (
                                                            <div className="mt-5">
                                                                <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                                                                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} />
                                                                </div>
                                                                <div className="mt-2 flex items-center justify-between text-xs font-medium text-slate-300">
                                                                    <span>Progress</span>
                                                                    <span className="text-violet-300">{percentage}%</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="mt-5 text-sm text-slate-300">{formatDateRange(hackathon.hackathonStart, hackathon.hackathonEnd)}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-col items-stretch justify-between gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
                                                    <p className="text-sm text-slate-300">{hackathon.team ? 'Team workspace is ready.' : 'You are registered and ready to participate.'}</p>
                                                    <button
                                                        onClick={() => navigate(hackathon.team ? '/student/teams' : `/student/hackathons/${hackathon.id}`)}
                                                        className="rounded-xl bg-[#5740d6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4530bd]"
                                                    >
                                                        {primaryAction}
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <aside className="glass rounded-2xl border border-white/5 p-5 sm:p-6">
                            <div className="mb-6 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-violet-300/80">Next up</p>
                                    <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Upcoming</h2>
                                </div>
                                <button onClick={() => navigate('/student/hackathons')} className="text-sm font-semibold text-violet-300 transition hover:text-violet-200">See all</button>
                            </div>

                            {upcomingHackathons.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0f172a]/60 p-8 text-center">
                                    <p className="text-sm text-slate-300">There are no upcoming hackathons available right now.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {upcomingHackathons.map((hackathon) => {
                                        const prize = prizePool(hackathon.prizes);
                                        return (
                                            <article key={hackathon.id} className="rounded-2xl border border-white/10 bg-[#0f172a]/70 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <h3 className="text-lg font-bold leading-tight text-white">{hackathon.title}</h3>
                                                        <p className="mt-2 text-sm text-slate-300">{formatDateRange(hackathon.hackathonStart, hackathon.hackathonEnd)}</p>
                                                    </div>
                                                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Open</span>
                                                </div>

                                                <div className="mt-5 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Prize Pool</p>
                                                        <p className="mt-1 text-base font-bold text-violet-200">{prize || 'Not announced'}</p>
                                                    </div>
                                                    <button onClick={() => navigate(`/student/hackathons/${hackathon.id}/register`)} className="rounded-xl bg-[#8e7ff4] px-4 py-2.5 text-sm font-semibold text-[#f5f2ff] transition hover:bg-[#7a6ee8]">Register Now</button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </aside>
                    </section>
                </>
            )}
        </div>
    );
};

export default StudentDashboard;
