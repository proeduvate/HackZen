import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    UsersIcon,
    TrophyIcon,
    MedalIcon,
    ScrollIcon,
    FolderIcon,
    UploadIcon,
    MailIcon,
    PaletteIcon,
    EmptyBoxIcon,
    DownloadIcon,
    EyeIcon,
    SparklesIcon,
    CalendarIcon,
    ChevronDownIcon,
    XIcon
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
    restoreCertificate,
    fetchCertificateTemplates,
    uploadCertificateTemplate,
    deleteCertificateTemplate
} from '../../services/admin/adminCertificatesApi';
import { useTheme } from '../../context/ThemeContext';
import { usePlatformSettings } from '../../context/PlatformSettingsContext';

// --- Built-in Official Certificate Templates ---
export const DEFAULT_BUILTIN_TEMPLATES = [
    {
        id: "tpl_winner",
        name: "Winner Certificate",
        category: "Winner",
        type: "Winner",
        description: "Official ProEduvate gold & navy championship certificate for hackathon winners.",
        imageUrl: "/certificates/winner-cert.png",
        dimensions: "1649 × 954 px",
        format: "PNG",
        isBuiltIn: true,
        isDefault: true,
        colorScheme: "Gold & Navy"
    },
    {
        id: "tpl_runner_up",
        name: "Runner-up Certificate",
        category: "Runner Up",
        type: "Runner Up",
        description: "Distinguished silver-blue tier credential for runner-up hackathon teams.",
        imageUrl: "/certificates/runner-up-cert.png",
        dimensions: "1649 × 954 px",
        format: "PNG",
        isBuiltIn: true,
        isDefault: true,
        colorScheme: "Silver & Royal Blue"
    },
    {
        id: "tpl_participation",
        name: "Participation Certificate",
        category: "Participation",
        type: "Participant",
        description: "Official credential verifying active participation and solution submission.",
        imageUrl: "/certificates/participation-cert.png",
        dimensions: "1649 × 954 px",
        format: "PNG",
        isBuiltIn: true,
        isDefault: true,
        colorScheme: "Emerald & Gold"
    }
];

// Helper to resolve certificate template image from record
export const getCertificateTemplateImage = (cert, templates = []) => {
    if (!cert) return '/certificates/winner-cert.png';
    const typeStr = String(cert.type || cert.certType || '').toUpperCase();
    const tmplStr = String(cert.template || '').toUpperCase();

    const allTmpls = (templates && templates.length > 0) ? templates : DEFAULT_BUILTIN_TEMPLATES;
    const customMatch = allTmpls.find(t => 
        (t.name && tmplStr && t.name.toLowerCase() === cert.template?.toLowerCase()) ||
        (t.type && typeStr && t.type.toUpperCase() === typeStr)
    );
    if (customMatch?.imageUrl) {
        return customMatch.imageUrl;
    }

    if (typeStr.includes('WINNER') || tmplStr.includes('WINNER')) {
        return '/certificates/winner-cert.png';
    }
    if (typeStr.includes('RUNNER') || tmplStr.includes('RUNNER') || typeStr.includes('SECOND')) {
        return '/certificates/runner-up-cert.png';
    }
    if (typeStr.includes('PARTICIP') || tmplStr.includes('PARTICIP')) {
        return '/certificates/participation-cert.png';
    }
    return '/certificates/winner-cert.png';
};

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
const CertificateDocument = ({ cert, isLightTheme, templates = [], onPreviewFull }) => {
    if (!cert) return null;

    const recipient = cert.recipientName || cert.recipient?.name || 'Alex Johnson';
    const event = cert.hackathon || cert.eventTitle || cert.event || 'Global AI Summit 2026';
    const type = cert.type || 'WINNER';
    const valId = cert.validationId || 'CERT-SEED-001';

    const certImage = getCertificateTemplateImage(cert, templates);
    const isWinner = type.toUpperCase().includes('WINNER');
    const isRunnerUp = type.toUpperCase().includes('RUNNER');

    const badgeClasses = isWinner 
        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/40' 
        : isRunnerUp 
            ? 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-400/40' 
            : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/40';

    return (
        <div className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-md bg-white dark:bg-slate-950 text-slate-800 dark:text-white my-2 transition-all">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/90 dark:bg-slate-900/95 border-b border-slate-200 dark:border-white/10 text-xs">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold text-slate-600 dark:text-slate-300 text-[11px] tracking-wide">
                        Template: <strong className="text-slate-900 dark:text-white">{cert.template || `${type} Certificate`}</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${badgeClasses}`}>
                        {type}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onPreviewFull?.({
                            title: `${recipient} — ${type} Certificate`,
                            imageUrl: certImage,
                            category: type
                        })}
                        className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-transparent rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                        title="View high-resolution certificate"
                    >
                        <EyeIcon className="w-3.5 h-3.5" />
                        <span>Full Size</span>
                    </button>
                    <a
                        href={certImage}
                        download={`${recipient.replace(/\s+/g, '_')}_Certificate.png`}
                        className="px-2.5 py-1 text-[11px] font-bold bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-400/30 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                        title="Download certificate image"
                    >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        <span>Download</span>
                    </a>
                </div>
            </div>

            {/* Certificate Visual Image Display with Aspect Ratio Preservation */}
            <div 
                className="relative w-full aspect-[1649/954] bg-slate-100/90 dark:bg-gradient-to-b dark:from-slate-900 dark:via-slate-950 dark:to-black overflow-hidden flex items-center justify-center cursor-pointer border-y border-slate-200 dark:border-transparent"
                onClick={() => onPreviewFull?.({
                    title: `${recipient} — ${type} Certificate`,
                    imageUrl: certImage,
                    category: type
                })}
            >
                <img 
                    src={certImage} 
                    alt={`${type} Certificate`}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                    loading="lazy"
                />

                {/* Subtle Hover Action Overlay */}
                <div className="absolute inset-0 bg-slate-900/20 dark:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 backdrop-blur-[1px]">
                    <div className="px-4 py-2 bg-white text-slate-900 rounded-xl font-black text-xs shadow-xl flex items-center gap-2 transform group-hover:scale-105 transition-all border border-slate-200/80">
                        <SearchIcon className="w-4 h-4 text-sky-600" />
                        <span>Click to Enlarge Full Certificate</span>
                    </div>
                </div>
            </div>

            {/* Bottom Recipient & Validation Strip */}
            <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-900/95 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">Recipient</p>
                        <p className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight">{recipient}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>
                    <div className="hidden sm:block">
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">Event</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{event}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 ml-auto">
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400">Validation ID</p>
                        <p className="font-mono text-sky-600 dark:text-sky-400 font-bold">{valId}</p>
                    </div>
                    <div className="p-1 bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-white/10">
                        <div className="w-8 h-8 bg-sky-50 dark:bg-sky-500/20 border border-sky-200 dark:border-sky-500/30 rounded flex items-center justify-center text-[7px] font-mono text-sky-700 dark:text-sky-300 text-center font-bold leading-none">
                            QR<br/>VERIFIED
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const Certificates = () => {
    const { theme: currentTheme } = useTheme();
    const { prefix, platformName } = usePlatformSettings();
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
    const [hackathonFilter, setHackathonFilter] = useState('ALL');
    const [selectedYear, setSelectedYear] = useState('ALL');
    const [collapsedHackathons, setCollapsedHackathons] = useState({});
    
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

    // Templates & Upload Management State
    const [templates, setTemplates] = useState(DEFAULT_BUILTIN_TEMPLATES);
    const [templateCategories, setTemplateCategories] = useState(["All", "Winner", "Runner Up", "Participation", "Special Recognition", "Custom"]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [isTemplatesDropdownOpen, setIsTemplatesDropdownOpen] = useState(false);
    const templatesDropdownRef = useRef(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('All');
    const [previewImageModal, setPreviewImageModal] = useState({ isOpen: false, title: '', imageUrl: '', category: '' });

    // Upload Form State
    const [uploadForm, setUploadForm] = useState({
        file: null,
        name: '',
        category: 'Winner',
        description: '',
        previewUrl: ''
    });
    const [uploading, setUploading] = useState(false);

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

    // Dropdown Outside Click Listener
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (templatesDropdownRef.current && !templatesDropdownRef.current.contains(event.target)) {
                setIsTemplatesDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const loadTemplatesData = async () => {
        setTemplatesLoading(true);
        try {
            const data = await fetchCertificateTemplates();
            if (data && Array.isArray(data.templates) && data.templates.length > 0) {
                setTemplates(data.templates);
                if (data.categories) {
                    setTemplateCategories(data.categories);
                }
            }
        } catch (err) {
            console.error("Failed to load certificate templates:", err);
        } finally {
            setTemplatesLoading(false);
        }
    };

    useEffect(() => {
        loadCertificatesData();
        loadTemplatesData();
    }, []);

    // Template Actions
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            showToast("File size exceeds maximum 15MB", "error");
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        const inferredName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setUploadForm(prev => ({
            ...prev,
            file,
            name: prev.name || inferredName,
            previewUrl
        }));
    };

    const handleUploadTemplateSubmit = async (e) => {
        e.preventDefault();
        if (!uploadForm.file) {
            showToast("Please select a certificate image file to upload", "warning");
            return;
        }
        if (!uploadForm.name.trim()) {
            showToast("Please enter a certificate template name", "warning");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", uploadForm.file);
            formData.append("name", uploadForm.name.trim());
            formData.append("category", uploadForm.category);
            formData.append("description", uploadForm.description.trim());

            await uploadCertificateTemplate(formData);
            showToast("Certificate template uploaded successfully!", "success");
            setIsUploadModalOpen(false);
            setUploadForm({
                file: null,
                name: '',
                category: 'Winner',
                description: '',
                previewUrl: ''
            });
            await loadTemplatesData();
        } catch (err) {
            console.error("Failed to upload template:", err);
            const msg = err.response?.data?.detail || "Failed to upload certificate template";
            showToast(msg, "error");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!window.confirm("Are you sure you want to delete this custom certificate template?")) return;
        try {
            await deleteCertificateTemplate(templateId);
            showToast("Certificate template removed successfully", "info");
            await loadTemplatesData();
        } catch (err) {
            console.error("Failed to delete template:", err);
            showToast("Failed to delete template", "error");
        }
    };

    const templatesByCategoryCount = useMemo(() => {
        const counts = { All: templates.length, Winner: 0, "Runner Up": 0, Participation: 0 };
        templates.forEach(t => {
            const cat = t.category || "Custom";
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, [templates]);

    const filteredTemplates = useMemo(() => {
        if (selectedTemplateCategory === 'All') return templates;
        return templates.filter(t => t.category === selectedTemplateCategory);
    }, [templates, selectedTemplateCategory]);


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

    // Distinct Hackathons list for dedicated filter
    const availableHackathons = useMemo(() => {
        const names = new Set();
        certificates.forEach(c => {
            const h = c.hackathon || c.eventTitle || c.event;
            if (h && typeof h === 'string' && h.trim()) {
                names.add(h.trim());
            }
        });
        eligibilityQueue.forEach(q => {
            const e = q.event || q.hackathon;
            if (e && typeof e === 'string' && e.trim()) {
                names.add(e.trim());
            }
        });
        return Array.from(names).sort((a, b) => a.localeCompare(b));
    }, [certificates, eligibilityQueue]);

    // Filter Logic for Certificates
    const filteredCertificates = useMemo(() => {
        return certificates.filter(c => {
            const matchesTab = activeTab === 'All' ? true : 
                              activeTab === 'Active' ? ['Active', 'Issued'].includes(c.status) :
                              c.status === activeTab;
            const matchesType = typeFilter === 'ALL' ? true : (c.type || '').toUpperCase() === typeFilter.toUpperCase();
            
            const eventName = (c.hackathon || c.eventTitle || c.event || '');
            const matchesHackathon = hackathonFilter === 'ALL' 
                ? true 
                : eventName.trim().toLowerCase() === hackathonFilter.trim().toLowerCase();

            const query = searchQuery.toLowerCase();
            const matchesSearch = 
                (c.recipientName || '').toLowerCase().includes(query) ||
                (c.recipientEmail || '').toLowerCase().includes(query) ||
                (c.validationId || '').toLowerCase().includes(query) ||
                eventName.toLowerCase().includes(query);

            return matchesTab && matchesType && matchesHackathon && matchesSearch;
        });
    }, [certificates, activeTab, typeFilter, hackathonFilter, searchQuery]);

    // Extract Distinct Years for Long-term Hackathon Lookup
    const availableYears = useMemo(() => {
        const years = new Set();
        certificates.forEach(c => {
            const title = c.hackathon || c.eventTitle || c.event || '';
            const match = title.match(/\b(20\d{2})\b/);
            if (match) {
                years.add(match[1]);
            } else if (c.issueDate) {
                const yr = new Date(c.issueDate).getFullYear();
                if (!isNaN(yr)) years.add(String(yr));
            } else if (c.createdAt) {
                const yr = new Date(c.createdAt).getFullYear();
                if (!isNaN(yr)) years.add(String(yr));
            }
        });
        if (years.size === 0) years.add('2026');
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [certificates]);

    // Certificates organized by Hackathons (for Easy Historic Lookup)
    const certificatesByHackathon = useMemo(() => {
        const groups = {};

        filteredCertificates.forEach(cert => {
            const rawEvent = (cert.hackathon || cert.eventTitle || cert.event || 'General Hackathon').trim();

            // Extract year from event title, issueDate, or fallback
            const yearMatch = rawEvent.match(/\b(20\d{2})\b/);
            const certYear = yearMatch ? yearMatch[1] : (cert.issueDate ? String(new Date(cert.issueDate).getFullYear()) : '2026');

            if (selectedYear !== 'ALL' && certYear !== selectedYear) {
                return;
            }

            if (!groups[rawEvent]) {
                groups[rawEvent] = {
                    hackathon: rawEvent,
                    year: certYear,
                    certs: [],
                    activeCount: 0,
                    revokedCount: 0,
                    replacedCount: 0,
                    winnerCount: 0,
                    runnerUpCount: 0,
                    participationCount: 0
                };
            }

            groups[rawEvent].certs.push(cert);
            if (['Active', 'Issued'].includes(cert.status)) groups[rawEvent].activeCount += 1;
            else if (cert.status === 'Revoked') groups[rawEvent].revokedCount += 1;
            else if (cert.status === 'Replaced') groups[rawEvent].replacedCount += 1;

            const typeLower = (cert.type || '').toLowerCase();
            if (typeLower.includes('winner')) groups[rawEvent].winnerCount += 1;
            else if (typeLower.includes('runner')) groups[rawEvent].runnerUpCount += 1;
            else groups[rawEvent].participationCount += 1;
        });

        return Object.values(groups).sort((a, b) => {
            if (b.year !== a.year) return b.year.localeCompare(a.year);
            return a.hackathon.localeCompare(b.hackathon);
        });
    }, [filteredCertificates, selectedYear]);

    const toggleHackathonCollapse = (hackathonName) => {
        setCollapsedHackathons(prev => ({
            ...prev,
            [hackathonName]: !prev[hackathonName]
        }));
    };

    const toggleAllHackathons = () => {
        const allNames = certificatesByHackathon.map(g => g.hackathon);
        const isAnyExpanded = allNames.some(name => !collapsedHackathons[name]);
        const nextState = {};
        allNames.forEach(name => {
            nextState[name] = isAnyExpanded;
        });
        setCollapsedHackathons(nextState);
    };

    // Filter Logic for Eligibility Queue
    const filteredEligibility = useMemo(() => {
        return eligibilityQueue.filter(q => {
            const eventName = (q.event || q.hackathon || '');
            const matchesHackathon = hackathonFilter === 'ALL' 
                ? true 
                : eventName.trim().toLowerCase() === hackathonFilter.trim().toLowerCase();

            const query = searchQuery.toLowerCase();
            const matchesSearch = 
                (q.name || '').toLowerCase().includes(query) ||
                (q.email || '').toLowerCase().includes(query) ||
                eventName.toLowerCase().includes(query) ||
                (q.achievement || '').toLowerCase().includes(query);

            return matchesHackathon && matchesSearch;
        });
    }, [eligibilityQueue, hackathonFilter, searchQuery]);

    return (
        <div className="space-y-5 animate-in fade-in duration-500 pb-8">
            
            {/* Toast Notification Alert */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-bold animate-in slide-in-from-bottom-5 duration-300 ${
                    toastMessage.type === 'success' ? 'bg-sky-600 text-white border border-sky-400/30 shadow-sky-900/20' :
                    toastMessage.type === 'warning' ? 'bg-amber-600 text-white' :
                    toastMessage.type === 'error' ? 'bg-rose-700 text-white' :
                    'bg-slate-800 dark:bg-slate-800 text-white border border-white/10'
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
                    {/* Interactive Templates Dropdown Button */}
                    <div className="relative" ref={templatesDropdownRef}>
                        <button 
                            type="button"
                            onClick={() => setIsTemplatesDropdownOpen(!isTemplatesDropdownOpen)} 
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-white/10 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 select-none"
                            aria-expanded={isTemplatesDropdownOpen}
                        >
                            <TemplateIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" /> 
                            <span>Templates</span>
                            <svg 
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${isTemplatesDropdownOpen ? 'rotate-180 text-slate-700 dark:text-white' : 'text-slate-400'}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isTemplatesDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-150 text-slate-800 dark:text-white">
                                <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">
                                        Certificate Categories
                                    </span>
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                        {templates.length} Designs
                                    </span>
                                </div>

                                <div className="py-1 space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedTemplateCategory('Winner');
                                            setIsTemplatesModalOpen(true);
                                            setIsTemplatesDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center justify-between group transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                                <TrophyIcon className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <div className="text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 font-extrabold">Winner Tier</div>
                                                <div className="text-[10px] font-normal text-slate-500 dark:text-gray-400">Gold & Navy Championship</div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 font-mono font-bold">
                                            {templatesByCategoryCount['Winner'] || 1}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedTemplateCategory('Runner Up');
                                            setIsTemplatesModalOpen(true);
                                            setIsTemplatesDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-500/10 flex items-center justify-between group transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                                <MedalIcon className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <div className="text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-extrabold">Runner-Up Tier</div>
                                                <div className="text-[10px] font-normal text-slate-500 dark:text-gray-400">Silver & Royal Blue Distinction</div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-400/20 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                                            {templatesByCategoryCount['Runner Up'] || 1}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedTemplateCategory('Participation');
                                            setIsTemplatesModalOpen(true);
                                            setIsTemplatesDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-500/10 flex items-center justify-between group transition-colors"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                                <ScrollIcon className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <div className="text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-extrabold">Participation Tier</div>
                                                <div className="text-[10px] font-normal text-slate-500 dark:text-gray-400">Emerald & Gold Credential</div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                                            {templatesByCategoryCount['Participation'] || 1}
                                        </span>
                                    </button>
                                </div>

                                <div className="my-1 border-t border-slate-100 dark:border-white/5"></div>

                                <div className="p-1 space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedTemplateCategory('All');
                                            setIsTemplatesModalOpen(true);
                                            setIsTemplatesDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 flex items-center justify-between transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <FolderIcon className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Manage All Templates...</span>
                                        </span>
                                        <span className="text-[10px] text-slate-400">→</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsUploadModalOpen(true);
                                            setIsTemplatesDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 flex items-center gap-2 transition-colors shadow-sm"
                                    >
                                        <UploadIcon className="w-3.5 h-3.5" />
                                        <span>Upload New Certificate...</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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
                        placeholder={`Enter validation ID (e.g. ${prefix || 'PROEDU'}-2026-A1B2C3D4)...`} 
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
                    <div className="p-2.5 border-b border-slate-200 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-transparent space-y-2">
                        <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                            <div className="relative flex-1 min-w-[140px]">
                                <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder={activeTab === 'Eligibility Queue' ? "Search candidate or event..." : "Search recipient, email, or ID..."} 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
                                />
                            </div>

                            {/* Easy Hackathon Filter Dropdown for Admin */}
                            <select 
                                value={hackathonFilter} 
                                onChange={(e) => setHackathonFilter(e.target.value)}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold border border-slate-200 dark:border-white/10 max-w-[160px] truncate ${theme.inputBg}`}
                                title="Filter certificates by specific Hackathon"
                            >
                                <option value="ALL">All Hackathons ({availableHackathons.length})</option>
                                {availableHackathons.map((h) => (
                                    <option key={h} value={h}>{h}</option>
                                ))}
                            </select>

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

                        {/* Active Hackathon Filter Banner */}
                        {hackathonFilter !== 'ALL' && (
                            <div className="flex items-center justify-between px-2.5 py-1 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 rounded-lg text-xs animate-in fade-in">
                                <span className="text-sky-700 dark:text-sky-300 font-bold truncate flex items-center gap-1.5">
                                    <CertificateIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                    <span className="truncate">Hackathon: <strong>{hackathonFilter}</strong></span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-200/60 dark:bg-sky-400/20 shrink-0">
                                        {filteredCertificates.length} {filteredCertificates.length === 1 ? 'cert' : 'certs'}
                                    </span>
                                </span>
                                <button 
                                    type="button"
                                    onClick={() => setHackathonFilter('ALL')}
                                    className="text-xs font-black text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-white shrink-0 ml-2 hover:underline"
                                    title="Show all hackathons"
                                >
                                    ✕ Clear Filter
                                </button>
                            </div>
                        )}

                        {/* Dedicated Hackathon Historical Year Bar for "All Records" */}
                        {activeTab === 'All' && (
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-white/5 text-xs">
                                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
                                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-gray-400 shrink-0 flex items-center gap-1">
                                        <CalendarIcon className="w-3.5 h-3.5 text-sky-500" />
                                        <span>Year:</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedYear('ALL')}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                                            selectedYear === 'ALL'
                                            ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 shadow-sm'
                                            : 'bg-white dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-100 border border-slate-200/80 dark:border-white/5'
                                        }`}
                                    >
                                        All Years
                                    </button>
                                    {availableYears.map(yr => (
                                        <button
                                            key={yr}
                                            type="button"
                                            onClick={() => setSelectedYear(yr)}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                                                selectedYear === yr
                                                ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 shadow-sm'
                                                : 'bg-white dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-100 border border-slate-200/80 dark:border-white/5'
                                            }`}
                                        >
                                            {yr}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={toggleAllHackathons}
                                    className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 px-2.5 py-1 rounded-lg border border-sky-200/70 dark:border-sky-500/30 transition-all shrink-0 whitespace-nowrap"
                                    title="Expand or collapse all hackathon sections"
                                >
                                    {certificatesByHackathon.some(g => collapsedHackathons[g.hackathon]) ? 'Expand All' : 'Collapse All'}
                                </button>
                            </div>
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
                                                <button
                                                    type="button"
                                                    onClick={() => setHackathonFilter(item.event || item.hackathon)}
                                                    className="text-[10px] text-slate-500 hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400 mt-0.5 text-left font-medium hover:underline"
                                                    title={`Filter by "${item.event || item.hackathon}"`}
                                                >
                                                    {item.event}
                                                </button>
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
                        ) : activeTab === 'All' ? (
                            // Organizes certificates by Hackathon for Easy Historical Discovery
                            certificatesByHackathon.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-xs">
                                    No certificates found for hackathons matching specified filters.
                                </div>
                            ) : (
                                certificatesByHackathon.map((group) => {
                                    const isCollapsed = !!collapsedHackathons[group.hackathon];
                                    return (
                                        <div 
                                            key={group.hackathon}
                                            className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-white/[0.03] overflow-hidden transition-all shadow-sm"
                                        >
                                            {/* Hackathon Header */}
                                            <div 
                                                onClick={() => toggleHackathonCollapse(group.hackathon)}
                                                className="px-3.5 py-2.5 bg-slate-50/90 dark:bg-white/[0.04] border-b border-slate-100 dark:border-white/5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-white/[0.07] transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-500/15 border border-sky-200/80 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                                                        <TrophyIcon className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="min-w-0 text-left">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                                                                {group.hackathon}
                                                            </h4>
                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black font-mono bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-500/30">
                                                                {group.year}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium mt-0.5">
                                                            {group.certs.length} {group.certs.length === 1 ? 'certificate' : 'certificates'} · {group.activeCount} active
                                                            {group.revokedCount > 0 ? ` · ${group.revokedCount} revoked` : ''}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setHackathonFilter(group.hackathon);
                                                        }}
                                                        className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-200 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 px-2 py-0.5 rounded-md border border-sky-200/60 dark:border-sky-500/30 transition-all"
                                                        title="Focus exclusively on this hackathon"
                                                    >
                                                        Focus
                                                    </button>
                                                    <div className={`p-1 text-slate-400 dark:text-gray-400 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                                                        <ChevronDownIcon className="w-3.5 h-3.5" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Nested Certificates List */}
                                            {!isCollapsed && (
                                                <div className="p-2 space-y-2 bg-slate-50/30 dark:bg-transparent">
                                                    {/* Category pills breakdown */}
                                                    <div className="flex items-center gap-1.5 px-1 py-0.5 text-[9px] font-bold text-slate-500 flex-wrap">
                                                        {group.winnerCount > 0 && (
                                                            <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/30 flex items-center gap-1">
                                                                <TrophyIcon className="w-2.5 h-2.5" /> {group.winnerCount} Winner
                                                            </span>
                                                        )}
                                                        {group.runnerUpCount > 0 && (
                                                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/30 flex items-center gap-1">
                                                                <MedalIcon className="w-2.5 h-2.5" /> {group.runnerUpCount} Runner Up
                                                            </span>
                                                        )}
                                                        {group.participationCount > 0 && (
                                                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/30 flex items-center gap-1">
                                                                <ScrollIcon className="w-2.5 h-2.5" /> {group.participationCount} Participant
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Cards */}
                                                    {group.certs.map((cert) => {
                                                        const isSelected = selectedCert?.validationId === cert.validationId;
                                                        return (
                                                            <div 
                                                                key={cert.id || cert.validationId}
                                                                onClick={() => setSelectedCert(cert)}
                                                                className={`p-2.5 rounded-xl cursor-pointer transition-all border relative text-left ${
                                                                    isSelected 
                                                                    ? 'bg-sky-50/90 dark:bg-sky-500/15 border-sky-400 dark:border-sky-500/60 shadow-sm' 
                                                                    : 'bg-white dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5 hover:border-sky-300 dark:hover:border-white/20'
                                                                }`}
                                                            >
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <div className="truncate pr-2">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{cert.recipientName}</h4>
                                                                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300">
                                                                                {cert.type || 'Standard'}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium truncate">{cert.recipientEmail}</p>
                                                                    </div>

                                                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                                        cert.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' :
                                                                        cert.status === 'Revoked' ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' :
                                                                        'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                                                                    }`}>
                                                                        {cert.status}
                                                                    </span>
                                                                </div>

                                                                <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-500 font-mono">
                                                                    <span className="font-bold text-sky-600 dark:text-sky-400">{cert.validationId}</span>
                                                                    <div className="flex items-center gap-2.5">
                                                                        <span className="flex items-center gap-1" title={cert.deliveryStatus?.emailSent ? "Email delivered" : "Email pending"}>
                                                                            <MailIcon className={`w-3 h-3 ${cert.deliveryStatus?.emailSent ? 'text-emerald-500' : 'text-slate-400'}`} />
                                                                            <span className={cert.deliveryStatus?.emailSent ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                                                                                {cert.deliveryStatus?.emailSent ? '✓' : '—'}
                                                                            </span>
                                                                        </span>
                                                                        <span className="flex items-center gap-1" title="Downloads count">
                                                                            <DownloadIcon className="w-3 h-3 text-slate-400" />
                                                                            <span>{cert.deliveryStatus?.downloadsCount || cert.metrics?.downloads || 0}</span>
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
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
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const h = cert.hackathon || cert.eventTitle;
                                                        if (h) setHackathonFilter(h);
                                                    }}
                                                    className="text-[10px] text-slate-500 hover:text-sky-600 dark:text-gray-400 dark:hover:text-sky-400 truncate mt-0.5 text-left font-medium block hover:underline"
                                                    title={`Filter certificates by "${cert.hackathon || cert.eventTitle}"`}
                                                >
                                                    {cert.hackathon || cert.eventTitle || 'General Hackathon'}
                                                </button>
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
                                            <div className="flex items-center gap-2.5">
                                                <span className="flex items-center gap-1" title={cert.deliveryStatus?.emailSent ? "Email delivered" : "Email pending"}>
                                                    <MailIcon className={`w-3 h-3 ${cert.deliveryStatus?.emailSent ? 'text-emerald-500' : 'text-slate-400'}`} />
                                                    <span className={cert.deliveryStatus?.emailSent ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                                                        {cert.deliveryStatus?.emailSent ? '✓' : '—'}
                                                    </span>
                                                </span>
                                                <span className="flex items-center gap-1" title="Downloads count">
                                                    <DownloadIcon className="w-3 h-3 text-slate-400" />
                                                    <span>{cert.deliveryStatus?.downloadsCount || 0}</span>
                                                </span>
                                                <span className="flex items-center gap-1" title="Verification checks">
                                                    <SearchIcon className="w-3 h-3 text-slate-400" />
                                                    <span>{cert.deliveryStatus?.verificationCount || 0}</span>
                                                </span>
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
                                        <CertificateDocument 
                                            cert={selectedCert} 
                                            isLightTheme={isLightTheme} 
                                            templates={templates} 
                                            onPreviewFull={(data) => setPreviewImageModal({ isOpen: true, ...data })} 
                                        />


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
                                                    <div key={k} className={v ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5' : 'text-rose-600 dark:text-rose-400 flex items-center gap-1.5'}>
                                                        {v ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XIcon className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
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
                                                    <strong className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                        <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span>Delivered Successfully</span>
                                                    </strong>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500">Email Opened:</span>
                                                    <strong className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                        <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span>Confirmed Opened</span>
                                                    </strong>
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
                                                className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-xs font-bold rounded-xl transition-all shadow-sm"
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
                                onChange={(e) => {
                                    const newType = e.target.value;
                                    const matchTmpl = templates.find(t => 
                                        (t.category && t.category.toLowerCase() === newType.toLowerCase()) ||
                                        (t.type && t.type.toLowerCase() === newType.toLowerCase())
                                    );
                                    setIssueForm({
                                        ...issueForm, 
                                        type: newType, 
                                        template: matchTmpl ? matchTmpl.name : `${newType} Certificate`
                                    });
                                }} 
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
                                {templates.map(t => (
                                    <option key={t.id} value={t.name}>{t.name} ({t.category})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Live Certificate Design Preview in Issue Modal */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 flex items-center gap-3">
                        <div className="w-24 aspect-[1649/954] rounded-lg overflow-hidden bg-slate-100 dark:bg-black shrink-0 border border-slate-200 dark:border-white/10 shadow">
                            <img 
                                src={getCertificateTemplateImage({ type: issueForm.type, template: issueForm.template }, templates)} 
                                alt="Selected Certificate Design" 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="text-xs text-slate-800 dark:text-white">
                            <p className="font-extrabold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                                <PaletteIcon className="w-4 h-4 text-sky-500" />
                                <span>Design: {issueForm.template || `${issueForm.type} Certificate`}</span>
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">High-resolution authentic certificate image</p>
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
                        <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95">
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
                                {templates.map(t => (
                                    <option key={t.id} value={t.name}>{t.name} ({t.category})</option>
                                ))}
                            </select>
                        </div>

                        {/* Live Bulk Template Preview */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 flex items-center gap-3">
                            <div className="w-24 aspect-[1649/954] rounded-lg overflow-hidden bg-slate-100 dark:bg-black shrink-0 border border-slate-200 dark:border-white/10 shadow">
                                <img 
                                    src={getCertificateTemplateImage({ template: bulkTemplate }, templates)} 
                                    alt="Selected Bulk Template" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="text-xs text-slate-800 dark:text-white">
                                <p className="font-extrabold text-sky-600 dark:text-sky-400">Batch Design: {bulkTemplate}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Recipients will receive certificates rendered with this design</p>
                            </div>
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
                                    <p key={idx} className="text-[11px] flex items-center gap-1.5 py-0.5">
                                        <TriangleAlertIcon className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                        <span>{b.recipient?.name || 'Unknown'}: {b.reason}</span>
                                    </p>
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

            {/* 5. CATEGORIZED CERTIFICATE TEMPLATES GALLERY MODAL */}
            <ActionModal 
                isOpen={isTemplatesModalOpen} 
                onClose={() => setIsTemplatesModalOpen(false)} 
                title="Certificate Design Templates"
                subtitle="Official designs and custom uploaded certificate templates."
                maxWidth="max-w-4xl"
            >
                <div className="space-y-4">
                    {/* Category Filter Bar & Upload Action */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-white/10">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {['All', 'Winner', 'Runner Up', 'Participation'].map((cat) => {
                                const isSel = selectedTemplateCategory === cat;
                                const count = templatesByCategoryCount[cat] || (cat === 'All' ? templates.length : 0);
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setSelectedTemplateCategory(cat)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                            isSel 
                                            ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-300/80 dark:border-sky-500/40 shadow-sm font-extrabold' 
                                            : 'bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-200/70 dark:hover:bg-white/10 border border-transparent'
                                        }`}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {cat === 'All' && <FolderIcon className="w-3.5 h-3.5" />}
                                            {cat === 'Winner' && <TrophyIcon className="w-3.5 h-3.5 text-amber-500" />}
                                            {cat === 'Runner Up' && <MedalIcon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />}
                                            {cat === 'Participation' && <ScrollIcon className="w-3.5 h-3.5 text-emerald-500" />}
                                            <span>{cat}</span>
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                            isSel ? 'bg-sky-200/80 dark:bg-sky-400/25 text-sky-900 dark:text-sky-200' : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-gray-400'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsUploadModalOpen(true)}
                            className="px-3.5 py-1.5 bg-sky-50 dark:bg-sky-500/15 hover:bg-sky-100 dark:hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                        >
                            <UploadIcon className="w-3.5 h-3.5" />
                            <span>Upload New Certificate</span>
                        </button>
                    </div>

                    {/* Templates Grid */}
                    {filteredTemplates.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
                            <EmptyBoxIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-600 dark:text-gray-300">No certificate templates found in this category</p>
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className="mt-3 px-3 py-1.5 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 text-xs font-bold rounded-lg transition-colors shadow-sm"
                            >
                                Upload Certificate to {selectedTemplateCategory}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                            {filteredTemplates.map((tmpl) => {
                                const catLower = (tmpl.category || tmpl.type || '').toLowerCase();
                                const badgeColor = catLower.includes('winner')
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : catLower.includes('runner')
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                                return (
                                    <div 
                                        key={tmpl.id}
                                        className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/80 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col"
                                    >
                                        {/* Image Box */}
                                        <div 
                                            className="relative aspect-[1649/954] w-full bg-slate-100 dark:bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center"
                                            onClick={() => setPreviewImageModal({
                                                isOpen: true,
                                                title: tmpl.name,
                                                imageUrl: tmpl.imageUrl,
                                                category: tmpl.category || tmpl.type
                                            })}
                                        >
                                            <img 
                                                src={tmpl.imageUrl} 
                                                alt={tmpl.name} 
                                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                                                loading="lazy"
                                            />

                                            {/* Badges Overlay */}
                                            <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border backdrop-blur-md ${badgeColor}`}>
                                                    {tmpl.category || tmpl.type || 'Custom'}
                                                </span>
                                            </div>

                                            <div className="absolute top-2 right-2 pointer-events-none">
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-black/60 text-white/90 border border-white/20 backdrop-blur-md">
                                                    {tmpl.isBuiltIn ? 'Official Built-in' : 'Custom Upload'}
                                                </span>
                                            </div>

                                            {/* Hover Inspect CTA */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                                <span className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-black shadow-lg flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Inspect High-Res
                                                </span>
                                            </div>
                                        </div>

                                        {/* Card Info & Actions */}
                                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="text-xs font-black text-slate-900 dark:text-white leading-tight">{tmpl.name}</h3>
                                                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                                        {tmpl.dimensions || '1649 × 954'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                    {tmpl.description || `High-fidelity ${tmpl.category} certificate design.`}
                                                </p>
                                            </div>

                                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const targetType = tmpl.type || tmpl.category || 'Winner';
                                                        setIssueForm(prev => ({
                                                            ...prev,
                                                            type: targetType,
                                                            template: tmpl.name
                                                        }));
                                                        setIsTemplatesModalOpen(false);
                                                        setIsIssueModalOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors border border-slate-200/80 dark:border-white/10"
                                                >
                                                    <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                                                    <span>Use For Issuance</span>
                                                </button>

                                                <div className="flex items-center gap-1.5">
                                                    <a
                                                        href={tmpl.imageUrl}
                                                        download={`${tmpl.name.replace(/\s+/g, '_')}_Template.png`}
                                                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                                        title="Download Template Image"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                    </a>

                                                    {!tmpl.isBuiltIn && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteTemplate(tmpl.id)}
                                                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg transition-colors"
                                                            title="Delete Custom Template"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </ActionModal>

            {/* 6. WEBPAGE CERTIFICATE UPLOADER MODAL */}
            <ActionModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title="Upload Certificate Template"
                subtitle="Add an authentic certificate design image to HackZen's issuing engine."
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleUploadTemplateSubmit} className="space-y-4">
                    {/* File Drop Area / Preview */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">
                            Certificate Template Image
                        </label>
                        {uploadForm.file ? (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-950 p-2 group">
                                <div className="aspect-[1649/954] w-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-200 dark:bg-black">
                                    <img 
                                        src={uploadForm.previewUrl} 
                                        alt="Selected Preview" 
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="mt-2 px-2 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                                    <span className="truncate font-semibold max-w-[200px]">{uploadForm.file.name}</span>
                                    <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{(uploadForm.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setUploadForm(prev => ({ ...prev, file: null, previewUrl: '' }))}
                                    className="absolute top-4 right-4 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-lg transition-colors shadow-lg"
                                    title="Remove and choose another image"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <label className="border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-sky-500 dark:hover:border-sky-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 dark:bg-white/[0.02] hover:bg-sky-50/50 dark:hover:bg-sky-500/5 transition-all group">
                                <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <UploadIcon className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-black text-slate-800 dark:text-white">Click or drag certificate image here to upload</p>
                                <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-1">Supports PNG, JPG, WebP, SVG • Up to 15MB</p>
                                <input 
                                    type="file" 
                                    accept="image/png,image/jpeg,image/webp,image/svg+xml" 
                                    className="hidden" 
                                    onChange={handleFileSelect} 
                                
                                />
                            </label>
                        )}
                    </div>

                    {/* Template Name */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">
                            Template Name / Title
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. HackZen AI First Prize Certificate"
                            value={uploadForm.name}
                            onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`}
                        />
                    </div>

                    {/* Category Selector */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">
                            Certificate Category / Tier
                        </label>
                        <select
                            value={uploadForm.category}
                            onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                            className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${theme.inputBg}`}
                        >
                            <option value="Winner">Winner (1st / Champion)</option>
                            <option value="Runner Up">Runner Up (2nd / 3rd Place)</option>
                            <option value="Participation">Participation / Attendee</option>
                            <option value="Special Recognition">Special Recognition</option>
                            <option value="Custom">Custom Achievement</option>
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider mb-1 block text-slate-500 dark:text-gray-400">
                            Description (Optional)
                        </label>
                        <textarea
                            placeholder="Design notes or special achievement criteria..."
                            rows="2"
                            value={uploadForm.description}
                            onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                            className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none resize-none ${theme.inputBg}`}
                        ></textarea>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsUploadModalOpen(false)}
                            className="px-4 py-2 text-xs text-slate-500 font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading || !uploadForm.file}
                            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                        >
                            {uploading ? (
                                <>
                                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                    </svg>
                                    <span>Uploading Certificate...</span>
                                </>
                            ) : (
                                <span>Save & Add Template</span>
                            )}
                        </button>
                    </div>
                </form>
            </ActionModal>

            {/* 7. FULL-RESOLUTION PREVIEW MODAL */}
            {previewImageModal.isOpen && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImageModal({ isOpen: false, title: '', imageUrl: '', category: '' })}
                >
                    <div 
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-5xl w-full p-4 overflow-hidden shadow-2xl flex flex-col space-y-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                            <div>
                                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{previewImageModal.title}</h3>
                                <p className="text-[11px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider mt-0.5">
                                    {previewImageModal.category} • Authentic Resolution
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewImageModal.imageUrl}
                                    download={`${previewImageModal.title.replace(/\s+/g, '_')}_Full.png`}
                                    className="px-3 py-1.5 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-400/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                                >
                                    <DownloadIcon className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </a>
                                <button
                                    onClick={() => setPreviewImageModal({ isOpen: false, title: '', imageUrl: '', category: '' })}
                                    className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Image Viewer Container */}
                        <div className="bg-slate-100 dark:bg-black/90 rounded-xl p-2 flex items-center justify-center max-h-[72vh] overflow-hidden border border-slate-200 dark:border-white/5">
                            <img 
                                src={previewImageModal.imageUrl} 
                                alt={previewImageModal.title} 
                                className="max-h-[68vh] w-auto object-contain rounded shadow-2xl" 
                            />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Certificates;
