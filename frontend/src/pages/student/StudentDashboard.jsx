import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardData } from '../../services/student/dashboardApi';

const metricDefinitions = [
    { key: 'registeredHackathons', label: 'Registered Hackathons' },
    { key: 'activeTeams', label: 'Active Teams' },
    { key: 'submissions', label: 'Submissions' },
    { key: 'certificates', label: 'Certificates' },
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
    return status.split(/[-_ ]/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
};

const prizePool = (prizes) => {
    if (!Array.isArray(prizes) || prizes.length === 0) return null;
    const values = prizes
        .map((prize) => (typeof prize === 'object' ? prize.amount ?? prize.value ?? prize.prize ?? null : prize))
        .filter((value) => value !== null && value !== undefined && value !== '');
    return values.length ? values.join(' · ') : null;
};

const DashboardSkeleton = () => (
    <div className="space-y-8 animate-pulse">
        <div className="h-10 w-72 rounded bg-slate-200" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-36 rounded-2xl border border-slate-200 bg-white" />)}
        </div>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
            <div className="space-y-6"><div className="h-8 w-52 rounded bg-slate-200" /><div className="h-64 rounded-2xl bg-white" /></div>
            <div className="space-y-5"><div className="h-8 w-40 rounded bg-slate-200" /><div className="h-48 rounded-2xl bg-white" /></div>
        </div>
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

    return (
        <div className="-m-6 min-h-full bg-[#fbf9ff] p-6 text-[#202030] lg:-m-10 lg:p-10">
            {isLoading ? <DashboardSkeleton /> : error ? (
                <div className="mx-auto flex min-h-[420px] max-w-lg flex-col items-center justify-center rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard unavailable</h1>
                    <p className="mt-3 text-slate-600">{error}</p>
                    <button onClick={loadDashboard} className="mt-6 rounded-lg bg-[#432bc6] px-5 py-3 font-medium text-white transition hover:bg-[#351eae]">Try again</button>
                </div>
            ) : (
                <>
                    <header className="mb-10">
                        <h1 className="text-3xl font-bold tracking-tight text-[#202030] sm:text-4xl">Welcome back, {studentName}!</h1>
                    </header>

                    <section aria-label="Dashboard metrics" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {metricDefinitions.map((metric) => (
                            <div key={metric.key} className="rounded-2xl border border-[#d8d3e5] bg-white px-8 py-7 shadow-[0_1px_2px_rgba(31,22,60,0.03)]">
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#626170]">{metric.label}</p>
                                <p className="mt-3 text-4xl font-bold tracking-tight text-[#432bc6]">{dashboard?.metrics?.[metric.key] ?? 0}</p>
                            </div>
                        ))}
                    </section>

                    <section className="mt-14 grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
                        <div>
                            <h2 className="mb-7 text-3xl font-bold tracking-tight text-[#202030]">My Hackathons</h2>
                            {registeredHackathons.length === 0 ? (
                                <div className="rounded-2xl border border-[#d8d3e5] bg-white p-8 text-center">
                                    <h3 className="text-lg font-semibold text-slate-800">No registered hackathons yet</h3>
                                    <p className="mt-2 text-sm text-slate-600">Explore upcoming events and register for a hackathon to see it here.</p>
                                    <button onClick={() => navigate('/student/hackathons')} className="mt-5 rounded-lg bg-[#432bc6] px-5 py-3 font-medium text-white transition hover:bg-[#351eae]">Explore Hackathons</button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {registeredHackathons.map((hackathon) => {
                                        const progress = hackathon.team?.progress;
                                        const percentage = progress?.percentage;
                                        const status = hackathon.team ? progress?.status || hackathon.status : hackathon.applicationStatus;
                                        return (
                                            <article key={hackathon.id} className="flex flex-col gap-6 rounded-2xl border border-[#d8d3e5] bg-white p-6 shadow-[0_1px_2px_rgba(31,22,60,0.03)] sm:flex-row sm:items-center">
                                                <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f1eff8] sm:w-40">
                                                    {hackathon.posterUrl ? <img src={hackathon.posterUrl} alt="" className="h-full w-full object-cover" /> : <span aria-hidden="true" className="text-3xl font-bold text-[#786ab9]">{hackathon.title.charAt(0).toUpperCase()}</span>}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="truncate text-2xl font-bold tracking-tight text-[#202030]">{hackathon.title}</h3>
                                                    <p className="mt-1 text-base text-[#626170]">{hackathon.team ? `Team: ${hackathon.team.name}` : `Registration: ${formatStatus(hackathon.applicationStatus)}`}</p>
                                                    {percentage !== null && percentage !== undefined ? (
                                                        <div className="mt-5">
                                                            <div className="h-2.5 overflow-hidden rounded-full bg-[#e4e0f2]"><div className="h-full rounded-full bg-[#432bc6]" style={{ width: `${percentage}%` }} /></div>
                                                            <p className="mt-2 text-sm font-medium text-[#626170]">Progress <span className="float-right text-[#432bc6]">{percentage}%</span></p>
                                                        </div>
                                                    ) : <p className="mt-5 text-sm text-[#626170]">{formatDateRange(hackathon.hackathonStart, hackathon.hackathonEnd)}</p>}
                                                </div>
                                                <div className="flex shrink-0 flex-col items-end gap-5 sm:self-stretch sm:justify-end">
                                                    <span className="rounded-md bg-[#e8e4fb] px-3 py-1.5 text-sm font-medium text-[#5140bd]">{formatStatus(status)}</span>
                                                    <button onClick={() => navigate(hackathon.team ? '/student/teams' : '/student/hackathons')} className="w-full rounded-lg bg-[#432bc6] px-6 py-3 text-base font-medium text-white transition hover:bg-[#351eae] sm:w-auto">{hackathon.team ? 'View Workspace' : 'View Hackathon'}</button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <aside>
                            <div className="mb-7 flex items-center justify-between">
                                <h2 className="text-3xl font-bold tracking-tight text-[#202030]">Upcoming</h2>
                                <button onClick={() => navigate('/student/hackathons')} className="text-base font-medium text-[#4d38c8] transition hover:text-[#351eae]">See all</button>
                            </div>
                            {upcomingHackathons.length === 0 ? (
                                <div className="rounded-2xl border border-[#d8d3e5] bg-white p-8 text-center"><p className="text-slate-600">There are no upcoming hackathons available right now.</p></div>
                            ) : (
                                <div className="space-y-5">
                                    {upcomingHackathons.map((hackathon) => {
                                        const prize = prizePool(hackathon.prizes);
                                        return (
                                            <article key={hackathon.id} className="rounded-2xl border border-[#d8d3e5] bg-white p-6 shadow-[0_1px_2px_rgba(31,22,60,0.03)]">
                                                <h3 className="text-2xl font-bold leading-tight tracking-tight text-[#202030]">{hackathon.title}</h3>
                                                <p className="mt-2 text-base text-[#626170]">{formatDateRange(hackathon.hackathonStart, hackathon.hackathonEnd)}</p>
                                                <div className="mt-7 flex items-end justify-between gap-4">
                                                    <div><p className="text-sm font-medium text-[#626170]">Prize Pool</p><p className="mt-1 text-lg font-bold text-[#432bc6]">{prize || 'Not announced'}</p></div>
                                                    <button onClick={() => navigate(`/student/hackathons/${hackathon.id}/register`)} className="shrink-0 rounded-lg bg-[#8e7ff4] px-5 py-3 text-base font-medium text-[#3f32b6] transition hover:bg-[#7d6bea]">Register Now</button>
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
