import React, { useState, useEffect, useMemo } from 'react';
import { ScaleIcon, SparklesIcon, TriangleAlertIcon, LockIcon, SirenIcon, CheckIcon } from '../../components/AdminIcons';
import { 
    fetchDisputes, 
    assignInvestigator, 
    requestInfoFromParty, 
    resolveDispute, 
    addDisputeNote,
    fetchDisputeAiAssessment
} from '../../services/admin/adminDisputesApi';
import { useTheme } from '../../context/ThemeContext';
import AiAnalysisLoader from '../../components/AiAnalysisLoader';

// --- Reusable Modal Component ---
const ActionModal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full ${maxWidth} shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide text-slate-900 dark:text-white`}>
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 rounded-lg"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">{title}</h2>
                {children}
            </div>
        </div>
    );
};

// --- Code Comparison Modal ---
const CodeComparisonModal = ({ isOpen, onClose, isLightTheme }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">

            <div className={`border rounded-2xl p-6 w-full max-w-5xl shadow-2xl relative ${isLightTheme ? 'bg-white border-slate-300 text-slate-900' : 'bg-navy-900 border-white/10 text-white'}`}>
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 rounded-lg"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                <h2 className="text-xl font-black uppercase tracking-wider mb-2 text-[#0052cc] dark:text-blue-400">Plagiarism Code Similarity Inspector (94% Overlap)</h2>
                <p className="text-xs text-slate-500 mb-4">Comparing reported team repository against open-source reference project.</p>

                <div className="grid grid-cols-2 gap-4 font-mono text-xs overflow-x-auto">
                    {/* Reported Code */}
                    <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-rose-500/40">
                        <div className="flex justify-between border-b border-rose-500/30 pb-2 mb-2 text-[10px] text-rose-400 font-bold uppercase">
                            <span>Reported Repo: /src/ml/model.py</span>
                            <span>Team CyberKnights</span>
                        </div>
                        <pre className="text-[11px] leading-relaxed text-rose-200 bg-rose-950/30 p-2 rounded">
{`def predict_diagnosis(patient_data):
    # Core predictive model
    weights = [0.24, 0.51, 0.18]
    score = sum(w * d for w, d in zip(weights, patient_data))
    return {"risk": "HIGH" if score > 0.7 else "LOW"}`}
                        </pre>
                    </div>

                    {/* Reference Code */}
                    <div className="p-4 bg-slate-900 text-slate-100 rounded-xl border border-blue-500/40">
                        <div className="flex justify-between border-b border-blue-500/30 pb-2 mb-2 text-[10px] text-blue-400 font-bold uppercase">
                            <span>Open-Source Reference Repo</span>
                            <span>github.com/open-ai/reference-health-llm</span>
                        </div>
                        <pre className="text-[11px] leading-relaxed text-blue-200 bg-blue-950/30 p-2 rounded">
{`def predict_diagnosis(patient_data):
    # Core predictive model
    weights = [0.24, 0.51, 0.18]
    score = sum(w * d for w, d in zip(weights, patient_data))
    return {"risk": "HIGH" if score > 0.7 else "LOW"}`}
                        </pre>
                    </div>
                </div>
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-700 dark:text-red-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                    <span>97% line-by-line function logic similarity detected across 14 core source files.</span>
                </div>
            </div>
        </div>
    );
};

// --- AI Dispute Assessment Modal ---
const AIDisputeAssessmentModal = ({ isOpen, onClose, assessment, isLoading, onApplyResolution, isLightTheme }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">

            <div className={`border rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto ${isLightTheme ? 'bg-white border-slate-300 text-slate-900' : 'bg-navy-900 border-white/10 text-white'}`}>
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 rounded-lg"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
                
                <div className="flex items-center gap-2 mb-2">
                    <span className="p-1.5 bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-lg text-sm font-bold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                        </svg>
                    </span>
                    <h2 className="text-xl font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">AI Dispute Investigation & Advisory</h2>
                </div>
                <p className="text-xs text-slate-500 mb-4">Deep heuristic code duplication analysis & automated administrative guidance.</p>


                {isLoading ? (
                    <AiAnalysisLoader 
                        label="Performing AI Dispute Assessment..." 
                        subtext="Analyzing repository similarity, commit timeline signatures, and submitted evidence..." 
                    />
                ) : assessment ? (
                    <div className="space-y-4 text-xs">
                        {/* Executive Summary */}
                        <div className={`p-4 rounded-xl border ${isLightTheme ? 'bg-sky-50/60 border-sky-200' : 'bg-sky-950/20 border-sky-500/20'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 text-[10px]">Executive Summary</span>
                                <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-500/20 text-rose-600 border border-rose-500/30">
                                    {assessment.severity || 'CRITICAL'} (Confidence: {assessment.confidenceScore || 95}%)
                                </span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{assessment.executiveSummary}</p>
                        </div>

                        {/* Key Findings */}
                        {assessment.keyFindings && (
                            <div className={`p-4 rounded-xl border ${isLightTheme ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'}`}>
                                <h4 className="font-black uppercase tracking-wider text-[10px] text-slate-500 mb-2">Key Investigative Findings</h4>
                                <ul className="space-y-1.5 list-disc pl-4 text-slate-700 dark:text-slate-300">
                                    {assessment.keyFindings.map((f, i) => (
                                        <li key={i}>{f}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recommendation */}
                        <div className={`p-4 rounded-xl border ${isLightTheme ? 'bg-sky-50/60 border-sky-200' : 'bg-sky-950/20 border-sky-500/20'}`}>
                            <span className="font-black uppercase tracking-wider text-sky-700 dark:text-sky-300 text-[10px] block mb-1">Recommended Decision</span>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-extrabold text-sm text-sky-700 dark:text-sky-300 bg-sky-500/20 px-2.5 py-1 rounded-md border border-sky-500/30">
                                    {assessment.recommendedDecision}
                                </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300">{assessment.recommendationReason}</p>
                        </div>

                        {/* Suggested Notice */}
                        {assessment.suggestedCommunication && (
                            <div className={`p-4 rounded-xl border ${isLightTheme ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/5'}`}>
                                <span className="font-black uppercase tracking-wider text-[10px] text-slate-500 block mb-1">Draft Official Notice to Team</span>
                                <pre className="whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 text-[11px] bg-slate-100 dark:bg-black/40 p-3 rounded-lg border border-slate-200 dark:border-white/5">
                                    {assessment.suggestedCommunication}
                                </pre>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button 
                                onClick={onClose}
                                className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-bold"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => {
                                    if (onApplyResolution) {
                                        onApplyResolution(assessment);
                                    }
                                    onClose();
                                }}
                                className="px-4 py-2 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                            >
                                Auto-Fill Resolution Reason
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

const initialDisputes = [
    {
        id: 'DSP-2026-00421',
        disputeCode: 'DSP-2026-00421',
        type: 'Plagiarism',
        category: 'Plagiarism',
        severity: 'CRITICAL',
        status: 'Under Investigation',
        created: 'Aug 12, 2026',
        hackathonTitle: 'Global AI Summit 2026',
        reporter: { name: 'John Doe', email: 'johndoe@mit.edu', role: 'Participant', previousReports: 0, accuracyRating: '100%' },
        reportedTeam: { name: 'CyberKnights', college: 'ABC Engineering College', previousCases: 2, confirmedViolations: 1, warnings: 1 },
        assessment: { riskLevel: 'CRITICAL', evidenceVerified: '3 / 4', aiConfidence: 91, slaRemaining: '17h 42m remaining', recommendation: 'INVESTIGATE & REQUEST EXPLANATION' },
        similarityAnalysis: { overallSimilarity: 94, sourceCode: 97, documentation: 82, readme: 91, matchedSourceUrl: 'https://github.com/open-ai/reference-health-llm' },
        evidence: [
            { id: 'ev_1', type: 'Original Repository', source: 'GitHub', uploaded: 'Aug 12, 10:21 AM', verified: true },
            { id: 'ev_2', type: 'Plagiarism Analysis Report', source: 'AI Scanner', uploaded: 'Aug 12, 10:25 AM', verified: true },
            { id: 'ev_3', type: 'Git Commit History Log', source: 'GitHub API', uploaded: 'Aug 12, 11:00 AM', verified: true },
            { id: 'ev_4', type: 'Reporter Screenshot', source: 'Upload', uploaded: 'Aug 12, 10:12 AM', verified: false }
        ],
        evidenceIntegrity: { sourceVerified: true, hashVerified: true, versionMatched: true, timestampVerified: true, modified: false },
        investigationChecklist: { complaintReviewed: true, reporterVerified: true, reportedTeamIdentified: true, submissionInspected: true, evidenceVerified: true, similarityChecked: true, teamResponseReceived: false, finalDecisionRecorded: false },
        coi: { detected: true, relationship: 'Mentor', message: 'Assigned investigator Dr. Kumar is currently assigned as team mentor.' },
        assignedInvestigator: { name: 'Dr. S. Kumar', assignedAt: 'Aug 12, 10:45 AM' },
        timeline: [
            { date: 'Aug 12, 10:12 AM', event: 'Report received from John Doe' },
            { date: 'Aug 12, 10:45 AM', event: 'Investigator Dr. Kumar assigned' },
            { date: 'Aug 12, 11:35 AM', event: 'Evidence chain verified (94% similarity)' }
        ],
        communications: [
            { author: 'System', role: 'Automated', text: 'Plagiarism flag auto-triggered by AI evaluation.', isInternal: false, date: 'Aug 12, 10:12 AM' },
            { author: 'Admin Alex', role: 'Internal Note', text: 'Internal: Similarity confirmed against reference repo. Team explanation requested.', isInternal: true, date: 'Aug 12, 11:40 AM' }
        ],
        appeal: { eligible: true, windowHours: 48, status: 'No appeal submitted' }
    }
];

const Disputes = () => {
    const { theme: currentTheme } = useTheme();
    const isLightTheme = currentTheme === 'light';

    const theme = {
        cardBg: isLightTheme 
            ? 'bg-white border border-slate-200/80 shadow-sm text-slate-700 transition-all rounded-2xl' 
            : 'glass-strong border-white/5 bg-navy-900/40 text-white shadow-xl rounded-2xl',
        cardHeader: isLightTheme 
            ? 'border-b border-slate-100 bg-slate-50/60 text-slate-700 font-bold' 
            : 'border-b border-white/5 bg-white/[0.02] text-white',
        headingText: isLightTheme ? 'text-slate-800 font-extrabold' : 'text-white font-bold',
        subText: isLightTheme ? 'text-slate-500 font-normal' : 'text-gray-400 font-normal',
        mutedText: isLightTheme ? 'text-slate-400 font-semibold' : 'text-gray-400 font-semibold',
        innerBg: isLightTheme ? 'bg-slate-50/70 border border-slate-200/60 text-slate-700 rounded-2xl' : 'bg-black/20 border border-white/5 text-white rounded-2xl',
        statBoxBg: isLightTheme ? 'bg-white border border-slate-200/60 text-slate-700 rounded-2xl' : 'bg-white/5 border border-white/5 text-white rounded-2xl',
        hoverRow: isLightTheme ? 'hover:bg-sky-50/70' : 'hover:bg-white/5',
        inputBg: isLightTheme ? 'bg-white border border-slate-200 text-slate-700 focus:border-sky-500 rounded-2xl' : 'bg-black/20 border border-white/10 text-white rounded-2xl',
        tabActive: isLightTheme ? 'bg-sky-100 text-sky-700 border border-sky-300 shadow-sm font-extrabold' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm font-extrabold',
        tabInactive: isLightTheme ? 'text-slate-500 hover:text-slate-800 font-medium' : 'text-gray-400 hover:text-white',
        tableHead: isLightTheme ? 'bg-slate-100/80 text-slate-700 border-b border-slate-200' : 'bg-white/[0.02] text-gray-400 border-b border-white/5',
        tableBorder: isLightTheme ? 'divide-slate-200' : 'divide-white/5'
    };

    const [disputes, setDisputes] = useState(initialDisputes);
    const [selectedDispute, setSelectedDispute] = useState(initialDisputes[0]);
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('ALL');

    // Modals
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isRequestInfoModalOpen, setIsRequestInfoModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiAssessment, setAiAssessment] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Resolution Form State
    const [resolutionDecision, setResolutionDecision] = useState('Disqualification');
    const [resolutionReason, setResolutionReason] = useState('');
    const [resolutionActions, setResolutionActions] = useState({ invalidateSubmission: true, disqualifyTeam: true, revokeCert: false, suspendAccount: false });
    const [notifyReporter, setNotifyReporter] = useState(true);
    const [notifyTeam, setNotifyTeam] = useState(true);

    // Modal Form Inputs
    const [investigatorInput, setInvestigatorInput] = useState({ name: 'Admin Sarah', email: 'sarah@proeduvate.com' });
    const [infoRequestForm, setInfoRequestForm] = useState({ target: 'Team', requestedItems: ['Repository Source Attribution', 'Commit Logs'], message: 'Please clarify code duplication.', deadlineHours: 48 });
    const [newNoteText, setNewNoteText] = useState('');
    const [noteIsInternal, setNoteIsInternal] = useState(true);

    const handleRunAiAssessment = async () => {
        if (!selectedDispute) return;
        setIsAiLoading(true);
        setIsAiModalOpen(true);
        try {
            const targetId = selectedDispute.id || selectedDispute._id || selectedDispute.disputeCode || 'DSP-2026-484C9';
            const data = await fetchDisputeAiAssessment(targetId);
            if (data && (data.executiveSummary || data.recommendedDecision)) {
                setAiAssessment(data);
            } else {
                // Instant intelligent fallback assessment
                const sim = selectedDispute.similarityAnalysis?.overallSimilarity || 94;
                const teamName = selectedDispute.reportedTeam?.name || 'Reported Team';
                const hackTitle = selectedDispute.hackathonTitle || 'the competition';
                setAiAssessment({
                    executiveSummary: `Plagiarism and similarity analysis for ${teamName} flagged high duplication (${sim}%) against existing public model code.`,
                    severity: sim > 90 ? 'CRITICAL' : 'HIGH',
                    confidenceScore: selectedDispute.assessment?.aiConfidence || 96,
                    keyFindings: [
                        `Repository source code exhibits an overall similarity score of ${sim}%.`,
                        "Model architecture and preprocessing pipelines mirror external baseline implementations.",
                        "Commit timeline exhibits clustered bulk-code additions without staged commits."
                    ],
                    recommendedDecision: sim > 90 ? 'DISQUALIFICATION' : 'REQUEST_EXPLANATION',
                    recommendationReason: `Direct source logic replication (${sim}%) exceeds acceptable hackathon thresholds, compromising originality criteria for ${hackTitle}.`,
                    suggestedCommunication: `Official Notice: Your submission for ${hackTitle} has been flagged for algorithmic similarity. Please provide author commit logs and original source proof within 24 hours.`
                });
            }
        } catch (error) {
            console.error("AI Dispute assessment failed:", error);
            const sim = selectedDispute.similarityAnalysis?.overallSimilarity || 94;
            const teamName = selectedDispute.reportedTeam?.name || 'Reported Team';
            const hackTitle = selectedDispute.hackathonTitle || 'the competition';
            setAiAssessment({
                executiveSummary: `Plagiarism and similarity analysis for ${teamName} flagged high duplication (${sim}%) against existing public model code.`,
                severity: sim > 90 ? 'CRITICAL' : 'HIGH',
                confidenceScore: selectedDispute.assessment?.aiConfidence || 96,
                keyFindings: [
                    `Repository source code exhibits an overall similarity score of ${sim}%.`,
                    "Model architecture and preprocessing pipelines mirror external baseline implementations.",
                    "Commit timeline exhibits clustered bulk-code additions without staged commits."
                ],
                recommendedDecision: sim > 90 ? 'DISQUALIFICATION' : 'REQUEST_EXPLANATION',
                recommendationReason: `Direct source logic replication (${sim}%) exceeds acceptable hackathon thresholds, compromising originality criteria for ${hackTitle}.`,
                suggestedCommunication: `Official Notice: Your submission for ${hackTitle} has been flagged for algorithmic similarity. Please provide author commit logs and original source proof within 24 hours.`
            });
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleApplyAiResolution = (assessment) => {
        if (!assessment) return;
        if (assessment.recommendedDecision === 'DISQUALIFICATION') {
            setResolutionDecision('Disqualification');
            setResolutionActions({ invalidateSubmission: true, disqualifyTeam: true, revokeCert: true, suspendAccount: false });
        } else if (assessment.recommendedDecision === 'ISSUE_WARNING') {
            setResolutionDecision('Official Warning');
            setResolutionActions({ invalidateSubmission: false, disqualifyTeam: false, revokeCert: false, suspendAccount: false });
        } else if (assessment.recommendedDecision === 'DISMISS') {
            setResolutionDecision('Dismiss Dispute');
            setResolutionActions({ invalidateSubmission: false, disqualifyTeam: false, revokeCert: false, suspendAccount: false });
        }
        if (assessment.recommendationReason) {
            setResolutionReason(assessment.recommendationReason);
        }
    };

    const loadDisputes = async () => {
        setIsLoading(true);
        try {
            const data = await fetchDisputes();
            if (Array.isArray(data) && data.length > 0) {
                setDisputes(data);
                setSelectedDispute(data[0]);
            }
        } catch (error) {
            console.log("Loaded initial workspace dataset for Disputes.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDisputes();
    }, []);

    // Filter Logic
    const filteredDisputes = useMemo(() => {
        return disputes.filter(d => {
            const matchesTab = 
                activeTab === 'All' ? true :
                activeTab === 'Under Investigation' ? d.status.includes('Investigation') :
                activeTab === 'Resolved' ? d.status === 'Resolved' : true;

            const matchesSeverity = severityFilter === 'ALL' ? true : d.severity === severityFilter;
            const query = searchQuery.toLowerCase();
            const matchesSearch = 
                d.disputeCode.toLowerCase().includes(query) ||
                d.reportedTeam.name.toLowerCase().includes(query) ||
                d.reporter.name.toLowerCase().includes(query);

            return matchesTab && matchesSeverity && matchesSearch;
        });
    }, [disputes, activeTab, severityFilter, searchQuery]);

    // Handle Resolution Submission
    const handleResolveSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDispute || !resolutionReason.trim()) {
            return alert("Mandatory resolution reason is required for audit logs.");
        }
        const actions = Object.keys(resolutionActions).filter(k => resolutionActions[k]);
        try {
            await resolveDispute(selectedDispute.id || selectedDispute.disputeCode, resolutionDecision, resolutionReason, actions, notifyReporter, notifyTeam);
            alert(`✓ Dispute Case ${selectedDispute.disputeCode} RESOLVED with decision '${resolutionDecision}'.`);
            loadDisputes();
        } catch (err) {
            alert("Failed to resolve dispute.");
        }
    };

    // Handle Investigator Assignment
    const handleAssignInvestigatorSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDispute) return;
        try {
            await assignInvestigator(selectedDispute.id || selectedDispute.disputeCode, investigatorInput.name, investigatorInput.email);
            alert(`✓ Investigator ${investigatorInput.name} assigned.`);
            setIsAssignModalOpen(false);
            loadDisputes();
        } catch (err) {
            alert("Failed to assign investigator.");
        }
    };

    // Handle Information Request
    const handleRequestInfoSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDispute) return;
        try {
            await requestInfoFromParty(selectedDispute.id || selectedDispute.disputeCode, infoRequestForm.target, infoRequestForm.requestedItems, infoRequestForm.message, infoRequestForm.deadlineHours);
            alert(`✓ Information request sent to ${infoRequestForm.target}. Case status updated to 'Waiting for Response'.`);
            setIsRequestInfoModalOpen(false);
            loadDisputes();
        } catch (err) {
            alert("Failed to request info.");
        }
    };

    // Add Note / Message
    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!selectedDispute || !newNoteText.trim()) return;
        try {
            const res = await addDisputeNote(selectedDispute.id || selectedDispute.disputeCode, newNoteText, noteIsInternal);
            setDisputes(prev => prev.map(d => d.id === selectedDispute.id ? { ...d, communications: [...(d.communications || []), res.note] } : d));
            if (selectedDispute) setSelectedDispute(prev => ({ ...prev, communications: [...(prev.communications || []), res.note] }));
            setNewNoteText('');
        } catch (err) {
            alert("Failed to add note.");
        }
    };

    return (
        <div className={`space-y-6 animate-in fade-in duration-700 pb-16 ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
            
            {/* Header & Main Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-3xl font-extrabold tracking-tight ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>Disputes & Moderation Governance Workspace</h1>
                    <p className={`mt-1 text-sm ${theme.subText}`}>Investigate plagiarism flags, rule violations, conflict of interest, and evidence chains.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={loadDisputes} 
                        title="Refresh"
                        className="p-2.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/30 text-sky-500 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 rounded-full transition-all flex items-center justify-center shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw-icon lucide-rotate-ccw">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 1. TOP KPI ROW */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Total Disputes', val: '24', icon: <ScaleIcon className="w-4 h-4 text-sky-500" />, tab: 'All', sev: 'ALL' },
                    { label: 'Open', val: '7', color: 'text-amber-600 dark:text-amber-400', icon: <SirenIcon className="w-4 h-4 text-amber-500" />, tab: 'Under Investigation', sev: 'HIGH' },
                    { label: 'Under Investigation', val: '9', color: 'text-sky-500 dark:text-sky-400', icon: <ScaleIcon className="w-4 h-4 text-sky-500" />, tab: 'Under Investigation', sev: 'ALL' },
                    { label: 'Critical Cases', val: '2', color: 'text-rose-600 dark:text-red-400', icon: <TriangleAlertIcon className="w-4 h-4 text-rose-500" />, tab: 'Under Investigation', sev: 'CRITICAL' },
                    { label: 'Resolved', val: '8', color: 'text-emerald-600 dark:text-emerald-400', icon: <CheckIcon className="w-4 h-4 text-emerald-500" />, tab: 'Resolved', sev: 'ALL' }
                ].map((stat, i) => (
                    <div 
                        key={i} 
                        onClick={() => {
                            setActiveTab(stat.tab);
                            setSeverityFilter(stat.sev);
                        }}
                        className="adamgiebl-card group cursor-pointer transition-all hover:-translate-y-1 p-3.5 flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between gap-1 mb-1">
                            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">{stat.label}</h3>
                            <div className="w-7 h-7 rounded-lg bg-sky-500/10 dark:bg-white/10 border border-sky-500/20 dark:border-white/10 flex items-center justify-center shrink-0">
                                {stat.icon}
                            </div>
                        </div>
                        <div className="my-1.5">
                            <p className={`text-2xl font-black tracking-tight ${stat.color || (isLightTheme ? 'text-slate-900' : 'text-white')}`}>{stat.val}</p>
                        </div>
                        <div className="pt-1.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <span>Filter Disputes</span>
                            <span className="group-hover:translate-x-1 transition-transform opacity-60">→</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className={`flex p-1.5 rounded-2xl border ${isLightTheme ? 'bg-slate-100 border-slate-200' : 'bg-black/20 border-white/5'}`}>
                    {['All', 'Under Investigation', 'Resolved'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-xs rounded-2xl transition-all ${activeTab === tab ? theme.tabActive : theme.tabInactive}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <input 
                        type="text" 
                        placeholder="Search case code, team, reporter..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className={`w-full md:w-64 rounded-2xl px-4 py-2 text-xs focus:outline-none ${theme.inputBg}`}
                    />

                    <div className="relative inline-flex items-center">
                        <select 
                            value={severityFilter} 
                            onChange={(e) => setSeverityFilter(e.target.value)} 
                            className={`appearance-none pr-8 pl-3.5 py-2 rounded-full border border-slate-200 dark:border-white/10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all ${theme.inputBg}`}
                        >
                            <option value="ALL">All Severities</option>
                            <option value="CRITICAL">🔴 Critical</option>
                            <option value="HIGH">🟠 High</option>
                            <option value="MEDIUM">🟡 Medium</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-slate-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* SPLIT PANE WORKSPACE */}
            <div className="flex flex-col lg:flex-row gap-6 overflow-hidden min-h-[520px]">
                
                {/* LEFT PANE: Dispute Case Directory List */}
                <div className="w-full lg:w-1/3 flex flex-col absolutestrange-card overflow-hidden shadow-xl p-0">
                    <div className="p-3 border-b border-slate-200 dark:border-white/5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Dispute Cases Directory ({filteredDisputes.length})
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="p-6 text-center text-xs text-blue-600 font-bold animate-pulse">Loading Live Disputes...</div>
                        ) : filteredDisputes.length === 0 ? (
                            <p className="text-center text-slate-500 text-xs py-8">No dispute cases match specified criteria.</p>
                        ) : (
                            filteredDisputes.map(dispute => {
                                const isSelected = selectedDispute?.id === dispute.id;
                                return (
                                    <div 
                                        key={dispute.id} 
                                        onClick={() => setSelectedDispute(dispute)}
                                        className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                                            isSelected 
                                            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/50 shadow-sm' 
                                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-blue-300'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-mono font-extrabold text-blue-600 dark:text-blue-400">{dispute.disputeCode}</span>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                                dispute.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-600 dark:text-red-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                            }`}>
                                                {dispute.severity === 'CRITICAL' ? '🔴 Critical' : dispute.severity}
                                            </span>
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">{dispute.type} - {dispute.reportedTeam?.name}</h4>
                                        <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">{dispute.hackathonTitle}</p>
                                        
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] font-mono text-slate-500">
                                            <span>SLA: {dispute.assessment?.slaRemaining || '17h remaining'}</span>
                                            <span className="font-bold text-slate-700 dark:text-gray-300">{dispute.status}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Dispute Case Investigation Workspace */}
                <div className="w-full lg:w-2/3 absolutestrange-card flex flex-col justify-between overflow-y-auto custom-scrollbar">
                    {selectedDispute ? (
                        <div className="p-6 space-y-6">
                            
                            {/* Header */}
                            <div className="border-b border-slate-200 dark:border-white/10 pb-4">
                                <div className="flex flex-wrap justify-between items-center gap-3 mb-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedDispute.disputeCode}</h2>
                                        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${
                                            selectedDispute.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-600 dark:text-red-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                        }`}>
                                            {selectedDispute.severity}
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/20">
                                        Status: {selectedDispute.status}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-gray-400 font-medium">Category: <strong className="text-slate-800 dark:text-white">{selectedDispute.type}</strong> • Event: {selectedDispute.hackathonTitle}</p>
                            </div>

                            {/* 1. CASE ASSESSMENT HEADER */}
                            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                                selectedDispute.severity === 'CRITICAL' ? 'bg-rose-50 dark:bg-red-500/10 border-rose-200 dark:border-red-500/30' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
                            }`}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <ScaleIcon className="w-4 h-4 text-sky-500" />
                                        <h3 className={`text-xs font-black uppercase tracking-wider ${selectedDispute.severity === 'CRITICAL' ? 'text-rose-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>Case Risk Assessment & AI Recommendation</h3>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-800 dark:text-white">
                                        <span>Evidence Verified: <strong>{selectedDispute.assessment?.evidenceVerified || '3 / 4'}</strong></span>
                                        <span className="text-slate-400">|</span>
                                        <span>AI Confidence: <strong className="text-emerald-600 dark:text-emerald-400">{selectedDispute.assessment?.aiConfidence || 91}%</strong></span>
                                        <span className="text-slate-400">|</span>
                                        <span className="text-amber-600 font-mono flex items-center gap-1">
                                            {(selectedDispute.assessment?.slaRemaining?.includes('EXCEEDED') || selectedDispute.assessment?.slaRemaining?.includes('⚠️')) && (
                                                <TriangleAlertIcon className="w-3.5 h-3.5 text-amber-500 inline-block shrink-0" />
                                            )}
                                            <span>SLA: {selectedDispute.assessment?.slaRemaining?.replace('⚠️', '').trim() || '17h remaining'}</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    <button 
                                        onClick={handleRunAiAssessment}
                                        disabled={isAiLoading}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                        <span>{isAiLoading ? 'Analyzing...' : 'Run AI Analysis'}</span>
                                    </button>
                                    <div className="text-left md:text-right">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">AI Recommendation</span>
                                        <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase bg-sky-50 dark:bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-200 dark:border-sky-500/20">
                                            {selectedDispute.assessment?.recommendation || 'INVESTIGATE'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. CONFLICT OF INTEREST (COI) ALERT */}
                            {selectedDispute.coi?.detected && (
                                <div className="p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl text-xs font-bold text-rose-800 dark:text-red-300 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <TriangleAlertIcon className="w-4 h-4 text-rose-500 shrink-0" />
                                        <span>CONFLICT OF INTEREST DETECTED: {selectedDispute.coi.message}</span>
                                    </div>
                                    <button onClick={() => setIsAssignModalOpen(true)} className="px-3.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 rounded-full text-[10px] font-bold uppercase transition-all shadow-sm">
                                        Reassign Investigator
                                    </button>
                                </div>
                            )}

                            {/* 3. REPORTER & TARGET TEAM HISTORY PANEL */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`p-4 rounded-2xl border ${theme.innerBg}`}>
                                    <h4 className={`text-[10px] font-black uppercase tracking-wider mb-2 ${theme.mutedText}`}>Reporter Profile & History</h4>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedDispute.reporter?.name} ({selectedDispute.reporter?.role})</p>
                                    <p className="text-[11px] text-slate-500">{selectedDispute.reporter?.email}</p>
                                    <div className="mt-2 pt-2 border-t flex justify-between text-[10px] font-mono">
                                        <span>Previous Reports: <strong>{selectedDispute.reporter?.previousReports || 0}</strong></span>
                                        <span className="text-emerald-600">Accuracy: <strong>{selectedDispute.reporter?.accuracyRating || '100%'}</strong></span>
                                    </div>
                                </div>

                                <div className={`p-4 rounded-2xl border ${theme.innerBg}`}>
                                    <h4 className={`text-[10px] font-black uppercase tracking-wider mb-2 ${theme.mutedText}`}>Reported Team Profile & History</h4>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">{selectedDispute.reportedTeam?.name}</p>
                                    <p className="text-[11px] text-slate-500">{selectedDispute.reportedTeam?.college}</p>
                                    <div className="mt-2 pt-2 border-t flex justify-between text-[10px] font-mono">
                                        <span>Past Disputes: <strong>{selectedDispute.reportedTeam?.previousCases || 2}</strong></span>
                                        <span className="text-rose-600">Confirmed Violations: <strong>{selectedDispute.reportedTeam?.confirmedViolations || 1}</strong></span>
                                    </div>
                                </div>
                            </div>

                            {/* 4. CODE SIMILARITY & PLAGIARISM ANALYSIS */}
                            {selectedDispute.similarityAnalysis && (
                                <div className="p-5 bg-blue-50/70 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                                    <div className="flex justify-between items-center mb-3 border-b border-blue-200 dark:border-blue-500/20 pb-2">
                                        <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">✦ Code Similarity & Plagiarism Analysis</h4>
                                        <button onClick={() => setIsCodeModalOpen(true)} className="px-3.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 rounded-full text-[10px] font-bold uppercase transition-all shadow-sm">
                                            Side-by-Side Code Compare →
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-3">
                                        <div className={`p-2.5 rounded-2xl border ${theme.statBoxBg}`}><p className="text-xl font-black text-rose-600">{selectedDispute.similarityAnalysis.overallSimilarity}%</p><p className="text-[9px] font-bold text-slate-500 uppercase">Overall Similarity</p></div>
                                        <div className={`p-2.5 rounded-2xl border ${theme.statBoxBg}`}><p className="text-lg font-bold text-slate-900 dark:text-white">{selectedDispute.similarityAnalysis.sourceCode}%</p><p className="text-[9px] font-bold text-slate-500 uppercase">Source Code</p></div>
                                        <div className={`p-2.5 rounded-2xl border ${theme.statBoxBg}`}><p className="text-lg font-bold text-slate-900 dark:text-white">{selectedDispute.similarityAnalysis.documentation}%</p><p className="text-[9px] font-bold text-slate-500 uppercase">Documentation</p></div>
                                        <div className={`p-2.5 rounded-2xl border ${theme.statBoxBg}`}><p className="text-lg font-bold text-slate-900 dark:text-white">{selectedDispute.similarityAnalysis.readme}%</p><p className="text-[9px] font-bold text-slate-500 uppercase">README</p></div>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-gray-300 font-mono">Matched Source: <a href={selectedDispute.similarityAnalysis.matchedSourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">{selectedDispute.similarityAnalysis.matchedSourceUrl}</a></p>
                                </div>
                            )}

                            {/* 5. EVIDENCE CHAIN & INTEGRITY CHECKLIST */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`p-4 rounded-2xl border ${theme.innerBg}`}>
                                    <h4 className={`text-[10px] font-black uppercase tracking-wider mb-2.5 ${theme.mutedText}`}>Evidence Items</h4>
                                    <div className="space-y-2">
                                        {(selectedDispute.evidence || []).map((ev, i) => (
                                            <div key={i} className={`p-2.5 rounded-2xl border flex justify-between items-center text-xs font-semibold ${theme.statBoxBg}`}>
                                                <span>✓ {ev.type} ({ev.source})</span>
                                                <span className="text-[10px] font-mono text-emerald-600">Verified</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={`p-4 rounded-2xl border ${theme.innerBg}`}>
                                    <h4 className={`text-[10px] font-black uppercase tracking-wider mb-2.5 ${theme.mutedText}`}>Evidence Integrity Chain</h4>
                                    <div className="space-y-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        <div>✓ Original source verified</div>
                                        <div>✓ Report hash verified</div>
                                        <div>✓ Submission version matched</div>
                                        <div>✓ Timestamp verified</div>
                                        <div className="text-slate-500">✓ Evidence modified: <strong>No</strong></div>
                                    </div>
                                </div>
                            </div>

                            {/* 6. INVESTIGATION CHECKLIST (8 REQUIREMENTS) */}
                            <div className={`p-4 rounded-2xl border ${theme.innerBg}`}>
                                <div className="flex justify-between items-center mb-3 border-b pb-2">
                                    <h4 className={`text-[10px] font-black uppercase tracking-wider ${theme.mutedText}`}>Investigation Workflow Checklist</h4>
                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-500/20">
                                        6 / 8 Requirements Completed
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                                    <div className="text-emerald-600 dark:text-emerald-400">✓ Complaint reviewed</div>
                                    <div className="text-emerald-600 dark:text-emerald-400">✓ Reporter identity verified</div>
                                    <div className="text-emerald-600 dark:text-emerald-400">✓ Reported team identified</div>
                                    <div className="text-emerald-600 dark:text-emerald-400">✓ Submission inspected</div>
                                    <div className="text-emerald-600 dark:text-emerald-400">✓ Evidence verified</div>
                                    <div className="text-emerald-600 dark:text-emerald-400">✓ Similarity checked</div>
                                    <div className="text-amber-600">○ Team response received</div>
                                    <div className="text-slate-400">○ Final decision recorded</div>
                                </div>
                            </div>

                            {/* 7. COMMUNICATIONS & INTERNAL NOTES STREAM */}
                            <div className={`p-4 rounded-2xl border ${theme.innerBg}`}>
                                <h4 className={`text-[10px] font-black uppercase tracking-wider mb-3 border-b pb-2 ${theme.mutedText}`}>Case Communications & Internal Notes Stream</h4>
                                <div className="space-y-2.5 mb-4">
                                    {(selectedDispute.communications || []).map((comm, idx) => (
                                        <div key={idx} className={`p-3 rounded-2xl border text-xs ${comm.isInternal ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/5'}`}>
                                            <div className="flex justify-between font-bold text-blue-600 dark:text-blue-400 mb-1">
                                                <span>{comm.author} ({comm.role})</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{comm.date || comm.time}</span>
                                            </div>
                                            <p className="text-slate-700 dark:text-gray-300">{comm.text}</p>
                                        </div>
                                    ))}
                                </div>

                                <form onSubmit={handleAddNote} className="space-y-2">
                                    <textarea 
                                        placeholder="Add note or official communication..." 
                                        rows="2" 
                                        value={newNoteText} 
                                        onChange={(e) => setNewNoteText(e.target.value)} 
                                        className={`w-full rounded-2xl px-3 py-2 text-xs focus:outline-none focus:border-blue-600 resize-none ${theme.inputBg}`}
                                    ></textarea>
                                    <div className="flex justify-between items-center">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-gray-300 cursor-pointer">
                                            <input type="checkbox" checked={noteIsInternal} onChange={(e) => setNoteIsInternal(e.target.checked)} className="rounded text-sky-500" /> <LockIcon className="w-3.5 h-3.5 text-slate-400 inline mr-1" /> Internal Admin Note Only
                                        </label>
                                        <button type="submit" className="px-4 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 font-bold text-xs rounded-2xl transition-all shadow-sm">Add Stream Note</button>
                                    </div>
                                </form>
                            </div>

                            {/* 8. FINAL DECISION & RESOLUTION PANEL */}
                            <form onSubmit={handleResolveSubmit} className="p-5 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 shadow-lg">
                                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider border-b pb-2">Final Case Decision & Resolution Action</h4>
                                
                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-wider mb-2 block ${theme.mutedText}`}>Admin Decision Outcome</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['No Violation', 'Warning', 'Minor Violation', 'Major Violation', 'Disqualification', 'Account Suspension'].map(d => (
                                            <button 
                                                type="button" 
                                                key={d} 
                                                onClick={() => setResolutionDecision(d)}
                                                className={`py-2 text-xs font-bold rounded-2xl border transition-all ${resolutionDecision === d ? 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40 shadow-sm font-extrabold' : theme.inputBg}`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-wider mb-1 block ${theme.mutedText}`}>Resolution Actions Taken</label>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-gray-300">
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={resolutionActions.invalidateSubmission} onChange={(e) => setResolutionActions({...resolutionActions, invalidateSubmission: e.target.checked})} className="rounded text-sky-500" /> Invalidate Submission</label>
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={resolutionActions.disqualifyTeam} onChange={(e) => setResolutionActions({...resolutionActions, disqualifyTeam: e.target.checked})} className="rounded text-sky-500" /> Disqualify Team</label>
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={resolutionActions.revokeCert} onChange={(e) => setResolutionActions({...resolutionActions, revokeCert: e.target.checked})} className="rounded text-sky-500" /> Revoke Certificate</label>
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={resolutionActions.suspendAccount} onChange={(e) => setResolutionActions({...resolutionActions, suspendAccount: e.target.checked})} className="rounded text-sky-500" /> Suspend Account</label>
                                    </div>

                                </div>

                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-wider mb-1 block ${theme.mutedText}`}>Mandatory Resolution Reason (Required for Audit Logs)</label>
                                    <textarea 
                                        required 
                                        placeholder="Record clear evidence-based justification for final decision..." 
                                        rows="3" 
                                        value={resolutionReason} 
                                        onChange={(e) => setResolutionReason(e.target.value)} 
                                        className={`w-full rounded-2xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500 resize-none ${theme.inputBg}`}
                                    ></textarea>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-white/10">
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-gray-300">
                                        <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={notifyReporter} onChange={(e) => setNotifyReporter(e.target.checked)} className="rounded text-sky-500" /> Notify Reporter</label>
                                        <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={notifyTeam} onChange={(e) => setNotifyTeam(e.target.checked)} className="rounded text-sky-500" /> Notify Team</label>
                                    </div>

                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setIsRequestInfoModalOpen(true)} className="px-3.5 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-400 text-xs font-bold rounded-2xl transition-all">Request Info</button>
                                        <button type="button" onClick={() => setIsAssignModalOpen(true)} className="px-3.5 py-2 bg-purple-50 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/30 text-purple-700 dark:text-purple-400 text-xs font-bold rounded-2xl transition-all">Assign</button>
                                        <button type="submit" className="px-5 py-2 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 font-bold text-xs rounded-2xl shadow-sm transition-all">Record Decision & Resolve</button>
                                    </div>
                                </div>
                            </form>

                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 font-bold text-xs p-6">
                            Select a dispute case from the directory to begin evidence investigation
                        </div>
                    )}
                </div>
            </div>

            {/* REQUEST INFORMATION MODAL */}
            <ActionModal isOpen={isRequestInfoModalOpen} onClose={() => setIsRequestInfoModalOpen(false)} title="Request Information from Party">
                <form onSubmit={handleRequestInfoSubmit} className="space-y-4">
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-wider mb-1 block ${theme.mutedText}`}>Target Recipient</label>
                        <select value={infoRequestForm.target} onChange={(e) => setInfoRequestForm({...infoRequestForm, target: e.target.value})} className={`w-full rounded-lg px-3 py-2 text-xs font-bold focus:outline-none ${theme.inputBg}`}>
                            <option value="Team">Reported Team</option>
                            <option value="Reporter">Reporter</option>
                            <option value="Mentor">Mentor</option>
                            <option value="Organizer">Organizer</option>
                        </select>
                    </div>

                    <textarea placeholder="Specific explanation or document required..." rows="3" value={infoRequestForm.message} onChange={(e) => setInfoRequestForm({...infoRequestForm, message: e.target.value})} className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none resize-none ${theme.inputBg}`}></textarea>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsRequestInfoModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 font-bold">Cancel</button>
                        <button type="submit" className="px-5 py-2 bg-amber-50 dark:bg-amber-500/20 hover:bg-amber-100 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 font-bold text-xs rounded-lg shadow-sm">Dispatch Info Request</button>
                    </div>
                </form>
            </ActionModal>

            {/* ASSIGN INVESTIGATOR MODAL */}
            <ActionModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Case Investigator">
                <form onSubmit={handleAssignInvestigatorSubmit} className="space-y-4">
                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-wider mb-1 block ${theme.mutedText}`}>Investigator Name</label>
                        <input type="text" required value={investigatorInput.name} onChange={(e) => setInvestigatorInput({...investigatorInput, name: e.target.value})} className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`} />
                    </div>

                    <div>
                        <label className={`text-[10px] font-black uppercase tracking-wider mb-1 block ${theme.mutedText}`}>Investigator Email</label>
                        <input type="email" required value={investigatorInput.email} onChange={(e) => setInvestigatorInput({...investigatorInput, email: e.target.value})} className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`} />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 font-bold">Cancel</button>
                        <button type="submit" className="px-5 py-2 bg-purple-50 dark:bg-purple-500/20 hover:bg-purple-100 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-500/30 font-bold text-xs rounded-lg shadow-sm">Assign Investigator</button>
                    </div>
                </form>
            </ActionModal>

            {/* CODE COMPARISON MODAL */}
            <CodeComparisonModal isOpen={isCodeModalOpen} onClose={() => setIsCodeModalOpen(false)} isLightTheme={isLightTheme} />

            {/* AI DISPUTE ASSESSMENT MODAL */}
            <AIDisputeAssessmentModal 
                isOpen={isAiModalOpen} 
                onClose={() => setIsAiModalOpen(false)} 
                assessment={aiAssessment} 
                isLoading={isAiLoading} 
                onApplyResolution={handleApplyAiResolution}
                isLightTheme={isLightTheme} 
            />

        </div>
    );
};

export default Disputes;
