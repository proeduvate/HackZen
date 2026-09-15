import React, { useState, useEffect } from 'react';
import { fetchSubmissions, submitProject } from '../../services/student/submissionsApi';
import { getMyTeams } from '../../api/teamApi';
import { fetchMyTeams } from '../../services/student/teamsApi';
import { usePlatformSettings } from '../../context/PlatformSettingsContext';

const STAGES = [
    { value: 'initial_stage', label: 'Initial Submission' },
    { value: 'round_1', label: 'Round 1' },
    { value: 'round_2', label: 'Round 2' },
    { value: 'final', label: 'Final Deliverable' }
];

const CATEGORIES = ['General', 'AI/ML', 'Web3', 'Cybersecurity', 'HealthTech', 'FinTech', 'EdTech', 'Sustainability'];

const StudentSubmissions = () => {
    const [submissions, setSubmissions] = useState([]);
    const [myTeams, setMyTeams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const {
        allowLateSubmissions,
        maxUploadFileSize,
        allowedFileTypes,
        gitHubRepo,
        demoUrl,
        isSubmissionAllowed,
        validateDeliverableFile,
        getAllowedExtensionsAcceptString
    } = usePlatformSettings();

    const [form, setForm] = useState({
        teamId: '',
        stageId: 'initial_stage',
        category: 'General',
        project: '',
        desc: '',
        githubUrl: '',
        liveDemoUrl: '',
        file: null
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            let teamsData = [];
            try {
                teamsData = await getMyTeams();
            } catch {
                teamsData = await fetchMyTeams().catch(() => []);
            }

            const subsData = await fetchSubmissions().catch(() => []);
            setSubmissions(subsData || []);
            setMyTeams(teamsData || []);
            if (teamsData && teamsData.length > 0 && !form.teamId) {
                setForm(prev => ({ ...prev, teamId: teamsData[0].id || teamsData[0]._id }));
            }
        } catch (error) {
            console.error("Failed to fetch submissions data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);


    // File validation against real-time admin settings
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateDeliverableFile(file);
        if (!validation.valid) {
            setErrorMessage(validation.error);
            e.target.value = '';
            setForm(prev => ({ ...prev, file: null }));
            return;
        }

        setErrorMessage('');
        setForm(prev => ({ ...prev, file }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!form.teamId) {
            setErrorMessage('Please select a registered team.');
            return;
        }

        if (!form.project.trim()) {
            setErrorMessage('Project title is required.');
            return;
        }

        if (gitHubRepo && !form.githubUrl.trim()) {
            setErrorMessage('GitHub Repository URL is required by platform policy.');
            return;
        }

        if (demoUrl && !form.liveDemoUrl.trim()) {
            setErrorMessage('Live Demo URL is required by platform policy.');
            return;
        }

        setIsSubmitting(true);
        try {
            await submitProject({
                teamId: form.teamId,
                project: form.project,
                desc: form.desc,
                githubUrl: form.githubUrl,
                liveDemoUrl: form.liveDemoUrl,
                file: form.file,
                fileUrl: form.file ? `/uploads/submissions/${form.file.name}` : ''
            });

            setSuccessMessage('Project submitted successfully!');
            setIsModalOpen(false);
            setForm({
                teamId: myTeams[0]?.id || myTeams[0]?._id || '',
                project: '',
                desc: '',
                githubUrl: '',
                liveDemoUrl: '',
                file: null
            });
            await loadData();
        } catch (err) {
            const detail = err.response?.data?.detail || 'Failed to submit project. Please verify platform constraints.';
            setErrorMessage(detail);
        } finally {
            setIsSubmitting(false);
        }
    };

    const StatusBadge = ({ status, isLate }) => (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${
            status === 'Evaluated'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : isLate || status === 'Late Submission'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-white/5 text-gray-400 border-white/10'
        }`}>
            {status}
        </span>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        My <span className="gradient-text">Submissions</span>
                    </h1>
                    <p className="text-gray-400 text-sm">Track and manage your hackathon projects and evaluations.</p>
                </div>
                <button
                    onClick={() => { setErrorMessage(''); setSuccessMessage(''); setIsModalOpen(true); }}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 active:scale-95"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    <span>Submit New Project</span>
                </button>
            </div>

            {successMessage && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <span>✓</span>
                    <span>{successMessage}</span>
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
                    <p className="text-gray-400 text-sm max-w-sm mx-auto mb-5">
                        {myTeams.length === 0
                            ? "Join or form a team first, then submit your project deliverables for evaluation."
                            : "You haven't submitted any projects yet. Submit your deliverables for active hackathons."}
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        disabled={myTeams.length === 0}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-40"
                    >
                        Submit Your Project Deliverable
                    </button>
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
                                    <StatusBadge status={sub.status} isLate={sub.isLate} />
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
                                            <p className="text-xs font-semibold text-gray-500 mb-1">Mentor / AI Feedback</p>
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
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Originality Score</p>
                                        <p className="text-lg font-bold text-purple-400">{sub.score}%</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Submission Modal Enforcing Live Platform Rules */}
            {isModalOpen && (

                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-navy-900 border border-white/10 rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1"
                        >
                            ✕
                        </button>

                        <h2 className="text-xl font-bold text-white mb-1">Submit Project Deliverable</h2>
                        <p className="text-xs text-gray-400 mb-6">Deliverable policies are enforced in real time by platform administration.</p>

                        {errorMessage && (
                            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold">
                                {errorMessage}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Select Team *</label>
                                {myTeams.length > 0 ? (
                                    <select
                                        value={form.teamId}
                                        onChange={(e) => setForm(prev => ({ ...prev, teamId: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white outline-none cursor-pointer"
                                    >
                                        {myTeams.map(t => (
                                            <option key={t.id || t._id} value={t.id || t._id} className="bg-navy-900">
                                                {t.teamName}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                                        You are not currently enrolled in any active teams.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Project Title *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Autonomous AI Drone Swarm"
                                    value={form.project}
                                    onChange={(e) => setForm(prev => ({ ...prev, project: e.target.value }))}
                                    className="w-full px-3.5 py-2 bg-black/20 border border-white/10 rounded-xl text-white outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Project Summary</label>
                                <textarea
                                    rows={3}
                                    placeholder="Brief summary of solution and technology stack..."
                                    value={form.desc}
                                    onChange={(e) => setForm(prev => ({ ...prev, desc: e.target.value }))}
                                    className="w-full px-3.5 py-2 bg-black/20 border border-white/10 rounded-xl text-white outline-none resize-none"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                                        GitHub Repository URL {gitHubRepo ? (
                                            <span className="text-sky-400 font-bold">* (Required by Platform Policy)</span>
                                        ) : (
                                            <span className="text-gray-500 font-normal lowercase">(optional)</span>
                                        )}
                                    </label>
                                </div>
                                <input
                                    type="url"
                                    required={gitHubRepo}
                                    placeholder={gitHubRepo ? "https://github.com/org/repo (required)" : "https://github.com/org/repo (optional)"}
                                    value={form.githubUrl}
                                    onChange={(e) => setForm(prev => ({ ...prev, githubUrl: e.target.value }))}
                                    className="w-full px-3.5 py-2 bg-black/20 border border-white/10 rounded-xl text-white outline-none font-mono"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                                        Live Demo URL {demoUrl ? (
                                            <span className="text-sky-400 font-bold">* (Required by Platform Policy)</span>
                                        ) : (
                                            <span className="text-gray-500 font-normal lowercase">(optional)</span>
                                        )}
                                    </label>
                                </div>
                                <input
                                    type="url"
                                    required={demoUrl}
                                    placeholder={demoUrl ? "https://my-app.vercel.app (required)" : "https://my-app.vercel.app (optional)"}
                                    value={form.liveDemoUrl}
                                    onChange={(e) => setForm(prev => ({ ...prev, liveDemoUrl: e.target.value }))}
                                    className="w-full px-3.5 py-2 bg-black/20 border border-white/10 rounded-xl text-white outline-none font-mono"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Deliverable Archive (Max {maxUploadFileSize})</label>
                                    <span className="text-[9px] text-gray-400 font-mono">Allowed: {(allowedFileTypes || []).join(', ')}</span>
                                </div>
                                <input
                                    type="file"
                                    accept={getAllowedExtensionsAcceptString ? getAllowedExtensionsAcceptString() : '.zip,.pdf,.pptx,.docx,.mp4,.tar.gz'}
                                    onChange={handleFileChange}
                                    className="w-full px-3.5 py-2 bg-black/20 border border-white/10 rounded-xl text-white file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/20 file:text-sky-300 hover:file:bg-sky-500/30 cursor-pointer"
                                />
                                {form.file && (
                                    <div className="mt-1.5 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-[11px] text-emerald-300">
                                        <span>✓ Attached: {form.file.name}</span>
                                        <span className="text-gray-400 font-mono">{(form.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                    </div>
                                )}
                            </div>

                            {/* Late submission indicator */}
                            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-[11px] text-gray-300">
                                <span className="font-bold text-white block mb-0.5">Platform Policy Check:</span>
                                {allowLateSubmissions ? (
                                    <span className="text-emerald-400">✓ Late submissions are accepted with automated audit flag.</span>
                                ) : (
                                    <span className="text-amber-400">⚠️ Strict deadline enforced: Late submissions will be rejected.</span>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || myTeams.length === 0}
                                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Uploading...' : 'Confirm Submission'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentSubmissions;

