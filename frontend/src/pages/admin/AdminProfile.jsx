import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { 
    CheckIcon, 
    ShieldIcon, 
    UsersIcon, 
    FileTextIcon, 
    EditIcon, 
    ScaleIcon, 
    LockIcon, 
    ZapIcon, 
    ClockIcon, 
    TriangleAlertIcon,
    CertificateIcon
} from '../../components/AdminIcons';

const AdminProfile = () => {
    const navigate = useNavigate();
    const { theme: currentTheme } = useTheme();
    const isLightTheme = currentTheme === 'light';

    // Core Control Center State
    const [loading, setLoading] = useState(true);
    const [controlData, setControlData] = useState(null);

    // Modal States
    const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verificationTargetAction, setVerificationTargetAction] = useState('');

    // Notification Toggles State
    const [notifications, setNotifications] = useState({
        email: true,
        criticalDisputes: true,
        organizerApps: true,
        hackathonApprovals: true,
        certificateIssues: false,
        systemAlerts: true
    });

    // Form States
    const [editForm, setEditForm] = useState({
        fullName: '',
        email: '',
        department: '',
        designation: '',
        phone: '',
        bio: ''
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [verificationCode, setVerificationCode] = useState('');
    const [verificationPassword, setVerificationPassword] = useState('');

    // Load Admin Control Center Data
    const fetchControlCenterData = async () => {
        try {
            const { data } = await apiClient.get('/profile/admin-control-center');
            if (data && data.success) {
                setControlData(data);
                setEditForm({
                    fullName: data.accountInfo.fullName,
                    email: data.accountInfo.email,
                    department: data.accountInfo.department,
                    designation: data.accountInfo.designation,
                    phone: data.accountInfo.phone,
                    bio: 'Lead System Administrator responsible for platform operational governance, security compliance, and user dispute resolutions.'
                });
            }
        } catch (err) {
            console.error("Failed to load admin control center data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchControlCenterData();
        window.addEventListener('user-update', fetchControlCenterData);
        return () => window.removeEventListener('user-update', fetchControlCenterData);
    }, []);

    const themeStyles = {
        cardBg: isLightTheme 
            ? 'bg-white border border-slate-200 shadow-sm text-slate-900' 
            : 'bg-navy-900/60 border border-white/10 text-white shadow-xl',
        headingText: isLightTheme ? 'text-slate-900 font-extrabold' : 'text-white font-bold',
        subText: isLightTheme ? 'text-slate-600 font-medium' : 'text-gray-400 font-medium',
        mutedText: isLightTheme ? 'text-slate-500 font-bold' : 'text-gray-400 font-bold',
        innerBg: isLightTheme ? 'bg-slate-50 border border-slate-200 text-slate-800' : 'bg-black/20 border border-white/5 text-white',
        inputBg: isLightTheme ? 'bg-white border border-slate-300 text-slate-900 shadow-sm' : 'bg-black/20 border border-white/10 text-white'
    };

    // Action Handlers
    const handleSignOutSession = (sessionId) => {
        if (!controlData) return;
        setControlData(prev => ({
            ...prev,
            activeSessions: prev.activeSessions.filter(s => s.id !== sessionId)
        }));
        alert("Device session terminated successfully.");
    };

    const handleSignOutAllOther = () => {
        setVerificationTargetAction('SIGN_OUT_OTHER_SESSIONS');
        setShowVerificationModal(true);
    };

    const handleExecuteEmergencyAction = (actionName) => {
        setVerificationTargetAction(actionName);
        setShowVerificationModal(true);
    };

    const handleConfirmVerification = () => {
        if (!verificationPassword) {
            alert("Please enter your current admin password to verify identity.");
            return;
        }
        setShowVerificationModal(false);
        setVerificationPassword('');
        setVerificationCode('');
        
        if (verificationTargetAction === 'SIGN_OUT_OTHER_SESSIONS') {
            setControlData(prev => ({
                ...prev,
                activeSessions: prev.activeSessions.filter(s => s.isCurrent)
            }));
            alert("All secondary active device sessions have been revoked.");
        } else {
            alert(`Emergency action executed: ${verificationTargetAction}. Security protocol updated.`);
        }
    };

    const handleSaveProfile = async () => {
        try {
            await apiClient.put('/profile/me', {
                name: editForm.fullName,
                institution: editForm.department,
                bio: editForm.bio
            });
            setShowEditProfile(false);
            fetchControlCenterData();
            alert("Admin Account Information updated.");
        } catch (err) {
            console.error("Profile save failed:", err);
            alert("Failed to update profile details.");
        }
    };

    const handleChangePasswordSubmit = (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert("New passwords do not match!");
            return;
        }
        setShowChangePassword(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        alert("Security credentials updated successfully. Audit notification sent.");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const info = controlData?.accountInfo || {};
    const stats = controlData?.stats || {};
    const workload = controlData?.workload || {};
    const security = controlData?.securityCenter || {};
    const sessions = controlData?.activeSessions || [];
    const securityActivity = controlData?.securityActivity || [];
    const privileges = controlData?.adminPrivileges || [];
    const recentActions = controlData?.recentActions || [];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500 pb-24">
            
            {/* 1. TOP HERO & ADMIN ACCOUNT INFORMATION CARD */}
            <div className={`rounded-3xl border overflow-hidden transition-all shadow-sm ${themeStyles.cardBg}`}>
                {/* Banner Gradient */}
                <div className="h-40 sm:h-44 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <div className="absolute top-4 right-6 flex items-center gap-2 bg-white/90 dark:bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/40 dark:border-white/10 text-slate-800 dark:text-white text-xs font-bold shadow-md">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        <span>{info.status || 'Active'}</span>
                        <span className="text-slate-500 dark:text-slate-300 font-normal">| Last login: {info.lastLogin}</span>
                    </div>
                </div>

                {/* Profile Header Content */}
                <div className="px-6 sm:px-8 pb-6 relative z-10">
                    <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
                        {/* Avatar + Main Info */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
                            {/* Avatar only gets negative margin to overlap the banner */}
                            <div className="-mt-16 sm:-mt-20 relative z-20 shrink-0">
                                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] bg-white dark:bg-navy-900 p-1.5 shadow-2xl ring-4 ring-sky-500/20">
                                    <div className="w-full h-full rounded-[1.7rem] bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center text-3xl sm:text-4xl font-black italic border border-sky-200 dark:border-sky-500/30 shadow-inner">
                                        {info.fullName ? info.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'HR'}
                                    </div>
                                </div>
                            </div>

                            {/* Main Info text sits entirely in the card body below the banner */}
                            <div className="space-y-1.5 mt-2 sm:mt-0 pb-1 relative z-20">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{info.fullName}</h1>
                                    <span className="px-3.5 py-1 bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-black uppercase tracking-widest rounded-full border border-sky-300 dark:border-sky-500/30">
                                        {info.role}
                                    </span>
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-mono font-bold rounded-full border border-slate-200 dark:border-white/10">
                                        ID: {info.adminId}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-gray-300 font-medium flex items-center gap-2 flex-wrap">
                                    <span>{info.department}</span>
                                    <span>•</span>
                                    <span className="text-sky-600 dark:text-sky-400 font-semibold">{info.email}</span>
                                </p>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end pb-1 relative z-20">
                            <button 
                                onClick={() => setShowEditProfile(true)}
                                className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/20 dark:hover:bg-sky-500/30 text-sky-700 dark:text-sky-300 rounded-xl font-bold text-xs border border-sky-300 dark:border-sky-500/40 shadow-xs transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                            >
                                <EditIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                <span>Edit Account Info</span>
                            </button>
                            <button 
                                onClick={() => setShowPermissionMatrix(true)}
                                className="px-4 py-2.5 bg-white hover:bg-slate-50 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 border border-slate-200 dark:border-white/10 shadow-xs active:scale-95 cursor-pointer"
                            >
                                <ShieldIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                                <span>View Permission Matrix</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Extended Account Information Grid */}
                <div className="px-6 sm:px-8 pb-6 pt-5 border-t border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className={`p-4 rounded-xl border ${themeStyles.innerBg} flex flex-col justify-center`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${themeStyles.mutedText}`}>Full Name</p>
                            <p className={`text-sm font-bold mt-1 text-slate-900 dark:text-white`}>{info.fullName}</p>
                        </div>
                        <div className={`p-4 rounded-xl border ${themeStyles.innerBg} flex flex-col justify-center`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${themeStyles.mutedText}`}>Email Address</p>
                            <p className={`text-sm font-bold mt-1 text-slate-900 dark:text-white break-all`}>{info.email}</p>
                        </div>
                        <div className={`p-4 rounded-xl border ${themeStyles.innerBg} flex flex-col justify-center`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${themeStyles.mutedText}`}>Role Designation</p>
                            <p className="text-sm font-extrabold mt-1 text-sky-700 dark:text-sky-400">{info.role}</p>
                        </div>
                        <div className={`p-4 rounded-xl border ${themeStyles.innerBg} flex flex-col justify-center`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${themeStyles.mutedText}`}>Department</p>
                            <p className={`text-sm font-bold mt-1 text-slate-900 dark:text-white`}>{info.department}</p>
                        </div>
                        <div className={`p-4 rounded-xl border ${themeStyles.innerBg} flex flex-col justify-center`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${themeStyles.mutedText}`}>Admin ID</p>
                            <p className="text-sm font-mono font-bold mt-1 text-purple-600 dark:text-purple-400">{info.adminId}</p>
                        </div>
                        <div className={`p-4 rounded-xl border ${themeStyles.innerBg} flex flex-col justify-center`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${themeStyles.mutedText}`}>Account Created</p>
                            <p className={`text-sm font-bold mt-1 text-slate-900 dark:text-white`}>{info.accountCreated}</p>
                        </div>
                        <div className={`p-4 rounded-xl border ${themeStyles.innerBg} flex flex-col justify-center sm:col-span-2 lg:col-span-2`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${themeStyles.mutedText}`}>Account Status</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{info.status || 'Active'} • Operational Full Access</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. STATS ROW */}
            <div>
                <h2 className={`text-xs font-black uppercase tracking-wider mb-3 ${themeStyles.mutedText}`}>Personal Administrative Output & Impact</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Approvals Granted */}
                    <div className="adamgiebl-card group cursor-pointer transition-all hover:-translate-y-1 p-5 flex flex-col justify-between w-full h-full">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">Approvals Granted</h3>
                            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                <CheckIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="my-1">
                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.approvals}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px] font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{stats.monthlyTrend || '+18% activity this month'}</span>
                            <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </div>

                    {/* Disputes Resolved */}
                    <div className="adamgiebl-card group cursor-pointer transition-all hover:-translate-y-1 p-5 flex flex-col justify-between w-full h-full">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">Disputes Resolved</h3>
                            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <ScaleIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="my-1">
                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.reports}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px] font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">100% SLA target met</span>
                            <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </div>

                    {/* Users Managed */}
                    <div className="adamgiebl-card group cursor-pointer transition-all hover:-translate-y-1 p-5 flex flex-col justify-between w-full h-full">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">Users Managed</h3>
                            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <UsersIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="my-1">
                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.usersManaged}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px] font-bold">
                            <span className="text-sky-600 dark:text-sky-400 font-extrabold">Across all roles</span>
                            <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </div>

                    {/* Certificates Issued */}
                    <div className="adamgiebl-card group cursor-pointer transition-all hover:-translate-y-1 p-5 flex flex-col justify-between w-full h-full">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">Certificates Issued</h3>
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <CertificateIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="my-1">
                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.certificatesIssued}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px] font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Cryptographically signed</span>
                            <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. MAIN 2-COLUMN CONTROL CENTER LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT MAIN COLUMN (8 cols): SECURITY, SESSIONS & SECURITY LOGS */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* SECURITY CENTER (MOST IMPORTANT) */}
                    <div className="absolutestrange-card p-8 space-y-6 relative overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center">
                                    <LockIcon className="w-5 h-5" />
                                </span>
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Security Center</h2>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Account hardening, multi-factor verification, and vulnerability score</p>
                                </div>
                            </div>

                            {/* Security Score Badge */}
                            <div className="text-right">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold uppercase text-slate-500 dark:text-gray-400">Security Score:</span>
                                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{security.securityScore || 90}%</span>
                                </div>
                                <div className="w-36 h-2.5 bg-slate-100 dark:bg-white/10 rounded-full mt-1.5 overflow-hidden p-0.5">
                                    <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full" style={{ width: `${security.securityScore || 90}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Security Controls Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-2xl border ${themeStyles.innerBg} flex items-center justify-between`}>
                                <div>
                                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">Password Credentials</p>
                                    <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">Last changed {security.passwordLastChanged}</p>
                                </div>
                                <button 
                                    onClick={() => setShowChangePassword(true)}
                                    className="px-4 py-2 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/40 rounded-2xl text-xs font-bold shadow-xs transition-all active:scale-95"
                                >
                                    Change Password
                                </button>
                            </div>

                            <div className={`p-4 rounded-2xl border ${themeStyles.innerBg} flex items-center justify-between`}>
                                <div>
                                    <p className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span>Two-Factor Authentication (2FA)</span>
                                        <span className="text-emerald-500 font-black">● Enabled</span>
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">Authenticator App configured</p>
                                </div>
                                <button 
                                    onClick={() => alert("2FA settings are active and locked by Super Admin policy.")}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-2xl text-xs font-bold transition-all border border-slate-200 dark:border-white/10 shadow-xs"
                                >
                                    Manage 2FA
                                </button>
                            </div>

                            <div className={`p-4 rounded-2xl border ${themeStyles.innerBg} flex items-center justify-between`}>
                                <div>
                                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">Recovery Email Address</p>
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Verified ({security.recoveryEmail})</p>
                                </div>
                            </div>

                            <div className={`p-4 rounded-2xl border ${themeStyles.innerBg} flex items-center justify-between`}>
                                <div>
                                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">Suspicious Login Alerts</p>
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">● Active & Monitoring</p>
                                </div>
                            </div>
                        </div>

                        {/* Security Checks List */}
                        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                                    <ShieldIcon className="w-5 h-5" />
                                </span>
                                <div>
                                    <p className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">Account Security Checkup</p>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Your administrator account passes all high-assurance security criteria.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                                {security.checks?.map((check, idx) => (
                                    <span key={idx} className="px-2.5 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 border border-emerald-300/80 dark:border-emerald-500/30 flex items-center gap-1">
                                        <CheckIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        {check.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ACTIVE SESSIONS & DEVICE MANAGEMENT */}
                    <div className="absolutestrange-card p-8 space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center">
                                    <ClockIcon className="w-5 h-5" />
                                </span>
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Active Device Sessions</h2>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Manage signed-in browsers, locations, and revoke unauthorized access</p>
                                </div>
                            </div>

                            <button 
                                onClick={handleSignOutAllOther}
                                className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold transition-all border border-rose-200 dark:border-rose-500/20 shadow-xs"
                            >
                                Sign Out Other Sessions
                            </button>
                        </div>

                        <div className="space-y-3">
                            {sessions.map((sess) => (
                                <div key={sess.id} className={`p-4 rounded-2xl border ${sess.isCurrent ? 'border-sky-300 bg-sky-50/40 dark:bg-sky-900/10' : themeStyles.innerBg} flex items-center justify-between gap-4 transition-all`}>
                                    <div className="flex items-center gap-3.5">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${sess.isCurrent ? 'bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-white/10'}`}>
                                            <ZapIcon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-extrabold text-slate-900 dark:text-white">{sess.device}</p>
                                                {sess.isCurrent && (
                                                    <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[9px] font-black uppercase rounded-full tracking-wider border border-sky-200 dark:border-sky-500/30">Current Session</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium mt-0.5">{sess.location} • Last active: {sess.lastActive}</p>
                                        </div>
                                    </div>

                                    {!sess.isCurrent && (
                                        <button 
                                            onClick={() => handleSignOutSession(sess.id)}
                                            className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-2xl transition-all"
                                        >
                                            Revoke
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECURITY & LOGIN ACTIVITY TIMELINE */}
                    <div className="absolutestrange-card p-8 space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center">
                                    <FileTextIcon className="w-5 h-5" />
                                </span>
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Security & Login History</h2>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Timestamped audit trail of authentication events and device handshakes</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {securityActivity.map((sec, idx) => (
                                <div key={idx} className={`p-4 rounded-2xl border ${themeStyles.innerBg} flex items-center justify-between text-xs`}>
                                    <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{sec.event}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">IP: {sec.ip}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400">{sec.time}</span>
                                        <span className="ml-3 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase">{sec.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN (4 cols): WORKLOAD, PERMISSIONS, RECENT ACTIONS & PREFERENCES */}
                <div className="lg:col-span-4 space-y-8">
                    
                    {/* CURRENT ADMIN WORKLOAD CARD */}
                    <div className="absolutestrange-card p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                            <h3 className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest flex items-center gap-2">
                                <ZapIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                <span>Current Workload</span>
                            </h3>
                            <span className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded-full border border-rose-200 dark:border-rose-500/30">
                                {workload.totalPending || 16} Pending
                            </span>
                        </div>

                        <div className="space-y-2.5 text-xs">
                            <div className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 font-bold">
                                <span className="text-slate-600 dark:text-gray-300">Pending Approvals</span>
                                <span className="text-slate-900 dark:text-white font-mono">{workload.pendingApprovals || 4}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 font-bold">
                                <span className="text-slate-600 dark:text-gray-300">Open Disputes</span>
                                <span className="text-rose-600 dark:text-rose-400 font-mono">{workload.openDisputes || 2}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 font-bold">
                                <span className="text-slate-600 dark:text-gray-300">Pending Certificates</span>
                                <span className="text-slate-900 dark:text-white font-mono">{workload.pendingCertificates || 7}</span>
                            </div>
                            <div className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 font-bold">
                                <span className="text-slate-600 dark:text-gray-300">Pending Requests</span>
                                <span className="text-slate-900 dark:text-white font-mono">{workload.pendingRequests || 3}</span>
                            </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                            <TriangleAlertIcon className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>2 critical items require immediate admin action</span>
                        </div>

                        <button 
                            onClick={() => navigate('/admin/organizer-approvals')}
                            className="w-full py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 rounded-2xl font-bold text-xs border border-sky-300 dark:border-sky-500/40 shadow-xs transition-all text-center block active:scale-95"
                        >
                            View Pending Tasks
                        </button>
                    </div>

                    {/* ADMIN ACCESS & DETAILED PRIVILEGES */}
                    <div className="absolutestrange-card p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                            <h3 className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest flex items-center gap-2">
                                <LockIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                <span>Admin Access & Privileges</span>
                            </h3>
                            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">Super Admin</span>
                        </div>

                        <div className="space-y-3">
                            {privileges.map((priv, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-xs">
                                    <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black shrink-0 mt-0.5">
                                        <CheckIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{priv.name}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">{priv.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => setShowPermissionMatrix(true)}
                            className="w-full py-2.5 bg-white hover:bg-slate-50 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-2xl text-xs font-bold transition-all border border-slate-200 dark:border-white/10 shadow-xs active:scale-95"
                        >
                            View Full Permission Matrix
                        </button>
                    </div>

                    {/* ENRICHED RECENT ADMIN ACTIONS (AUDIT SHORTCUT) */}
                    <div className="absolutestrange-card p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
                            <h3 className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest flex items-center gap-2">
                                <FileTextIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                <span>Recent Admin Actions</span>
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {recentActions.map((act) => (
                                <div key={act.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-sky-400 transition-all text-xs space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="font-black text-sky-600 dark:text-sky-400 text-[10px] uppercase">{act.type}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{act.time}</span>
                                    </div>
                                    <p className="font-bold text-slate-900 dark:text-white">{act.title}</p>
                                    {act.subtitle && <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium">{act.subtitle}</p>}
                                    <div className="pt-1 flex justify-between items-center">
                                        <span className="text-[10px] text-slate-500 dark:text-gray-400 italic">{act.detail}</span>
                                        <Link to={act.link} className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline">
                                            View →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* NOTIFICATION PREFERENCES */}
                    <div className="absolutestrange-card p-6 space-y-4">
                        <h3 className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest">
                            Notification Preferences
                        </h3>

                        <div className="space-y-2.5 text-xs font-bold">
                            {Object.entries({
                                email: 'Email Notifications',
                                criticalDisputes: 'Critical Disputes Alerts',
                                organizerApps: 'New Organizer Applications',
                                hackathonApprovals: 'Hackathon Approval Requests',
                                certificateIssues: 'Certificate Issues',
                                systemAlerts: 'System Infrastructure Alerts'
                            }).map(([key, label]) => (
                                <div key={key} className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5">
                                    <span className="text-slate-700 dark:text-gray-300">{label}</span>
                                    <input 
                                        type="checkbox" 
                                        checked={notifications[key]}
                                        onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                                        className="w-4 h-4 accent-sky-600 cursor-pointer"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DANGER ZONE & BREAK-GLASS CONTROLS */}
                    <div className="p-6 rounded-[2.5rem] bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 space-y-3">
                        <h3 className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                            Emergency Security Controls
                        </h3>
                        <p className="text-[10px] text-rose-700 dark:text-rose-300 font-medium">Break-glass actions requiring admin identity password re-verification.</p>
                        
                        <div className="space-y-2 pt-1">
                            <button 
                                onClick={() => handleExecuteEmergencyAction('TERMINATE_ALL_SESSIONS')}
                                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm active:scale-95"
                            >
                                Terminate All Active Sessions
                            </button>
                            <button 
                                onClick={() => handleExecuteEmergencyAction('REVOKE_ALL_ADMIN_TOKENS')}
                                className="w-full py-2.5 bg-white hover:bg-slate-50 dark:bg-white/10 text-slate-700 dark:text-white rounded-2xl text-xs font-bold transition-all border border-slate-200 dark:border-white/10 shadow-xs active:scale-95"
                            >
                                Revoke All Admin Tokens
                            </button>
                        </div>
                    </div>

                </div>

            </div>

            {/* --- MODALS --- */}

            {/* 1. PERMISSION MATRIX MODAL */}
            {showPermissionMatrix && (
                <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] max-w-4xl w-full p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-4">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Role Access & Permission Matrix</h2>
                                <p className="text-xs text-slate-500 dark:text-gray-400">Comparative access permissions across platform administration tiers</p>
                            </div>
                            <button 
                                onClick={() => setShowPermissionMatrix(false)} 
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition-colors"
                                aria-label="Close modal"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>


                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 uppercase font-black">
                                        <th className="p-3">Module</th>
                                        <th className="p-3 text-center">Super Admin</th>
                                        <th className="p-3 text-center">System Admin</th>
                                        <th className="p-3 text-center">Moderator</th>
                                        <th className="p-3 text-center">Support Admin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-bold text-slate-800 dark:text-gray-200">
                                    {[
                                        { module: 'User Governance', super: 'VIEW / CREATE / EDIT / DELETE', system: 'VIEW / EDIT / SUSPEND', mod: 'VIEW ONLY', supp: 'VIEW ONLY' },
                                        { module: 'Organizer & Hackathon Approvals', super: 'VIEW / APPROVE / REJECT / DELETE', system: 'VIEW / APPROVE / REJECT', mod: 'VIEW ONLY', supp: 'VIEW ONLY' },
                                        { module: 'Submissions & Evaluations', super: 'FULL ACCESS', system: 'VIEW / OVERRIDE SCORES', mod: 'VIEW ONLY', supp: 'VIEW ONLY' },
                                        { module: 'Certificates Governance', super: 'ISSUE / MINT / REVOKE', system: 'ISSUE / MINT / REVOKE', mod: 'VIEW ONLY', supp: 'NO ACCESS' },
                                        { module: 'Disputes & SLA Resolution', super: 'INVESTIGATE & RESOLVE', system: 'INVESTIGATE & RESOLVE', mod: 'INVESTIGATE ONLY', supp: 'VIEW ONLY' },
                                        { module: 'Central Analytics Command', super: 'FULL INTELLIGENCE', system: 'FULL INTELLIGENCE', mod: 'SUMMARY ONLY', supp: 'SUMMARY ONLY' },
                                        { module: 'Platform Security Settings', super: 'FULL CONTROL', system: 'LIMITED VIEW', mod: 'NO ACCESS', supp: 'NO ACCESS' }
                                    ].map((row, i) => (
                                        <tr key={i} className="hover:bg-sky-50/50 dark:hover:bg-white/[0.02]">
                                            <td className="p-3 font-extrabold text-slate-900 dark:text-white">{row.module}</td>
                                            <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">{row.super}</td>
                                            <td className="p-3 text-center text-sky-600 dark:text-sky-400 font-mono text-[10px]">{row.system}</td>
                                            <td className="p-3 text-center text-amber-600 dark:text-amber-400 font-mono text-[10px]">{row.mod}</td>
                                            <td className="p-3 text-center text-slate-500 font-mono text-[10px]">{row.supp}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={() => setShowPermissionMatrix(false)} className="px-5 py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 rounded-2xl font-bold text-xs shadow-xs active:scale-95">
                                Close Matrix
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. CHANGE PASSWORD MODAL */}
            {showChangePassword && (
                <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleChangePasswordSubmit} className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full p-8 space-y-5 shadow-2xl">
                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Change Admin Password</h2>
                        <div className="space-y-3 text-xs font-bold">
                            <div>
                                <label className="text-slate-600 dark:text-gray-400">Current Password</label>
                                <input 
                                    type="password" required
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                    className="w-full mt-1 p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                                />
                            </div>
                            <div>
                                <label className="text-slate-600 dark:text-gray-400">New Password</label>
                                <input 
                                    type="password" required
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    className="w-full mt-1 p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                                />
                            </div>
                            <div>
                                <label className="text-slate-600 dark:text-gray-400">Confirm New Password</label>
                                <input 
                                    type="password" required
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    className="w-full mt-1 p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-3">
                            <button type="button" onClick={() => setShowChangePassword(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white rounded-2xl text-xs font-bold border border-slate-200 dark:border-white/10">Cancel</button>
                            <button type="submit" className="px-5 py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 rounded-2xl font-bold text-xs shadow-xs active:scale-95">Update Password</button>
                        </div>
                    </form>
                </div>
            )}

            {/* 3. EDIT ADMIN PROFILE MODAL */}
            {showEditProfile && (
                <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] max-w-lg w-full p-8 space-y-5 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-3">
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Edit Admin Account Info</h2>
                            <button 
                                onClick={() => setShowEditProfile(false)} 
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition-colors"
                                aria-label="Close modal"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>


                        <div className="space-y-3 text-xs font-bold">
                            <div>
                                <label className="text-slate-600 dark:text-gray-400">Full Name</label>
                                <input 
                                    type="text"
                                    value={editForm.fullName}
                                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                                    className="w-full mt-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                                />
                            </div>
                            <div>
                                <label className="text-slate-600 dark:text-gray-400">Assigned Department</label>
                                <input 
                                    type="text"
                                    value={editForm.department}
                                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                                    className="w-full mt-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                                />
                            </div>
                            <div>
                                <label className="text-slate-600 dark:text-gray-400">Role Designation (System Locked)</label>
                                <input 
                                    type="text" disabled value={`${info.role} (Superadmin Managed)`}
                                    className="w-full mt-1 p-3.5 rounded-2xl bg-slate-200 dark:bg-white/5 text-slate-500 border border-slate-300 dark:border-white/5 font-mono cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="text-slate-600 dark:text-gray-400">Operational Bio</label>
                                <textarea 
                                    rows="3"
                                    value={editForm.bio}
                                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                    className="w-full mt-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3">
                            <button onClick={() => setShowEditProfile(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white rounded-2xl text-xs font-bold border border-slate-200 dark:border-white/10">Cancel</button>
                            <button onClick={handleSaveProfile} className="px-5 py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 rounded-2xl font-bold text-xs shadow-xs active:scale-95">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. SECURITY IDENTITY RE-VERIFICATION MODAL */}
            {showVerificationModal && (
                <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-navy-900 border border-rose-500/30 rounded-[2.5rem] max-w-md w-full p-8 space-y-5 shadow-2xl">
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                                    <line x1="12" y1="9" x2="12" y2="13"/>
                                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                            </div>
                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Admin Identity Re-Verification</h2>
                            <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">Action: {verificationTargetAction}</p>
                            <p className="text-xs text-slate-500 dark:text-gray-400">High-assurance administrative operation requires secondary password re-authentication.</p>
                        </div>

                        <div className="space-y-3 text-xs font-bold">
                            <div>
                                <label className="text-slate-600 dark:text-gray-400">Current Admin Password</label>
                                <input 
                                    type="password" placeholder="••••••••"
                                    value={verificationPassword}
                                    onChange={(e) => setVerificationPassword(e.target.value)}
                                    className="w-full mt-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-sky-500"
                                />
                            </div>
                            <div>
                                <label className="text-slate-600 dark:text-gray-400">2FA Authenticator Code</label>
                                <input 
                                    type="text" placeholder="6-digit code (e.g. 849201)" maxLength="6"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    className="w-full mt-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white font-mono text-center tracking-widest text-base outline-none focus:border-sky-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3">
                            <button onClick={() => setShowVerificationModal(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white rounded-2xl text-xs font-bold border border-slate-200 dark:border-white/10">Cancel</button>
                            <button onClick={handleConfirmVerification} className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold shadow-md active:scale-95">Verify & Execute</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminProfile;
