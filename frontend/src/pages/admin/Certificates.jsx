import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    TemplateIcon, 
    BoxIcon, 
    SearchIcon, 
    CheckIcon, 
    TriangleAlertIcon, 
    CertificateIcon,
    ShieldIcon,
    ZapIcon,
    FileTextIcon,
    UsersIcon
} from '../../components/AdminIcons';
import { 
    fetchCertificates, 
    fetchEligibilityQueue, 
    issueCertificate, 
    resendCertificate, 
    issueReplacementCertificate, 
    revokeCertificateWithReason, 
    verifyCertificatePublic, 
    previewBulkIssuance,
    bulkIssueConfirm,
    restoreCertificate
} from '../../services/admin/adminCertificatesApi';
import { useTheme } from '../../context/ThemeContext';

// --- Reusable Action Modal Component ---
const ActionModal = ({ isOpen, onClose, title, subtitle, children, maxWidth = "max-w-md" }) => {
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

                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{title}</h2>
                {subtitle && <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 mb-4">{subtitle}</p>}
                {children}
            </div>
        </div>
    );
};

// --- Live Certificate Visual Document Preview Component ---
const CertificateDocument = ({ cert, isLightTheme }) => {
    if (!cert) return null;

    const recipient = cert.recipientName || cert.recipient?.name || 'Alex Johnson';
    const event = cert.hackathon || cert.eventTitle || cert.event || 'Global AI Summit 2026';
    const type = cert.type || 'WINNER';
    const valId = cert.validationId || 'CERT-SEED-001';
    const date = cert.dateIssued || 'Aug 04, 2026';

    return (
        <div className="p-6 bg-gradient-to-br from-amber-500/10 via-slate-900 to-navy-950 border-4 border-amber-500/40 rounded-2xl shadow-2xl relative text-center text-white overflow-hidden my-2">
            {/* Background Seal Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none text-9xl">🎓</div>

            <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest text-amber-400 mb-4 border-b border-amber-500/30 pb-2">
                <span>PROEDUVATE OFFICIAL CREDENTIAL</span>
                <span className="font-mono">ID: {valId}</span>
            </div>

            <p className="text-[11px] uppercase tracking-widest text-gray-300 font-extrabold mb-1">CERTIFICATE OF RECOGNITION</p>
            <h3 className="text-2xl font-black text-amber-300 tracking-tight my-2 font-serif uppercase">{recipient}</h3>
            <p className="text-xs text-gray-300">has successfully distinguished as <strong className="text-amber-400 font-bold uppercase">{type}</strong> in</p>
            <h4 className="text-base font-extrabold text-white mt-1 mb-4">{event}</h4>

            <div className="flex justify-between items-end border-t border-amber-500/30 pt-3 text-[10px] text-gray-400">
                <div className="text-left">
                    <p className="font-bold text-white">Date Issued: {date}</p>
                    <p className="text-[9px]">Verified Platform Authority</p>
                </div>
                
                {/* QR Code Graphic Box */}
                <div className="p-1.5 bg-white rounded shadow-md border border-amber-400">
                    <div className="w-10 h-10 bg-slate-900 flex items-center justify-center text-[8px] font-mono text-amber-400 text-center font-bold">
                        QR SCAN
                    </div>
                </div>

                <div className="text-right">
                    <p className="font-mono text-amber-400 font-bold">{valId}</p>
                    <p className="text-[9px]">verify.proeduvate.com</p>
                </div>
            </div>
        </div>
    );
};

const Certificates = () => {
    const { theme: currentTheme } = useTheme();
    const isLightTheme = currentTheme === 'light';

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
        inputBg: isLightTheme ? 'bg-white border border-slate-200 text-slate-700 shadow-none focus:border-sky-500 rounded-xl' : 'bg-black/20 border border-white/10 text-white rounded-xl',
    };

    const [searchParams] = useSearchParams();
    const [certificates, setCertificates] = useState([]);
    const [selectedCert, setSelectedCert] = useState(null);
    const [eligibilityQueue, setEligibilityQueue] = useState([]);
    const [queueCounts, setQueueCounts] = useState({ eligible: 0, pendingEligibility: 0, issued: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Toast Alert State
    const [toastMessage, setToastMessage] = useState(null);
    const showToast = (msg, type = 'success') => {
        setToastMessage({ text: msg, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Tabs & Filters
    const [activeTab, setActiveTab] = useState('Active');
    const [activeDetailTab, setActiveDetailTab] = useState('checklist'); // 'checklist' | 'delivery' | 'audit'
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    
    // Public Verification Lookup State
    const [verifySearchId, setVerifySearchId] = useState('');
    const [verifyResult, setVerifyResult] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // Modals State
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
    const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

    // Form inputs State
    const [issueForm, setIssueForm] = useState({
        recipientName: '',
        recipientEmail: '',
        hackathonId: 'h101',
        eventTitle: 'Global AI Summit 2026',
        type: 'Winner',
        template: 'Winner Certificate',
        customMessage: ''
    });
    const [revokeForm, setRevokeForm] = useState({ reason: 'Incorrect information', notes: '' });
    const [replacementForm, setReplacementForm] = useState({
        originalValidationId: '',
        recipientName: '',
        recipientEmail: '',
        type: 'Winner',
        reason: 'Typo correction'
    });

    // Bulk Issue Flow State (2-step)
    const [bulkStep, setBulkStep] = useState(1); // 1: Input/Preview, 2: Confirm
    const [bulkText, setBulkText] = useState(
        "Alex Johnson, alex@example.com, Global AI Summit 2026, Winner\nPriya Sharma, priya@example.com, Global AI Summit 2026, Runner Up"
    );
    const [bulkTemplate, setBulkTemplate] = useState('Winner Certificate');
    const [bulkPreviewData, setBulkPreviewData] = useState(null);
    const [bulkResultData, setBulkResultData] = useState(null);

    // URL Param Sync
    useEffect(() => {
        const filter = searchParams.get('filter');
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        } else if (filter === 'pending' || filter === 'eligibility' || filter === 'requests') {
            setActiveTab('Eligibility Queue');
        } else if (filter === 'issued' || filter === 'active' || filter === 'generated') {
            setActiveTab('Active');
        } else if (filter === 'revoked') {
            setActiveTab('Revoked');
        } else if (filter === 'replaced') {
            setActiveTab('Replaced');
        }
    }, [searchParams]);

    const loadCertificatesData = async () => {
        setIsLoading(true);
        try {
            const data = await fetchCertificates();
            const certList = Array.isArray(data) ? data : [];
            setCertificates(certList);
            if (certList.length > 0) {
                if (!selectedCert || !certList.find(c => c.id === selectedCert.id || c.validationId === selectedCert.validationId)) {
                    setSelectedCert(certList[0]);
                }
            } else {
                setSelectedCert(null);
            }

            const qData = await fetchEligibilityQueue();
            if (qData && qData.queue) {
                setEligibilityQueue(qData.queue);
                setQueueCounts(qData.counts || {});
            }
        } catch (error) {
            console.error("Failed to load certificates:", error);
            showToast("Failed to load certificates from server", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCertificatesData();
    }, []);

    // Derived Statistics
    const stats = useMemo(() => {
        const total = certificates.length;
        const active = certificates.filter(c => ['Active', 'Issued'].includes(c.status)).length;
        const revoked = certificates.filter(c => c.status === 'Revoked').length;
        const replaced = certificates.filter(c => c.status === 'Replaced').length;
        const eligible = eligibilityQueue.filter(q => q.status === 'READY TO ISSUE').length || queueCounts.eligible || 0;
        const notDownloaded = certificates.filter(c => !c.deliveryStatus?.downloaded).length;
        return { total, active, revoked, replaced, eligible, notDownloaded };
    }, [certificates, eligibilityQueue, queueCounts]);

    // Public QR Verification Engine
    const handleVerifySearch = async (e) => {
        e.preventDefault();
        if (!verifySearchId.trim()) return;
        setIsVerifying(true);
        try {
            const res = await verifyCertificatePublic(verifySearchId.trim());
            setVerifyResult(res);
        } catch (err) {
            setVerifyResult({ valid: false, status: 'ERROR', message: 'Verification query failed' });
        } finally {
            setIsVerifying(false);
        }
    };

    // Issue Single Certificate
    const handleIssueSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await issueCertificate(issueForm);
            if (res.isDuplicate) {
                showToast(res.message, "warning");
                return;
            }
            showToast(`Certificate issued! ID: ${res.validationId}`, "success");
            setIsIssueModalOpen(false);
            setIssueForm({
                recipientName: '',
                recipientEmail: '',
                hackathonId: 'h101',
                eventTitle: 'Global AI Summit 2026',
                type: 'Winner',
                template: 'Winner Certificate',
                customMessage: ''
            });
            loadCertificatesData();
        } catch (err) {
            showToast("Failed to issue certificate", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Pre-fill Issue Form from Eligibility Queue
    const handleIssueFromQueue = (item) => {
        setIssueForm({
            recipientName: item.name,
            recipientEmail: item.email,
            hackathonId: 'h101',
            eventTitle: item.event,
            type: item.achievement || 'Winner',
            template: item.template || 'Winner Certificate',
            customMessage: `In recognition of distinguished achievement in ${item.event}`
        });
        setIsIssueModalOpen(true);
    };

    // Resend Email Action
    const handleResend = async (certId) => {
        setActionLoading(true);
        try {
            await resendCertificate(certId);
            showToast("Certificate delivery email resent to recipient", "info");
            loadCertificatesData();
        } catch (err) {
            showToast("Failed to resend email", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Revoke Certificate Action
    const handleRevokeSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCert) return;
        setActionLoading(true);
        try {
            await revokeCertificateWithReason(selectedCert.id || selectedCert.validationId, revokeForm.reason, revokeForm.notes);
            showToast(`Certificate ${selectedCert.validationId} revoked. QR invalid.`, "error");
            setIsRevokeModalOpen(false);
            setRevokeForm({ reason: 'Incorrect information', notes: '' });
            loadCertificatesData();
        } catch (err) {
            showToast("Failed to revoke certificate", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Restore Revoked Certificate
    const handleRestore = async (certId) => {
        setActionLoading(true);
        try {
            await restoreCertificate(certId);
            showToast("Certificate restored to Active status", "success");
            loadCertificatesData();
        } catch (err) {
            showToast("Failed to restore certificate", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Replacement Certificate Action
    const handleReplacementSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const res = await issueReplacementCertificate(replacementForm);
            showToast(`Replacement ${res.newValidationId} issued!`, "success");
            setIsReplacementModalOpen(false);
            loadCertificatesData();
        } catch (err) {
            showToast("Failed to issue replacement certificate", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Bulk Issue: Step 1 Preview
    const handleBulkPreview = async () => {
        const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
        const recipients = lines.map(line => {
            const parts = line.split(',').map(p => p.trim());
            return {
                name: parts[0] || '',
                email: parts[1] || '',
                event: parts[2] || 'Global AI Summit 2026',
                type: parts[3] || 'Winner'
            };
        });

        if (recipients.length === 0) {
            showToast("Please provide recipient rows", "warning");
            return;
        }

        setActionLoading(true);
        try {
            const res = await previewBulkIssuance(recipients, bulkTemplate);
            setBulkPreviewData(res);
            setBulkStep(2);
        } catch (err) {
            showToast("Failed to generate bulk preview", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Bulk Issue: Step 2 Confirm
    const handleBulkConfirm = async () => {
        if (!bulkPreviewData || !bulkPreviewData.readyRecipients) return;
        setActionLoading(true);
        try {
            const res = await bulkIssueConfirm(bulkPreviewData.readyRecipients, bulkTemplate);
            setBulkResultData(res);
            showToast(`Bulk issue complete: ${res.issuedCount} issued, ${res.skippedCount} skipped`, "success");
            loadCertificatesData();
        } catch (err) {
            showToast("Failed to execute bulk issuance", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Filter Logic for Certificates
    const filteredCertificates = useMemo(() => {
        return certificates.filter(c => {
            const matchesTab = activeTab === 'All' ? true : 
                              activeTab === 'Active' ? ['Active', 'Issued'].includes(c.status) :
                              c.status === activeTab;
            const matchesType = typeFilter === 'ALL' ? true : (c.type || '').toUpperCase() === typeFilter.toUpperCase();
            const query = searchQuery.toLowerCase();
            const matchesSearch = 
                (c.recipientName || '').toLowerCase().includes(query) ||
                (c.recipientEmail || '').toLowerCase().includes(query) ||
                (c.validationId || '').toLowerCase().includes(query) ||
                (c.hackathon || '').toLowerCase().includes(query);

            return matchesTab && matchesType && matchesSearch;
        });
    }, [certificates, activeTab, typeFilter, searchQuery]);

    // Filter Logic for Eligibility Queue
    const filteredEligibility = useMemo(() => {
        return eligibilityQueue.filter(q => {
            const query = searchQuery.toLowerCase();
            return (
                (q.name || '').toLowerCase().includes(query) ||
                (q.email || '').toLowerCase().includes(query) ||
                (q.event || '').toLowerCase().includes(query) ||
                (q.achievement || '').toLowerCase().includes(query)
            );
        });
    }, [eligibilityQueue, searchQuery]);

    return (
        <div className="space-y-5 animate-in fade-in duration-500 pb-8">
            
            {/* Toast Notification Alert */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-bottom-5 duration-300 ${
                    toastMessage.type === 'success' ? 'bg-sky-600 text-white border border-sky-400/30 shadow-sky-900/20' :
                    toastMessage.type === 'warning' ? 'bg-amber-600 text-white' :
                    toastMessage.type === 'error' ? 'bg-rose-700 text-white' :
                    'bg-slate-900 dark:bg-slate-800 text-white border border-white/10'
                }`}>
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* 1. Header & Primary Operations */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Certificates Lifecycle & Verification Engine
                    </h1>
                    <p className="text-slate-600 dark:text-gray-400 mt-0.5 text-xs sm:text-sm font-medium">
                        Issue, verify, track delivery, manage templates, and enforce revocation governance.
                    </p>
                </div>
                
                <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                    <button 
                        onClick={() => setIsTemplatesModalOpen(true)} 
                        className="px-3.5 py-1.5 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-500/30 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                        <TemplateIcon className="w-3.5 h-3.5" /> 
                        <span>Templates</span>
                    </button>
                    <button 
                        onClick={() => { setBulkStep(1); setBulkPreviewData(null); setBulkResultData(null); setIsBulkModalOpen(true); }} 
                        className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-500/30 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                        <BoxIcon className="w-3.5 h-3.5" /> 
                        <span>Bulk Issue</span>
                    </button>
                    <button 
                        onClick={() => setIsIssueModalOpen(true)} 
                        className="px-4 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/40 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                    >
                        <span>+</span> 
                        <span>Issue Certificate</span>
                    </button>
                </div>
            </div>

            {/* 2. Top Metric Cards (Live Computed) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div 
                    onClick={() => setActiveTab('All')}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 ${theme.statBoxBg}`}
                >
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400">Total Issued</p>
                        <CertificateIcon className="w-4 h-4 text-sky-500" />
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
                </div>

                <div 
                    onClick={() => setActiveTab('Active')}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 ${theme.statBoxBg}`}
                >
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active & Valid</p>
                        <CheckIcon className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</p>
                </div>

                <div 
                    onClick={() => setActiveTab('Eligibility Queue')}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 ${theme.statBoxBg}`}
                >
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">Eligible Queue</p>
                        <UsersIcon className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.eligible}</p>
                </div>

                <div 
                    onClick={() => setActiveTab('Revoked')}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 ${theme.statBoxBg}`}
                >
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Revoked</p>
                        <TriangleAlertIcon className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.revoked}</p>
                </div>

                <div 
                    onClick={() => setActiveTab('All')}
                    className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5 ${theme.statBoxBg}`}
                >
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Unopened / Pending</p>
                        <TriangleAlertIcon className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.notDownloaded}</p>
                </div>
            </div>

            {/* 3. Instant Public QR Verification Engine Bar */}
            <div className="absolutestrange-card p-3.5">
                <form onSubmit={handleVerifySearch} className="flex flex-col sm:flex-row gap-2.5 items-center">
                    <span className="text-xs font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 shrink-0 flex items-center gap-1.5">
                        <SearchIcon className="w-4 h-4 text-sky-500" /> Instant Public QR Verification:
                    </span>
                    <input 
                        type="text" 
                        placeholder="Enter validation ID (e.g. CERT-2026-A1B2C3D4)..." 
                        value={verifySearchId} 
                        onChange={(e) => setVerifySearchId(e.target.value)} 
                        className={`flex-1 rounded-xl px-3.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-sky-500 ${theme.inputBg}`}
                    />
                    <button 
                        type="submit" 
                        disabled={isVerifying}
                        className="px-4 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 font-bold text-xs rounded-xl transition-all shadow-sm shrink-0"
                    >
                        {isVerifying ? 'Verifying...' : 'Verify Authenticity'}
                    </button>
                </form>

                {verifyResult && (
                    <div className={`mt-3 p-3 rounded-xl border text-xs font-bold animate-in fade-in flex items-center justify-between ${
                        verifyResult.valid ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300' :
                        verifyResult.status === 'REVOKED' ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300' :
                        verifyResult.status === 'REPLACED' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300' :
                        'bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/10 text-slate-800 dark:text-gray-300'
                    }`}>
                        <span>{verifyResult.message}</span>
                        <span className="font-mono text-[10px] uppercase font-black">{verifyResult.status}</span>
                    </div>
                )}
            </div>

            {/* 4. Split Pane Workspace */}
            <div className="flex flex-col lg:flex-row gap-5 min-h-[580px]">
                
                {/* LEFT PANE: Certificate Directory & Queue */}
                <div className="w-full lg:w-1/2 flex flex-col absolutestrange-card overflow-hidden p-0 h-[640px]">
                    
                    {/* Status Tabs */}
                    <div className="p-2 border-b border-slate-200 dark:border-white/5 flex gap-1 shrink-0 bg-slate-50/70 dark:bg-white/[0.02] overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'Active', label: 'Active', count: stats.active },
                            { id: 'Eligibility Queue', label: 'Eligibility Queue', count: stats.eligible },
                            { id: 'Revoked', label: 'Revoked', count: stats.revoked },
                            { id: 'Replaced', label: 'Replaced', count: stats.replaced },
                            { id: 'All', label: 'All Records', count: stats.total }
                        ].map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-1.5 px-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                                        isActive 
                                        ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300/80 dark:border-sky-500/40 font-extrabold shadow-sm' 
                                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 border border-transparent'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-sky-200/70 dark:bg-sky-400/20 text-sky-800 dark:text-sky-200' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300'}`}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Filter Controls Bar */}
                    <div className="p-2.5 border-b border-slate-200 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-transparent flex gap-2">
                        <div className="relative flex-1">
                            <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder={activeTab === 'Eligibility Queue' ? "Search candidate or event..." : "Search recipient, email, or ID..."} 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
                            />
                        </div>

                        {activeTab !== 'Eligibility Queue' && (
                            <select 
                                value={typeFilter} 
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold border border-slate-200 dark:border-white/10 ${theme.inputBg}`}
                            >
                                <option value="ALL">All Types</option>
                                <option value="WINNER">Winner</option>
                                <option value="RUNNER UP">Runner Up</option>
                                <option value="PARTICIPANT">Participant</option>
                                <option value="MENTOR">Mentor</option>
                            </select>
                        )}
                    </div>

                    {/* List Items (Cards) */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="p-8 text-center text-xs text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider animate-pulse">
                                Loading Certificates Ledger...
                            </div>
                        ) : activeTab === 'Eligibility Queue' ? (
                            filteredEligibility.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-xs">
                                    No candidates pending certificate eligibility.
                                </div>
                            ) : (
                                filteredEligibility.map((item) => (
                                    <div 
                                        key={item.id}
                                        className="p-3 rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-white/[0.03] text-left hover:border-sky-300 transition-all flex flex-col justify-between gap-2.5"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-xs font-black text-slate-900 dark:text-white">{item.name}</h4>
                                                <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">{item.email}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">{item.event}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                item.status === 'READY TO ISSUE' 
                                                ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' 
                                                : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-[10px]">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                                <CheckIcon className="w-3.5 h-3.5" /> 8/8 Criteria Satisfied
                                            </span>
                                            <button 
                                                onClick={() => handleIssueFromQueue(item)}
                                                className="px-3.5 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/40 font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95"
                                            >
                                                Issue Certificate
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )
                        ) : filteredCertificates.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">
                                No certificates found matching specified filters.
                            </div>
                        ) : (
                            filteredCertificates.map((cert) => {
                                const isSelected = selectedCert?.validationId === cert.validationId;
                                return (
                                    <div 
                                        key={cert.id || cert.validationId}
                                        onClick={() => setSelectedCert(cert)}
                                        className={`p-3 rounded-xl cursor-pointer transition-all border relative text-left ${
                                            isSelected 
                                            ? 'bg-sky-50/90 dark:bg-sky-500/15 border-sky-400 dark:border-sky-500/60 shadow-sm' 
                                            : 'bg-white dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5 hover:border-sky-300 dark:hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <div className="truncate pr-2">
                                                <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{cert.recipientName}</h4>
                                                <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium truncate">{cert.recipientEmail}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate mt-0.5">{cert.hackathon}</p>
                                            </div>

                                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                cert.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                                                cert.status === 'Revoked' ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                                                'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                            }`}>
                                                {cert.status}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-500 font-mono">
                                            <span className="font-bold text-sky-600 dark:text-sky-400">{cert.validationId}</span>
                                            <div className="flex items-center gap-2">
                                                <span>📧 {cert.deliveryStatus?.emailSent ? '✓' : '✗'}</span>
                                                <span>⬇ {cert.deliveryStatus?.downloadsCount || 0}</span>
                                                <span>🔍 {cert.deliveryStatus?.verificationCount || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Certificate Inspector & Live Visual Render */}
                <div className="w-full lg:w-1/2 absolutestrange-card flex flex-col overflow-hidden relative p-0 h-[640px]">
                    {selectedCert ? (
                        <>
                            {/* Selected Header */}
                            <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-white">{selectedCert.recipientName}</h2>
                                    <p className="text-xs text-sky-600 dark:text-sky-400 font-mono font-bold">{selectedCert.validationId}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                                    selectedCert.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                                    selectedCert.status === 'Revoked' ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                                    'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                }`}>
                                    {selectedCert.status}
                                </span>
                            </div>

                            {/* Sub-tab Navigation */}
                            <div className="flex border-b border-slate-200 dark:border-white/10 px-4 pt-2 gap-3 shrink-0 bg-white dark:bg-transparent">
                                {[
                                    { id: 'checklist', label: '1. Document & Checklist', icon: <FileTextIcon className="w-3.5 h-3.5" /> },
                                    { id: 'delivery', label: '2. Delivery & Tracking', icon: <ZapIcon className="w-3.5 h-3.5" /> },
                                    { id: 'audit', label: '3. Audit History', icon: <ShieldIcon className="w-3.5 h-3.5" /> },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveDetailTab(tab.id)}
                                        className={`pb-2 px-2 text-xs font-extrabold transition-all border-b-2 flex items-center gap-1.5 ${
                                            activeDetailTab === tab.id
                                            ? 'border-sky-500 text-sky-700 dark:text-sky-300 dark:border-sky-400'
                                            : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                                        }`}
                                    >
                                        {tab.icon}
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Main Scrollable Body */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                
                                {activeDetailTab === 'checklist' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        {/* Status Alert if Revoked or Replaced */}
                                        {selectedCert.status === 'Revoked' && (
                                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs">
                                                <p className="font-extrabold flex items-center gap-1.5 mb-0.5">
                                                    <TriangleAlertIcon className="w-4 h-4 text-rose-500" /> Certificate Officially Revoked:
                                                </p>
                                                <p className="font-medium pl-5">{selectedCert.revokeReason || 'Revoked by administrator.'}</p>
                                            </div>
                                        )}

                                        {selectedCert.status === 'Replaced' && (
                                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                                                <p className="font-extrabold flex items-center gap-1.5 mb-0.5">
                                                    <TriangleAlertIcon className="w-4 h-4 text-amber-500" /> Superseded by Replacement:
                                                </p>
                                                <p className="font-medium pl-5 font-mono">New Validation ID: {selectedCert.replacedBy || 'Generated'}</p>
                                            </div>
                                        )}

                                        {/* Live Visual Certificate Render */}
                                        <CertificateDocument cert={selectedCert} isLightTheme={isLightTheme} />

                                        {/* 8-Point Eligibility Checklist */}
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-2.5">
                                                8-Point Issuance Verification Checklist
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                                                {Object.entries(selectedCert.checklist || {
                                                    registered: true, teamVerified: true, hackathonCompleted: true,
                                                    submissionCompleted: true, evaluationCompleted: true,
                                                    resultFinalized: true, notPreviouslyIssued: true, userActive: true
                                                }).map(([k, v]) => (
                                                    <div key={k} className={v ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1' : 'text-rose-600 flex items-center gap-1'}>
                                                        <span>{v ? '✓' : '✗'}</span>
                                                        <span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeDetailTab === 'delivery' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3 border-b pb-2">
                                                Delivery & Engagement Metrics
                                            </h4>
                                            <div className="space-y-2.5 text-xs">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500">Email Delivery:</span>
                                                    <strong className="text-emerald-600 dark:text-emerald-400">✓ Delivered Successfully</strong>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500">Email Opened:</span>
                                                    <strong className="text-emerald-600 dark:text-emerald-400">✓ Confirmed Opened</strong>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500">Downloads Count:</span>
                                                    <strong className="font-mono text-slate-800 dark:text-white">{selectedCert.deliveryStatus?.downloadsCount || 0} times</strong>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500">Public QR Verifications:</span>
                                                    <strong className="font-mono text-sky-600 dark:text-sky-400">{selectedCert.deliveryStatus?.verificationCount || 0} checks</strong>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-white/5">
                                                    <span className="text-slate-500">Template Style:</span>
                                                    <strong className="text-slate-800 dark:text-white">{selectedCert.template || 'Winner Certificate'}</strong>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500">Issued Authority:</span>
                                                    <strong className="text-slate-800 dark:text-white">{selectedCert.issuedBy || 'ProEduvate Platform'}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeDetailTab === 'audit' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className={`p-4 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-3 border-b pb-2">
                                                Immutable Certificate Audit History
                                            </h4>
                                            <div className="space-y-2.5">
                                                {(selectedCert.auditHistory || []).map((entry, idx) => (
                                                    <div key={idx} className="p-2.5 bg-white dark:bg-black/30 rounded-lg border border-slate-200 dark:border-white/5 text-xs">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-bold text-sky-600 dark:text-sky-400">{entry.event}</span>
                                                            <span className="text-[10px] font-mono text-slate-400">{entry.date}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Context-Aware Action Footer */}
                            <div className="p-3.5 bg-white dark:bg-navy-900 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-lg">
                                <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400">
                                    Status: <strong className="text-slate-900 dark:text-white uppercase">{selectedCert.status}</strong>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {(selectedCert.status === 'Active' || selectedCert.status === 'Issued') && (
                                        <>
                                            <button 
                                                onClick={() => handleResend(selectedCert.id || selectedCert.validationId)}
                                                disabled={actionLoading}
                                                className="px-3.5 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 text-xs font-bold rounded-xl transition-all shadow-sm"
                                            >
                                                Resend Email
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setReplacementForm({
                                                        originalValidationId: selectedCert.validationId,
                                                        recipientName: selectedCert.recipientName,
                                                        recipientEmail: selectedCert.recipientEmail,
                                                        type: selectedCert.type || 'Winner',
                                                        reason: 'Typo correction'
                                                    });
                                                    setIsReplacementModalOpen(true);
                                                }}
                                                disabled={actionLoading}
                                                className="px-3.5 py-1.5 bg-purple-50 dark:bg-purple-500/20 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40 text-xs font-bold rounded-xl transition-all shadow-sm"
                                            >
                                                Issue Replacement
                                            </button>
                                            <button 
                                                onClick={() => setIsRevokeModalOpen(true)}
                                                disabled={actionLoading}
                                                className="px-3.5 py-1.5 bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 text-xs font-bold rounded-xl transition-all shadow-sm"
                                            >
                                                Revoke Certificate
                                            </button>
                                        </>
                                    )}

                                    {selectedCert.status === 'Revoked' && (
                                        <button 
                                            onClick={() => handleRestore(selectedCert.id || selectedCert.validationId)}
                                            disabled={actionLoading}
                                            className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 font-bold text-xs rounded-xl shadow-sm transition-all"
                                        >
                                            Restore to Active
                                        </button>
                                    )}

                                    {selectedCert.status === 'Replaced' && (
                                        <span className="text-xs text-amber-600 font-bold">
                                            Replaced by {selectedCert.replacedBy || 'Certificate'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                            <CertificateIcon className="w-12 h-12 mb-3 opacity-30" />
                            <p className="font-bold text-sm">Select a certificate record from the directory to inspect.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* 1. ISSUE CERTIFICATE MODAL */}
            <ActionModal 
                isOpen={isIssueModalOpen} 
                onClose={() => setIsIssueModalOpen(false)} 
                title="Issue Platform Certificate" 
                subtitle="Generate and cryptographically sign official credential."
                maxWidth="max-w-xl"
            >
                <form onSubmit={handleIssueSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Recipient Full Name</label>
                            <input 
                                type="text" 
                                required 
                                value={issueForm.recipientName} 
                                onChange={(e) => setIssueForm({...issueForm, recipientName: e.target.value})} 
                                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`} 
                                placeholder="e.g. Alex Johnson" 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Recipient Email</label>
                            <input 
                                type="email" 
                                required 
                                value={issueForm.recipientEmail} 
                                onChange={(e) => setIssueForm({...issueForm, recipientEmail: e.target.value})} 
                                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`} 
                                placeholder="alex@example.com" 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Certificate Type</label>
                            <select 
                                value={issueForm.type} 
                                onChange={(e) => setIssueForm({...issueForm, type: e.target.value, template: `${e.target.value} Certificate`})} 
                                className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${theme.inputBg}`}
                            >
                                <option value="Winner">Winner</option>
                                <option value="Runner Up">Runner Up</option>
                                <option value="Participant">Participant</option>
                                <option value="Mentor">Mentor</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Template</label>
                            <select 
                                value={issueForm.template} 
                                onChange={(e) => setIssueForm({...issueForm, template: e.target.value})} 
                                className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${theme.inputBg}`}
                            >
                                <option value="Winner Certificate">Winner Certificate</option>
                                <option value="Runner-up Certificate">Runner-up Certificate</option>
                                <option value="Participant Certificate">Participant Certificate</option>
                                <option value="Mentor Certificate">Mentor Certificate</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Event Title</label>
                        <input 
                            type="text" 
                            required 
                            value={issueForm.eventTitle} 
                            onChange={(e) => setIssueForm({...issueForm, eventTitle: e.target.value})} 
                            className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`} 
                            placeholder="Global AI Summit 2026" 
                        />
                    </div>

                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckIcon className="w-4 h-4 text-emerald-500 shrink-0" /> 8/8 Eligibility Requirements Satisfied for recipient account.
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsIssueModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 font-bold">Cancel</button>
                        <button 
                            type="submit" 
                            disabled={actionLoading} 
                            className="px-5 py-2 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 font-bold text-xs rounded-xl shadow-sm transition-all"
                        >
                            {actionLoading ? 'Issuing...' : 'Confirm & Issue'}
                        </button>
                    </div>
                </form>
            </ActionModal>

            {/* 2. REVOCATION MODAL */}
            <ActionModal 
                isOpen={isRevokeModalOpen} 
                onClose={() => setIsRevokeModalOpen(false)} 
                title="Revoke Platform Certificate"
                subtitle={`Invalidate validation ID ${selectedCert?.validationId}`}
            >
                <form onSubmit={handleRevokeSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Revocation Reason</label>
                        <select 
                            value={revokeForm.reason} 
                            onChange={(e) => setRevokeForm({...revokeForm, reason: e.target.value})} 
                            className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${theme.inputBg}`}
                        >
                            <option value="Incorrect information">Incorrect information</option>
                            <option value="Fraudulent certificate">Fraudulent certificate</option>
                            <option value="Disqualified participant">Disqualified participant</option>
                            <option value="Event result changed">Event result changed</option>
                            <option value="Duplicate certificate">Duplicate certificate</option>
                        </select>
                    </div>

                    <textarea 
                        placeholder="Additional audit notes (optional)..." 
                        rows="3" 
                        value={revokeForm.notes} 
                        onChange={(e) => setRevokeForm({...revokeForm, notes: e.target.value})} 
                        className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none resize-none ${theme.inputBg}`}
                    ></textarea>

                    <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <TriangleAlertIcon className="w-4 h-4 text-rose-500 shrink-0" /> WARNING: Revoking invalidates public QR verification immediately.
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsRevokeModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 font-bold">Cancel</button>
                        <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md">
                            {actionLoading ? 'Revoking...' : 'Confirm Revocation'}
                        </button>
                    </div>
                </form>
            </ActionModal>

            {/* 3. REPLACEMENT MODAL */}
            <ActionModal 
                isOpen={isReplacementModalOpen} 
                onClose={() => setIsReplacementModalOpen(false)} 
                title="Issue Replacement Certificate"
                subtitle={`Supersedes original validation ID ${replacementForm.originalValidationId}`}
            >
                <form onSubmit={handleReplacementSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Corrected Full Name</label>
                            <input 
                                type="text" 
                                required 
                                value={replacementForm.recipientName} 
                                onChange={(e) => setReplacementForm({...replacementForm, recipientName: e.target.value})} 
                                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`} 
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Recipient Email</label>
                            <input 
                                type="email" 
                                required 
                                value={replacementForm.recipientEmail} 
                                onChange={(e) => setReplacementForm({...replacementForm, recipientEmail: e.target.value})} 
                                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">Reason for Replacement</label>
                        <input 
                            type="text" 
                            required 
                            value={replacementForm.reason} 
                            onChange={(e) => setReplacementForm({...replacementForm, reason: e.target.value})} 
                            className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`} 
                            placeholder="e.g. Typo correction on recipient name" 
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsReplacementModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 font-bold">Cancel</button>
                        <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md">
                            {actionLoading ? 'Issuing...' : 'Issue Replacement'}
                        </button>
                    </div>
                </form>
            </ActionModal>

            {/* 4. BULK ISSUANCE MODAL (2-STEP) */}
            <ActionModal 
                isOpen={isBulkModalOpen} 
                onClose={() => setIsBulkModalOpen(false)} 
                title="Batch Certificate Issuance Engine"
                subtitle="Issue multiple certificates simultaneously with safety validation."
                maxWidth="max-w-2xl"
            >
                {bulkStep === 1 ? (
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">
                                Recipient Batch List (Format: Name, Email, Event Title, Type)
                            </label>
                            <textarea 
                                rows="6" 
                                value={bulkText} 
                                onChange={(e) => setBulkText(e.target.value)} 
                                className="w-full bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-indigo-500"
                                placeholder="Alex Johnson, alex@example.com, Global AI Summit 2026, Winner"
                            ></textarea>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">
                                Default Design Template
                            </label>
                            <select 
                                value={bulkTemplate} 
                                onChange={(e) => setBulkTemplate(e.target.value)} 
                                className={`w-full rounded-xl px-3 py-2 text-xs font-bold border ${theme.inputBg}`}
                            >
                                <option value="Winner Certificate">Winner Certificate</option>
                                <option value="Runner-up Certificate">Runner-up Certificate</option>
                                <option value="Participant Certificate">Participant Certificate</option>
                                <option value="Mentor Certificate">Mentor Certificate</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 text-xs text-slate-500 font-bold">Cancel</button>
                            <button 
                                onClick={handleBulkPreview} 
                                disabled={actionLoading}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md"
                            >
                                {actionLoading ? 'Validating...' : 'Step 1: Preview Batch'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                                <p className="text-2xl font-black text-emerald-600">{bulkPreviewData?.readyCount || 0}</p>
                                <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Ready to Issue</p>
                            </div>
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                                <p className="text-2xl font-black text-rose-600">{bulkPreviewData?.blockedCount || 0}</p>
                                <p className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400">Blocked / Duplicates</p>
                            </div>
                        </div>

                        {bulkPreviewData?.blockedDetails && bulkPreviewData.blockedDetails.length > 0 && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl max-h-32 overflow-y-auto text-xs text-rose-700 dark:text-rose-300">
                                <p className="font-bold mb-1">Blocked Records:</p>
                                {bulkPreviewData.blockedDetails.map((b, idx) => (
                                    <p key={idx} className="text-[11px]">⚠️ {b.recipient?.name || 'Unknown'}: {b.reason}</p>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                            <button onClick={() => setBulkStep(1)} className="px-4 py-2 text-xs text-slate-500 font-bold">← Back to Edit</button>
                            <button 
                                onClick={handleBulkConfirm} 
                                disabled={actionLoading || bulkPreviewData?.readyCount === 0}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md"
                            >
                                {actionLoading ? 'Issuing...' : `Step 2: Confirm & Issue ${bulkPreviewData?.readyCount || 0} Certificates`}
                            </button>
                        </div>
                    </div>
                )}
            </ActionModal>

            {/* 5. TEMPLATES MODAL */}
            <ActionModal 
                isOpen={isTemplatesModalOpen} 
                onClose={() => setIsTemplatesModalOpen(false)} 
                title="Certificate Design Templates"
                subtitle="Configured visual themes for hackathon achievements."
                maxWidth="max-w-xl"
            >
                <div className="space-y-3">
                    {[
                        { title: "Winner Certificate", type: "Winner", color: "text-amber-500", desc: "Gold seal visual with achievement honorarium header." },
                        { title: "Runner-up Certificate", type: "Runner Up", color: "text-purple-500", desc: "Silver-purple tier certificate with distinguished rank notation." },
                        { title: "Participant Certificate", type: "Participant", color: "text-sky-500", desc: "Standard hackathon participation and solution submission proof." },
                        { title: "Mentor Certificate", type: "Mentor", color: "text-teal-500", desc: "Special recognition for team guidance and technical mentorship." }
                    ].map((tmpl, idx) => (
                        <div key={idx} className={`p-3.5 rounded-xl border flex justify-between items-center text-xs ${theme.innerBg}`}>
                            <div>
                                <h4 className={`font-extrabold ${tmpl.color}`}>{tmpl.title}</h4>
                                <p className="text-slate-600 dark:text-gray-300 text-[11px] mt-0.5">{tmpl.desc}</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10">
                                Active Template
                            </span>
                        </div>
                    ))}
                </div>
            </ActionModal>

        </div>
    );
};

export default Certificates;
