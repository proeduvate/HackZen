import React, { useState, useEffect } from 'react';
import { fetchSubmissions, submitProject } from '../../services/student/submissionsApi';
import { fetchMyTeams } from '../../services/student/teamsApi';

const STAGES = [
    { value: 'initial_stage', label: 'Initial Submission' },
    { value: 'round_1', label: 'Round 1' },
    { value: 'round_2', label: 'Round 2' },
    { value: 'final', label: 'Final Deliverable' }
];

const CATEGORIES = ['General', 'AI/ML', 'Web3', 'Cybersecurity', 'HealthTech', 'FinTech', 'EdTech', 'Sustainability'];

const EMPTY_FORM = { teamId: '', stageId: 'initial_stage', project: '', desc: '', category: 'General', fileUrl: '' };

const StudentSubmissions = () => {
    const [submissions, setSubmissions] = useState([]);
    const [teams, setTeams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [notice, setNotice] = useState(null);

    const loadSubmissions = async () => {
        setIsLoading(true);
        try {
            const myTeams = await fetchMyTeams();
            setTeams(myTeams);
            const lists = await Promise.all(myTeams.map(t => fetchSubmissions(t.id)));
            const merged = lists.flat().sort((a, b) => new Date(b.iso || 0) - new Date(a.iso || 0));
            setSubmissions(merged);
        } catch (error) {
            console.error("Failed to fetch submissions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSubmissions();
    }, []);

    const handleOpenModal = () => {
        setFormData(prev => ({ ...prev, teamId: prev.teamId || teams[0]?.id || '' }));
        setShowModal(true);
    };

    const handleSubmitProject = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await submitProject(formData);
            setShowModal(false);
            setFormData(EMPTY_FORM);
            setNotice({ type: 'success', message: 'Project submitted! The organizer can now review it on their dashboard.' });
            await loadSubmissions();
        } catch (error) {
            setNotice({ type: 'error', message: error.response?.data?.detail || 'Failed to submit project.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const StatusBadge = ({ status }) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border whitespace-nowrap
            ${status === 'Evaluated'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : status === 'Pending Review'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-white/5 text-gray-400 border-white/10'}`}>
            {status}
        </span>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-20">
            {/* Header */}
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        My <span className="gradient-text">Submissions</span>
                    </h1>
                    <p className="text-gray-400">Track and manage your hackathon projects and evaluations.</p>
                </div>
                <button
                    onClick={handleOpenModal}
                    disabled={teams.length === 0}
                    title={teams.length === 0 ? 'Join or form a team first' : ''}
                    className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/20"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Submit Project
                </button>
            </div>

            {notice && (
                <div className={`flex items-center justify-between px-5 py-4 rounded-xl border ${notice.type === 'success' ? 'bg-green-500/10 border-green-500/25 text-green-300' : 'bg-red-500/10 border-red-500/25 text-red-300'}`}>
                    <p className="text-sm font-semibold">{notice.message}</p>
                    <button onClick={() => setNotice(null)} className="text-xs font-bold uppercase tracking-widest opacity-70 hover:opacity-100">Dismiss</button>
                </div>
            )}

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map(i => (
                        <div key={i} className="glass p-6 rounded-2xl border border-white/5 animate-pulse h-64"></div>
                    ))}
                </div>
            ) : submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center glass rounded-2xl border border-dashed border-white/10">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Submissions Yet</h3>
                    <p className="text-gray-400 text-sm max-w-sm mx-auto mb-6">
                        {teams.length === 0
                            ? "Join or form a team first, then submit your project for organizer review."
                            : "Your team hasn't submitted anything yet. Click Submit Project to send your first entry."}
                    </p>
                    {teams.length > 0 && (
                        <button onClick={handleOpenModal} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors">
                            Submit Your First Project
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {submissions.map((sub) => (
                        <div key={sub.id} className="glass p-6 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all duration-300 flex flex-col justify-between h-full group">
                            <div>
                                <div className="flex justify-between items-start mb-6 gap-3">
                                    <div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors leading-tight">{sub.project}</h3>
                                        <p className="text-sm text-gray-400 mt-2">{sub.hackathon} • {sub.team}</p>
                                    </div>
                                    <StatusBadge status={sub.status} />
                                </div>

                                <div className="space-y-6 mb-8">
                                    {sub.desc && <p className="text-sm text-gray-300 leading-relaxed line-clamp-2">{sub.desc}</p>}

                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs font-medium text-gray-400">
                                            {sub.category}
                                        </span>
                                        <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs font-medium text-gray-400">
                                            v{sub.version}
                                        </span>
                                        {sub.fileUrl && sub.fileUrl !== 'pending_upload' && (
                                            <a href={sub.fileUrl} target="_blank" rel="noreferrer" className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors">
                                                Open Project Link
                                            </a>
                                        )}
                                    </div>

                                    {sub.feedback && (
                                        <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                                            <p className="text-xs font-semibold text-gray-500 mb-1">Mentor Feedback</p>
                                            <p className="text-sm text-white leading-relaxed">"{sub.feedback}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-xs text-gray-400">{sub.submittedAt}</span>
                                </div>
                                {sub.score != null && (
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Score</p>
                                        <p className="text-lg font-bold text-purple-400">{sub.score}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Submit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-navy-950/90 backdrop-blur-xl">
                    <div className="absolute inset-0" onClick={() => !isSubmitting && setShowModal(false)}></div>
                    <div className="glass border border-white/10 rounded-3xl w-full max-w-xl p-10 relative bg-navy-900 overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="relative z-10 space-y-8">
                            <div className="space-y-3">
                                <h3 className="text-3xl font-bold text-white leading-none">Submit Project</h3>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Deliverable // Organizer Review</p>
                            </div>

                            <form onSubmit={handleSubmitProject} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Team</label>
                                    <select
                                        required
                                        value={formData.teamId}
                                        onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                                        className="w-full bg-navy-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:outline-none focus:border-purple-500/40 appearance-none cursor-pointer"
                                    >
                                        <option value="" className="bg-navy-900">SELECT TEAM...</option>
                                        {teams.map(t => (
                                            <option key={t.id} value={t.id} className="bg-navy-900">{t.name}{t.teamCode ? ` — ${t.teamCode}` : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Project Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="E.G., NEURAL BRIDGE..."
                                        value={formData.project}
                                        onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                                        className="w-full bg-navy-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:outline-none focus:border-purple-500/40 uppercase tracking-wide placeholder:text-gray-700"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Description</label>
                                    <textarea
                                        rows={3}
                                        placeholder="WHAT DOES YOUR PROJECT DO?"
                                        value={formData.desc}
                                        onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                                        className="w-full bg-navy-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-purple-500/40 resize-none placeholder:text-gray-700"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Stage</label>
                                        <select
                                            value={formData.stageId}
                                            onChange={(e) => setFormData({ ...formData, stageId: e.target.value })}
                                            className="w-full bg-navy-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:outline-none focus:border-purple-500/40 appearance-none cursor-pointer"
                                        >
                                            {STAGES.map(s => (
                                                <option key={s.value} value={s.value} className="bg-navy-900">{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Track</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full bg-navy-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:outline-none focus:border-purple-500/40 appearance-none cursor-pointer"
                                        >
                                            {CATEGORIES.map(c => (
                                                <option key={c} value={c} className="bg-navy-900">{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Project Link / Repo URL</label>
                                    <input
                                        type="url"
                                        required
                                        placeholder="HTTPS://GITHUB.COM/TEAM/PROJECT"
                                        value={formData.fileUrl}
                                        onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                                        className="w-full bg-navy-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-purple-500/40 placeholder:text-gray-700"
                                    />
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-4 rounded-xl bg-white/5 text-gray-400 hover:text-white font-bold uppercase tracking-[0.2em] text-xs transition-all border border-white/5 hover:bg-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-4 rounded-xl font-bold uppercase tracking-[0.3em] text-xs transition-all shadow-xl bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-purple-500/20 hover:shadow-purple-500/40 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Transmitting...' : 'Submit'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentSubmissions;
