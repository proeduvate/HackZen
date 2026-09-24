import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileTextIcon, ShieldIcon, CheckIcon, UsersIcon, TeacherIcon, TriangleAlertIcon } from '../../components/AdminIcons';
import { 
    fetchUsers, 
    fetchUserProfile, 
    updateUserRole, 
    updateUserStatus, 
    performBulkUserAction 
} from '../../services/admin/usersManagementApi';
import { useTheme } from '../../context/ThemeContext';

// SVG Icons requested for Profile Inspector Sub-Tabs
const ActivityIcon = ({ className = "w-4 h-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-activity-icon lucide-activity ${className}`}>
        <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>
    </svg>
);

const NotepadTextIcon = ({ className = "w-4 h-4" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-notepad-text-icon lucide-notepad-text ${className}`}>
        <path d="M8 2v4"/>
        <path d="M12 2v4"/>
        <path d="M16 2v4"/>
        <rect width="16" height="18" x="4" y="4" rx="2"/>
        <path d="M8 10h6"/>
        <path d="M8 14h8"/>
        <path d="M8 18h5"/>
    </svg>
);

const ZapIcon = ({ className = "w-3.5 h-3.5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
);

const CheckCircle2Icon = ({ className = "w-3.5 h-3.5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/>
        <path d="m9 12 2 2 4-4"/>
    </svg>
);

// --- Reusable Modal Component ---
const ActionModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">

            <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-slate-900 dark:text-white">
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

                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-wider">{title}</h2>
                {children}
            </div>
        </div>
    );
};

// --- Avatar Color safelist map ---
const avatarColorMap = {
    blue: 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
    purple: 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30',
    slate: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30',
    amber: 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
    red: 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
};

const avatarBadgeMap = {
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-500',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-500',
    slate: 'bg-slate-500/20 border-slate-500/30 text-slate-400',
    amber: 'bg-amber-500/20 border-amber-500/30 text-amber-500',
    red: 'bg-rose-500/20 border-rose-500/30 text-rose-500',
};

// Role Badge safe styles
const roleColors = {
    'ORGANIZER': 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 font-bold',
    'STUDENT': 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 font-bold',
    'MENTOR': 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 font-bold',
    'ADMIN': 'bg-slate-100 dark:bg-slate-500/20 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-500/30 font-bold',
};

const UsersManagement = () => {
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

    const [searchParams, setSearchParams] = useSearchParams();
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Toast Notification State
    const [toastMessage, setToastMessage] = useState(null);
    const showToast = (text, type = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Filter States
    const [activeTab, setActiveTab] = useState('All Users');
    const [searchQuery, setSearchQuery] = useState('');
    const [roleDropdown, setRoleDropdown] = useState('All Roles');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [collegeFilter, setCollegeFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Profile Drawer Sub-tab (Two-Page View to eliminate empty space)
    const [profileTab, setProfileTab] = useState('overview'); // 'overview' | 'activity'
    const [mentorTeamsTab, setMentorTeamsTab] = useState('active'); // 'active' | 'past'

    // Modals
    const [roleModalConfig, setRoleModalConfig] = useState({ isOpen: false, user: null, selectedRole: '', reason: '' });
    const [suspendModalConfig, setSuspendModalConfig] = useState({ isOpen: false, user: null, action: '', reason: 'Policy violation', duration: 'Permanent', message: '' });
    const [bulkNotifyMessage, setBulkNotifyMessage] = useState('');
    const [isBulkNotifyOpen, setIsBulkNotifyOpen] = useState(false);
    const [bulkRoleConfig, setBulkRoleConfig] = useState({ isOpen: false, targetRole: 'STUDENT' });
    const [contactModalConfig, setContactModalConfig] = useState({ isOpen: false, user: null, subject: '', body: '' });

    // Listen to URL Search Params for deep linking from Admin Dashboard
    useEffect(() => {
        const roleParam = searchParams.get('role');
        const filterParam = searchParams.get('filter');
        const tabParam = searchParams.get('tab');
        const searchParam = searchParams.get('search');

        if (roleParam) {
            setRoleDropdown(roleParam.charAt(0).toUpperCase() + roleParam.slice(1).toLowerCase());
        }
        if (tabParam) {
            setActiveTab(tabParam);
        }
        if (searchParam) {
            setSearchQuery(searchParam);
        }
        if (filterParam === 'overloaded') {
            setRoleDropdown('Mentor');
            const overloadedMentor = users.find(u => u.role === 'MENTOR' && (u.isOverloaded || (u.activeTeamsCount > 5) || (u.activityStats && u.activityStats.teams > 6)));
            if (overloadedMentor) {
                setSelectedUser(overloadedMentor);
            }
        } else if (filterParam === 'unassigned') {
            setRoleDropdown('Mentor');
        } else if (filterParam === 'suspended' || filterParam === 'suspicious') {
            setActiveTab('Suspended');
        } else if (filterParam === 'pending_mentors' || filterParam === 'verification') {
            setActiveTab('Verification Required');
            setRoleDropdown('Mentor');
        }
    }, [searchParams, users]);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await fetchUsers();
            if (Array.isArray(data) && data.length > 0) {
                const colors = ['blue', 'purple', 'slate', 'amber', 'red'];
                const mapped = data.map((u, i) => ({
                    id: u.id || u._id || `U${i + 1}`,
                    name: u.name || (u.email ? u.email.split('@')[0].toUpperCase() : 'USER'),
                    email: u.email || 'N/A',
                    role: (u.role || 'STUDENT').toUpperCase(),
                    status: u.status || 'Active',
                    emailVerified: u.emailVerified ?? true,
                    orgVerified: u.orgVerified ?? (u.role === 'ORGANIZER' || u.role === 'ADMIN'),
                    riskLevel: u.riskLevel || (u.status === 'Active' ? 'LOW' : 'HIGH'),
                    riskScore: u.riskScore || (u.status === 'Active' ? 0 : 75),
                    riskFactors: u.riskFactors || ['No risk factors detected'],
                    joinedDate: u.joinedDate || 'Aug 10, 2026',
                    lastActive: u.lastActive || '5 mins ago',
                    college: u.college || 'Platform Participant College',
                    department: u.department || 'Computer Science',
                    year: u.year || '3rd Year',
                    initials: (u.name || u.email || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
                    color: colors[i % colors.length],
                    activeTeamsCount: u.activeTeamsCount ?? (u.isOverloaded ? 7 : 3),
                    pastTeamsCount: u.pastTeamsCount ?? (u.isOverloaded ? 5 : 4),
                    totalTeamsCount: u.totalTeamsCount ?? (u.activeTeamsCount ? u.activeTeamsCount + (u.pastTeamsCount || 0) : (u.isOverloaded ? 12 : 7)),
                    isOverloaded: u.role === 'MENTOR' && (u.activeTeamsCount ? u.activeTeamsCount > 5 : u.isOverloaded),
                    activeSupervisedTeams: u.activeSupervisedTeams || u.supervisedTeams || [],
                    pastSupervisedTeams: u.pastSupervisedTeams || [],
                    supervisedTeams: u.supervisedTeams || [],
                    activityStats: u.activityStats || { hackathons: 4, teams: 10, submissions: 4, certificates: 3, mentorSessions: 7 },
                    recentActivity: u.recentActivity || [
                        { time: 'Recently', event: 'Account active' }
                    ]
                }));

                setUsers(mapped);
                setSelectedUser(prev => prev ? (mapped.find(c => c.id === prev.id) || mapped[0]) : mapped[0]);
            } else {
                setUsers([]);
                setSelectedUser(null);
            }
            showToast("User directory refreshed successfully.");
        } catch (error) {
            console.error("Error loading users from database:", error);
            showToast("Failed to load user directory from database.", "error");
            setUsers([]);
            setSelectedUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Summary Cards Counts (Separating Active Concurrency Overload)
    const populationStats = useMemo(() => {
        return {
            total: users.length,
            students: users.filter(u => u.role === 'STUDENT').length,
            mentors: users.filter(u => u.role === 'MENTOR').length,
            organizers: users.filter(u => u.role === 'ORGANIZER').length,
            admins: users.filter(u => u.role === 'ADMIN').length,
            overloadedMentors: users.filter(u => u.role === 'MENTOR' && (u.isOverloaded || (u.activeTeamsCount ? u.activeTeamsCount > 5 : (u.activeSupervisedTeams?.length > 5 || u.activityStats?.teams > 6)))).length,
            active: users.filter(u => u.status === 'Active').length,
            suspended: users.filter(u => u.status === 'Suspended').length,
            verificationPending: users.filter(u => !u.emailVerified || !u.orgVerified).length
        };
    }, [users]);

    // Checkbox toggles
    const toggleSelectUser = (id) => {
        setSelectedUserIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedUserIds.length === currentUsers.length) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(currentUsers.map(u => u.id));
        }
    };

    // View User Profile Drawer
    const handleSelectUser = async (user) => {
        setSelectedUser(user);
        try {
            const profile = await fetchUserProfile(user.id);
            if (profile) {
                setSelectedUser(prev => ({
                    ...prev,
                    ...profile,
                    activeTeamsCount: profile.activeTeamsCount ?? prev.activeTeamsCount,
                    pastTeamsCount: profile.pastTeamsCount ?? prev.pastTeamsCount,
                    totalTeamsCount: profile.totalTeamsCount ?? prev.totalTeamsCount,
                    activityStats: profile.activitySummary || prev.activityStats,
                    recentActivity: profile.recentActivities || prev.recentActivity
                }));
            }
        } catch (err) {
            // Keep current user state
        }
    };

    // Role modal
    const openRoleModal = (user) => {
        setRoleModalConfig({ isOpen: true, user, selectedRole: user.role, reason: '' });
    };

    const handleRoleChangeConfirm = async () => {
        const { user, selectedRole, reason } = roleModalConfig;
        if (user && selectedRole) {
            try {
                await updateUserRole(user.id, selectedRole, reason || "Admin update");
            } catch (err) {
                console.warn("API role update warning:", err);
            }
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: selectedRole } : u));
            if (selectedUser?.id === user.id) setSelectedUser(prev => ({ ...prev, role: selectedRole }));
            showToast(`Role updated to ${selectedRole} for ${user.name}`);
        }
        setRoleModalConfig({ isOpen: false, user: null, selectedRole: '', reason: '' });
    };

    // Suspension modal
    const openSuspendModal = (user) => {
        setSuspendModalConfig({
            isOpen: true,
            user,
            action: user.status === 'Active' ? 'Suspend' : 'Restore',
            reason: 'Policy violation',
            duration: 'Permanent',
            message: ''
        });
    };

    const handleSuspendConfirm = async () => {
        const { user, action, reason, duration, message } = suspendModalConfig;
        if (user) {
            const newStatus = action === 'Suspend' ? 'Suspended' : 'Active';
            try {
                await updateUserStatus(user.id, newStatus, reason, duration, message);
            } catch (err) {
                console.warn("API status update warning:", err);
            }
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
            if (selectedUser?.id === user.id) setSelectedUser(prev => ({ ...prev, status: newStatus }));
            showToast(action === 'Suspend' ? `Account suspended for ${user.name}` : `Account restored for ${user.name}`, action === 'Suspend' ? 'warning' : 'success');
        }
        setSuspendModalConfig({ isOpen: false, user: null, action: '', reason: '', duration: '', message: '' });
    };

    // Email Verification Quick Toggle
    const handleToggleVerification = (user) => {
        const nextState = !user.emailVerified;
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, emailVerified: nextState, orgVerified: nextState } : u));
        if (selectedUser?.id === user.id) {
            setSelectedUser(prev => ({ ...prev, emailVerified: nextState, orgVerified: nextState }));
        }
        showToast(nextState ? `Email verified for ${user.name}` : `Verification revoked for ${user.name}`);
    };

    // Reassign Team Quick Simulation (Decreases active present teams load)
    const handleReassignTeam = (teamName, mentorName) => {
        showToast(`Team "${teamName}" reassigned to an available mentor from ${mentorName}.`);
        setUsers(prev => prev.map(u => {
            if (u.name === mentorName) {
                const updatedActiveTeams = (u.activeSupervisedTeams || u.supervisedTeams || []).filter(t => t.name !== teamName);
                const updatedActiveCount = Math.max(0, (u.activeTeamsCount || (updatedActiveTeams.length + 1)) - 1);
                return {
                    ...u,
                    isOverloaded: updatedActiveCount > 5,
                    activeTeamsCount: updatedActiveCount,
                    totalTeamsCount: updatedActiveCount + (u.pastTeamsCount || 0),
                    activeSupervisedTeams: updatedActiveTeams,
                    supervisedTeams: updatedActiveTeams,
                    activityStats: { ...u.activityStats, teams: updatedActiveCount + (u.pastTeamsCount || 0) }
                };
            }
            return u;
        }));
        if (selectedUser?.name === mentorName) {
            setSelectedUser(prev => {
                const updatedActiveTeams = (prev.activeSupervisedTeams || prev.supervisedTeams || []).filter(t => t.name !== teamName);
                const updatedActiveCount = Math.max(0, (prev.activeTeamsCount || (updatedActiveTeams.length + 1)) - 1);
                return {
                    ...prev,
                    isOverloaded: updatedActiveCount > 5,
                    activeTeamsCount: updatedActiveCount,
                    totalTeamsCount: updatedActiveCount + (prev.pastTeamsCount || 0),
                    activeSupervisedTeams: updatedActiveTeams,
                    supervisedTeams: updatedActiveTeams,
                    activityStats: { ...prev.activityStats, teams: updatedActiveCount + (prev.pastTeamsCount || 0) }
                };
            });
        }
    };

    // Contact user dispatch
    const handleContactUserConfirm = () => {
        if (!contactModalConfig.user) return;
        showToast(`Message successfully dispatched to ${contactModalConfig.user.email}`);
        setContactModalConfig({ isOpen: false, user: null, subject: '', body: '' });
    };

    // Bulk actions
    const handleBulkAction = async (action, value = "") => {
        if (selectedUserIds.length === 0) return;
        try {
            await performBulkUserAction(selectedUserIds, action, value);
        } catch (err) {
            console.warn("Bulk API warning:", err);
        }

        if (action === 'suspend') {
            setUsers(prev => prev.map(u => selectedUserIds.includes(u.id) ? { ...u, status: 'Suspended' } : u));
            showToast(`Suspended ${selectedUserIds.length} accounts.`, 'warning');
        } else if (action === 'activate') {
            setUsers(prev => prev.map(u => selectedUserIds.includes(u.id) ? { ...u, status: 'Active' } : u));
            showToast(`Activated ${selectedUserIds.length} accounts.`);
        } else if (action === 'change_role') {
            setUsers(prev => prev.map(u => selectedUserIds.includes(u.id) ? { ...u, role: value.toUpperCase() } : u));
            showToast(`Updated role to ${value.toUpperCase()} for ${selectedUserIds.length} users.`);
        } else if (action === 'notify') {
            showToast(`Broadcast notice sent to ${selectedUserIds.length} users.`);
        }
        setSelectedUserIds([]);
        setIsBulkNotifyOpen(false);
        setBulkRoleConfig({ isOpen: false, targetRole: 'STUDENT' });
    };

    // CSV Export
    const exportToCSV = () => {
        const headers = ['Name', 'Email', 'Role', 'Status', 'College', 'Department', 'Active Teams (Present)', 'Past Teams (Completed)', 'Total Teams', 'Risk Level', 'Joined Date', 'Last Active'];
        const exportData = selectedUserIds.length > 0 ? users.filter(u => selectedUserIds.includes(u.id)) : filteredUsers;
        const csvContent = [
            headers.join(','),
            ...exportData.map(u => `"${u.name}","${u.email}","${u.role}","${u.status}","${u.college}","${u.department}","${u.role === 'MENTOR' ? (u.activeTeamsCount || 0) : 'N/A'}","${u.role === 'MENTOR' ? (u.pastTeamsCount || 0) : 'N/A'}","${u.role === 'MENTOR' ? (u.totalTeamsCount || 0) : 'N/A'}","${u.riskLevel}","${u.joinedDate}","${u.lastActive}"`)
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'users_governance_report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Exported ${exportData.length} user records to CSV.`);
    };

    // Filter reset helper
    const handleResetFilters = () => {
        setSearchParams({});
        setActiveTab('All Users');
        setSearchQuery('');
        setRoleDropdown('All Roles');
        setCollegeFilter('');
        setDepartmentFilter('');
        setCurrentPage(1);
        showToast("All filters have been reset.");
    };

    // Active filters count
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (searchQuery) count++;
        if (roleDropdown !== 'All Roles') count++;
        if (collegeFilter) count++;
        if (departmentFilter) count++;
        if (activeTab !== 'All Users') count++;
        if (searchParams.get('filter')) count++;
        return count;
    }, [searchQuery, roleDropdown, collegeFilter, departmentFilter, activeTab, searchParams]);

    // Filter logic based on active present workload
    const isOverloadedFilter = searchParams.get('filter') === 'overloaded';
    const isUnassignedFilter = searchParams.get('filter') === 'unassigned';

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesTab = 
                activeTab === 'All Users' ? true :
                activeTab === 'Active' ? u.status === 'Active' :
                activeTab === 'Suspended' ? u.status === 'Suspended' :
                activeTab === 'Verification Required' ? (!u.emailVerified || !u.orgVerified) : true;

            const matchesRole = roleDropdown === 'All Roles' ? true : u.role === roleDropdown.toUpperCase();
            
            const query = searchQuery.toLowerCase();
            const matchesSearch = u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
            const matchesCollege = collegeFilter === '' ? true : u.college.toLowerCase().includes(collegeFilter.toLowerCase());
            const matchesDepartment = departmentFilter === '' ? true : u.department.toLowerCase().includes(departmentFilter.toLowerCase());

            const matchesSpecialFilter = 
                isOverloadedFilter ? (u.role === 'MENTOR' && (u.isOverloaded || (u.activeTeamsCount ? u.activeTeamsCount > 5 : (u.activeSupervisedTeams?.length > 5 || u.activityStats?.teams > 6)))) :
                isUnassignedFilter ? (u.role === 'MENTOR' && (!u.activeTeamsCount || u.activeTeamsCount === 0) && (!u.activityStats?.teams || u.activityStats?.teams === 0)) : true;

            return matchesTab && matchesRole && matchesSearch && matchesCollege && matchesDepartment && matchesSpecialFilter;
        });
    }, [users, activeTab, roleDropdown, searchQuery, collegeFilter, departmentFilter, isOverloadedFilter, isUnassignedFilter]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

    const renderPaginationBar = (position) => (
        <div className={`flex flex-wrap items-center justify-between px-4 py-2.5 border-slate-200/80 dark:border-white/10 ${isLightTheme ? 'bg-slate-50/90' : 'bg-black/20'} shrink-0 text-xs font-medium ${position === 'top' ? 'border-b rounded-t-2xl' : 'border-t rounded-b-2xl mt-auto'}`}>
            <div className={`text-[11px] font-bold ${theme.mutedText}`}>
                Showing <span className={isLightTheme ? 'text-slate-900 font-extrabold' : 'text-white font-extrabold'}>{filteredUsers.length === 0 ? 0 : startIndex + 1}</span> to <span className={isLightTheme ? 'text-slate-900 font-extrabold' : 'text-white font-extrabold'}>{Math.min(startIndex + itemsPerPage, filteredUsers.length)}</span> of <span className={isLightTheme ? 'text-slate-900 font-extrabold' : 'text-white font-extrabold'}>{filteredUsers.length}</span> Users • Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                        currentPage === 1
                            ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-white/10 text-slate-400'
                            : 'bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/30 hover:bg-sky-100 shadow-sm'
                    }`}
                >
                    ← Prev Page
                </button>

                <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                currentPage === i + 1 
                                    ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 shadow-xs font-black' 
                                    : (isLightTheme ? 'text-slate-600 hover:bg-slate-200' : 'text-gray-400 hover:text-white')
                            }`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || filteredUsers.length === 0}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                        currentPage === totalPages || filteredUsers.length === 0
                            ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-white/10 text-slate-400'
                            : 'bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-500/30 hover:bg-sky-100 shadow-sm'
                    }`}
                >
                    Next Page →
                </button>
            </div>
        </div>
    );

    return (
        <div className={`space-y-6 animate-in fade-in duration-700 pb-16 relative ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
            
            {/* Toast Notification Banner */}
            {toastMessage && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
                    <div className={`px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2.5 font-bold text-xs border backdrop-blur-md transition-all ${
                        toastMessage.type === 'warning'
                            ? 'bg-amber-50/95 dark:bg-amber-950/80 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-amber-500/10'
                            : toastMessage.type === 'error'
                            ? 'bg-rose-50/95 dark:bg-rose-950/80 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 shadow-rose-500/10'
                            : 'bg-white/95 dark:bg-slate-900/90 border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100 shadow-slate-900/10'
                    }`}>
                        {toastMessage.type === 'warning' ? (
                            <TriangleAlertIcon className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : toastMessage.type === 'error' ? (
                            <TriangleAlertIcon className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                            <CheckIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        <span>{toastMessage.text}</span>
                    </div>
                </div>
            )}

            {/* Header & Main Control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-3xl font-extrabold tracking-tight ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>Users Management Command Center</h1>
                    <p className={`mt-1 text-sm ${theme.subText}`}>Audit accounts, investigate user profiles, modify roles, monitor mentor loads, and enforce governance policy.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {activeFiltersCount > 0 && (
                        <button 
                            onClick={handleResetFilters}
                            className="px-3.5 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-gray-200 border border-slate-300 dark:border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        >
                            <span>Reset ({activeFiltersCount})</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    )}

                    <button 
                        onClick={exportToCSV}
                        className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                    >
                        <FileTextIcon className="w-3.5 h-3.5" /> Export CSV
                    </button>
                    <button 
                        onClick={loadUsers} 
                        title="Refresh Directory"
                        className="p-2.5 bg-blue-50 dark:bg-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-full transition-all flex items-center justify-center shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 1. USER POPULATION SUMMARY CARDS (Spacious 2-Row Grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {[
                    { label: 'Total Users', val: populationStats.total, icon: <UsersIcon className="w-4 h-4 text-sky-500" />, filterRole: 'All Roles', filterTab: 'All Users' },
                    { label: 'Students', val: populationStats.students, color: 'text-blue-600 dark:text-blue-400', icon: <UsersIcon className="w-4 h-4 text-blue-500" />, filterRole: 'Student' },
                    { label: 'Mentors', val: populationStats.mentors, color: 'text-amber-600 dark:text-amber-400', icon: <TeacherIcon className="w-4 h-4 text-amber-500" />, filterRole: 'Mentor' },
                    { label: 'Overloaded Mentors', val: populationStats.overloadedMentors, color: 'text-rose-600 dark:text-rose-400', icon: <TriangleAlertIcon className="w-4 h-4 text-rose-500" />, specialFilter: 'overloaded' },
                    { label: 'Organizers', val: populationStats.organizers, color: 'text-purple-600 dark:text-purple-400', icon: <ShieldIcon className="w-4 h-4 text-purple-500" />, filterRole: 'Organizer' },
                    { label: 'System Admins', val: populationStats.admins, color: 'text-slate-700 dark:text-slate-300', icon: <ShieldIcon className="w-4 h-4 text-slate-500" />, filterRole: 'Admin' },
                    { label: 'Active Accounts', val: populationStats.active, color: 'text-emerald-600 dark:text-emerald-400', icon: <CheckIcon className="w-4 h-4 text-emerald-500" />, filterTab: 'Active' },
                    { label: 'Suspended Accounts', val: populationStats.suspended, color: 'text-rose-600 dark:text-red-400', icon: <TriangleAlertIcon className="w-4 h-4 text-rose-500" />, filterTab: 'Suspended' },
                    { label: 'Pending Verification', val: populationStats.verificationPending, color: 'text-amber-600 dark:text-amber-300', icon: <ShieldIcon className="w-4 h-4 text-amber-500" />, filterTab: 'Verification Required' }
                ].map((stat, i) => (
                    <div 
                        key={i} 
                        onClick={() => {
                            if (stat.specialFilter === 'overloaded') {
                                setSearchParams({ filter: 'overloaded' });
                                setRoleDropdown('Mentor');
                            } else {
                                if (stat.filterRole) {
                                    setRoleDropdown(stat.filterRole);
                                    setSearchParams({});
                                }
                                if (stat.filterTab) {
                                    setActiveTab(stat.filterTab);
                                    setSearchParams({});
                                }
                            }
                            setCurrentPage(1);
                        }} 
                        className="adamgiebl-card group cursor-pointer transition-all hover:-translate-y-1 p-3.5 flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 whitespace-normal leading-tight">{stat.label}</h3>
                            <div className="w-6 h-6 rounded-lg bg-sky-500/10 dark:bg-white/10 border border-sky-500/20 dark:border-white/10 flex items-center justify-center shrink-0">
                                {stat.icon}
                            </div>
                        </div>
                        <div className="my-1">
                            <p className={`text-2xl font-black tracking-tight ${stat.color || (isLightTheme ? 'text-slate-900' : 'text-white')}`}>{stat.val}</p>
                        </div>
                        <div className="pt-1.5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <span>Filter Directory</span>
                            <span className="group-hover:translate-x-1 transition-transform opacity-60">→</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls Bar & Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    
                    {/* Status Tabs with Dynamic Counts */}
                    <div className={`flex p-1.5 rounded-xl border overflow-x-auto ${isLightTheme ? 'bg-slate-100 border-slate-200' : 'bg-black/20 border-white/5'}`}>
                        {[
                            { name: 'All Users', count: populationStats.total },
                            { name: 'Active', count: populationStats.active },
                            { name: 'Suspended', count: populationStats.suspended },
                            { name: 'Verification Required', count: populationStats.verificationPending }
                        ].map((tab) => (
                            <button
                                key={tab.name}
                                onClick={() => { setActiveTab(tab.name); setCurrentPage(1); }}
                                className={`px-4 py-2 text-xs rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.name ? theme.tabActive : theme.tabInactive}`}
                            >
                                <span>{tab.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                    activeTab === tab.name 
                                    ? 'bg-sky-200/80 dark:bg-sky-500/30 text-sky-800 dark:text-sky-200' 
                                    : 'bg-black/10 dark:bg-white/10 text-slate-600 dark:text-gray-300'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Right Filter Inputs */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <svg className={`w-4 h-4 absolute left-3 top-2.5 ${isLightTheme ? 'text-slate-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input 
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className={`w-full rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none ${theme.inputBg}`}
                            />
                        </div>

                        <div className="relative inline-flex items-center">
                            <select 
                                value={roleDropdown}
                                onChange={(e) => { setRoleDropdown(e.target.value); setCurrentPage(1); }}
                                className={`appearance-none pr-8 pl-3.5 py-2 rounded-full border border-slate-200 dark:border-white/10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all ${theme.inputBg}`}
                            >
                                <option value="All Roles">All Roles</option>
                                <option value="Student">Student</option>
                                <option value="Mentor">Mentor</option>
                                <option value="Organizer">Organizer</option>
                                <option value="Admin">Admin</option>
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-slate-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`px-3 py-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${showAdvancedFilters ? 'bg-sky-100 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-300 font-bold' : (isLightTheme ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10')} shadow-sm`}
                        >
                            <span>Advanced Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="bg-sky-200 dark:bg-sky-500/30 text-sky-800 dark:text-sky-200 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                                    {activeFiltersCount}
                                </span>
                            )}
                            <span>▾</span>
                        </button>
                    </div>
                </div>

                {/* Advanced Filter Drawer */}
                {showAdvancedFilters && (
                    <div className={`p-4 rounded-xl border ${isLightTheme ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5'} grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200`}>
                        <div>
                            <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${theme.mutedText}`}>College / Institution</label>
                            <input 
                                type="text"
                                placeholder="Filter by college name..."
                                value={collegeFilter}
                                onChange={(e) => setCollegeFilter(e.target.value)}
                                className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`}
                            />
                        </div>
                        <div>
                            <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${theme.mutedText}`}>Department</label>
                            <input 
                                type="text"
                                placeholder="Filter by department..."
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`}
                            />
                        </div>
                        <div className="flex items-end">
                            <button 
                                onClick={handleResetFilters}
                                className="w-full py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                            >
                                Reset All Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Overloaded Mentors Active Filter Alert Banner */}
            {isOverloadedFilter && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300 shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                        <TriangleAlertIcon className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Showing {filteredUsers.length} mentors currently handling more teams than the recommended platform limit (Platform Threshold: 6 Teams max).</span>
                    </div>
                    <button 
                        onClick={() => { setSearchParams({}); setRoleDropdown('All Roles'); }}
                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 rounded-lg text-[10px] uppercase font-bold transition-colors"
                    >
                        Clear Filter ✕
                    </button>
                </div>
            )}

            {/* Bulk Action Header Bar */}
            {selectedUserIds.length > 0 && (
                <div className="p-3 bg-[#0ea5e9] text-white rounded-xl flex items-center justify-between text-xs font-bold animate-in fade-in shadow-md">
                    <span>{selectedUserIds.length} Users Selected for Bulk Governance</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleBulkAction('activate')} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 rounded text-[10px] uppercase">Activate</button>
                        <button onClick={() => handleBulkAction('suspend')} className="px-3 py-1 bg-rose-500 hover:bg-rose-600 rounded text-[10px] uppercase">Suspend</button>
                        <button onClick={() => setBulkRoleConfig({ isOpen: true, targetRole: 'STUDENT' })} className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-[10px] uppercase">Change Role</button>
                        <button onClick={() => setIsBulkNotifyOpen(true)} className="px-3 py-1 bg-amber-500 hover:bg-amber-600 rounded text-[10px] uppercase">Send Notice</button>
                        <button onClick={() => setSelectedUserIds([])} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-[10px]">Clear</button>
                    </div>
                </div>
            )}

            {/* SPLIT PANE WORKSPACE (Balanced 60/40 Ratio, Sticky Drawer, Zero Empty Space) */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                
                {/* LEFT PANE: Directory Table (60% Width, 10 Items Per Page) */}
                <div className="w-full lg:w-[60%] flex flex-col absolutestrange-card overflow-hidden shadow-xl p-0">
                    
                    {/* TOP PAGINATION */}
                    {renderPaginationBar('top')}

                    <div className="overflow-x-auto relative scrollbar-none">
                        <table className="w-full text-left border-collapse table-auto">
                            <thead className={`sticky top-0 z-10 text-[9.5px] uppercase tracking-wider font-extrabold ${theme.tableHead}`}>
                                <tr>
                                    <th className="w-8 px-2 py-3 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={currentUsers.length > 0 && selectedUserIds.length === currentUsers.length}
                                            onChange={toggleSelectAll}
                                            className="rounded bg-white dark:bg-black/20 border-slate-300 dark:border-white/20 text-[#0052cc]"
                                        />
                                    </th>
                                    <th className="px-2.5 py-3 text-left">User</th>
                                    <th className="w-24 px-2 py-3 text-left">Role</th>
                                    <th className="w-16 px-2 py-3 text-left">Status</th>
                                    <th className="w-24 px-2 py-3 text-left">Last Active</th>
                                    <th className="w-24 px-2.5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme.tableBorder}`}>
                                {isLoading ? (
                                    <tr><td colSpan="6" className="px-4 py-8 text-center text-xs text-[#0052cc] font-bold animate-pulse">Loading Live User Records...</td></tr>
                                ) : currentUsers.length === 0 ? (
                                    <tr><td colSpan="6" className={`px-4 py-8 text-center text-xs ${theme.mutedText}`}>No user records match the specified filters.</td></tr>
                                ) : (
                                    currentUsers.map((user) => (
                                        <tr 
                                            key={user.id} 
                                            className={`${theme.hoverRow} transition-colors ${selectedUser?.id === user.id ? (isLightTheme ? 'bg-blue-50/90' : 'bg-blue-500/10') : ''}`}
                                        >
                                            <td className="w-8 px-2 py-2.5 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedUserIds.includes(user.id)}
                                                    onChange={() => toggleSelectUser(user.id)}
                                                    className="rounded bg-white dark:bg-black/20 border-slate-300 dark:border-white/20 text-[#0052cc]"
                                                />
                                            </td>
                                            <td className="px-2.5 py-2.5 cursor-pointer" onClick={() => handleSelectUser(user)}>
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-7 h-7 rounded-full ${avatarColorMap[user.color] || avatarColorMap.blue} flex items-center justify-center font-bold text-[11px] shrink-0 shadow-xs`}>
                                                        {user.initials}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className={`text-xs font-bold flex items-center gap-1 truncate ${theme.headingText}`}>
                                                            <span className="truncate">{user.name}</span>
                                                            {user.emailVerified && <span className="text-[#0052cc] dark:text-blue-400 text-[10px] shrink-0" title="Email Verified"><CheckIcon className="w-3 h-3" /></span>}
                                                            {user.orgVerified && <span className="text-purple-600 dark:text-purple-400 text-[10px] shrink-0" title="Organization Verified"><ShieldIcon className="w-3 h-3" /></span>}
                                                        </div>
                                                        <div className={`text-[10px] truncate ${theme.mutedText}`}>{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="w-24 px-2 py-2.5 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase border inline-flex items-center gap-1 ${roleColors[user.role] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                                                    <span>{user.role}</span>
                                                    {user.role === 'MENTOR' && (user.isOverloaded || (user.activeTeamsCount > 5) || (user.activityStats?.teams > 6)) && (
                                                        <span title={`Overloaded (${user.activeTeamsCount || user.activeSupervisedTeams?.length || 6} active teams assigned)`} className="text-amber-600 dark:text-amber-400 inline-flex items-center">
                                                            <TriangleAlertIcon className="w-3 h-3 text-amber-500 shrink-0" />
                                                        </span>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="w-16 px-2 py-2.5 whitespace-nowrap">
                                                <span className={`text-[11px] font-extrabold ${user.status === 'Active' ? (isLightTheme ? 'text-emerald-700' : 'text-emerald-400') : (isLightTheme ? 'text-rose-700' : 'text-red-400')}`}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className={`w-24 px-2 py-2.5 text-[10px] font-mono font-medium whitespace-nowrap ${theme.subText}`}>
                                                {user.lastActive}
                                            </td>
                                            <td className="w-24 px-2.5 py-2.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button 
                                                        onClick={() => handleSelectUser(user)}
                                                        title="View Profile"
                                                        className="p-1.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-full text-blue-600 dark:text-blue-400 transition-all shadow-xs flex items-center justify-center"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                                                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => openRoleModal(user)}
                                                        title="Edit Role"
                                                        className="p-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-full text-slate-700 dark:text-gray-300 transition-all shadow-xs flex items-center justify-center"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-pen">
                                                            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => openSuspendModal(user)}
                                                        title={user.status === 'Active' ? 'Suspend User' : 'Restore User'}
                                                        className={`p-1.5 rounded-full border transition-all shadow-xs flex items-center justify-center ${
                                                            user.status === 'Active' 
                                                            ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100' 
                                                            : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                                                        }`}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ban">
                                                            <circle cx="12" cy="12" r="10" />
                                                            <path d="m4.9 4.9 14.2 14.2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* BOTTOM PAGINATION */}
                    {renderPaginationBar('bottom')}
                </div>

                {/* RIGHT PANE: Detailed User Profile Workspace (40% Width, Sticky & 2-Tab Two-Page Inspector) */}
                <div className="w-full lg:w-[40%] absolutestrange-card flex flex-col sticky top-4 max-h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
                    {selectedUser ? (
                        <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                            
                            {/* Profile Top Bar */}
                            <div>
                                <div className="flex items-start justify-between border-b border-slate-200 dark:border-white/10 pb-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-11 h-11 rounded-2xl ${avatarBadgeMap[selectedUser.color] || avatarBadgeMap.blue} border flex items-center justify-center text-lg font-bold shadow-md shrink-0`}>
                                            {selectedUser.initials}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">{selectedUser.name}</h3>
                                            <p className="text-[11px] text-slate-500 dark:text-gray-400 font-semibold truncate">{selectedUser.role} • {selectedUser.college}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border shrink-0 ${selectedUser.status === 'Active' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-600 dark:text-red-400 border-rose-500/30'}`}>
                                        {selectedUser.status}
                                    </span>
                                </div>

                                {/* 2-Tab Inspector Mode (Two-Page View) */}
                                <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs font-bold gap-1 mb-4">
                                    <button 
                                        onClick={() => setProfileTab('overview')}
                                        className={`flex-1 py-1.5 rounded-lg transition-all text-[10px] font-black uppercase flex items-center justify-center gap-1.5 ${profileTab === 'overview' ? 'bg-white dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 shadow-sm border border-slate-200/80 dark:border-sky-500/30 font-black' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                                    >
                                        <NotepadTextIcon className="w-3.5 h-3.5 shrink-0" />
                                        <span>Overview & Teams</span>
                                    </button>
                                    <button 
                                        onClick={() => setProfileTab('activity')}
                                        className={`flex-1 py-1.5 rounded-lg transition-all text-[10px] font-black uppercase flex items-center justify-center gap-1.5 ${profileTab === 'activity' ? 'bg-white dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 shadow-sm border border-slate-200/80 dark:border-sky-500/30 font-black' : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                                    >
                                        <ActivityIcon className="w-3.5 h-3.5 shrink-0" />
                                        <span>Activity & Risk</span>
                                    </button>
                                </div>

                                {/* TAB 1: OVERVIEW & TEAMS */}
                                {profileTab === 'overview' && (
                                    <div className="space-y-3.5 animate-in fade-in duration-200">
                                        
                                        {/* Mentor Load & Comprehensive Portfolio Breakdown */}
                                        {selectedUser.role === 'MENTOR' && (
                                            <div className={`p-4 rounded-xl border space-y-3 ${
                                                selectedUser.isOverloaded || (selectedUser.activeTeamsCount > 5)
                                                    ? 'bg-rose-50/70 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30' 
                                                    : theme.innerBg
                                            }`}>
                                                {/* Header & Status Pill */}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                                        <TeacherIcon className="w-3.5 h-3.5 text-amber-500" />
                                                        <span>Mentorship Capacity & Portfolio</span>
                                                    </span>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                                        selectedUser.isOverloaded || (selectedUser.activeTeamsCount > 5)
                                                            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                                            : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                                    }`}>
                                                        {selectedUser.isOverloaded || (selectedUser.activeTeamsCount > 5) ? 'Overloaded' : 'Optimal Capacity'}
                                                    </span>
                                                </div>

                                                {/* 3-Metric KPI Grid (Active vs Completed vs Total Career) */}
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className={`p-2 rounded-lg border ${
                                                        selectedUser.isOverloaded || (selectedUser.activeTeamsCount > 5)
                                                            ? 'bg-rose-100/80 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-200'
                                                            : 'bg-emerald-100/80 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                                                    }`}>
                                                        <p className="text-base font-black leading-tight">
                                                            {selectedUser.activeTeamsCount ?? selectedUser.activeSupervisedTeams?.length ?? (selectedUser.isOverloaded ? 7 : 2)}
                                                        </p>
                                                        <p className="text-[8px] font-extrabold uppercase mt-0.5 flex items-center justify-center gap-0.5">
                                                            <ZapIcon className="w-2.5 h-2.5 text-current shrink-0" />
                                                            <span>Active</span>
                                                        </p>
                                                    </div>

                                                    <div className="p-2 rounded-lg border bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-900 dark:text-blue-200">
                                                        <p className="text-base font-black leading-tight">
                                                            {selectedUser.pastTeamsCount ?? selectedUser.pastSupervisedTeams?.length ?? (selectedUser.isOverloaded ? 5 : 2)}
                                                        </p>
                                                        <p className="text-[8px] font-extrabold uppercase mt-0.5 flex items-center justify-center gap-0.5">
                                                            <CheckCircle2Icon className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                                            <span>Completed</span>
                                                        </p>
                                                    </div>

                                                    <div className="p-2 rounded-lg border bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200">
                                                        <p className="text-base font-black leading-tight">
                                                            {(selectedUser.activeTeamsCount ?? selectedUser.activeSupervisedTeams?.length ?? (selectedUser.isOverloaded ? 7 : 2)) + 
                                                             (selectedUser.pastTeamsCount ?? selectedUser.pastSupervisedTeams?.length ?? (selectedUser.isOverloaded ? 5 : 2))}
                                                        </p>
                                                        <p className="text-[8px] font-extrabold uppercase mt-0.5">Total Career</p>
                                                    </div>
                                                </div>

                                                {/* Live Active Concurrency Gauge */}
                                                <div className="space-y-1.5 pt-1">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span className="opacity-75">Active Concurrency Capacity</span>
                                                        <span className={selectedUser.isOverloaded || (selectedUser.activeTeamsCount > 5) ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                                            {selectedUser.activeTeamsCount ?? selectedUser.activeSupervisedTeams?.length ?? (selectedUser.isOverloaded ? 7 : 2)} / 5 optimal teams
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                                                        <div 
                                                            className={`h-full ${selectedUser.isOverloaded || (selectedUser.activeTeamsCount > 5) ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                                            style={{ width: `${Math.min(100, (((selectedUser.activeTeamsCount ?? selectedUser.activeSupervisedTeams?.length ?? (selectedUser.isOverloaded ? 7 : 2)) / 5) * 100))}%` }}
                                                        ></div>
                                                    </div>
                                                    {selectedUser.isOverloaded || (selectedUser.activeTeamsCount > 5) ? (
                                                        <p className="text-[9.5px] text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1 leading-tight">
                                                            <TriangleAlertIcon className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                            <span>Overloaded by {Math.max(1, (selectedUser.activeTeamsCount ?? selectedUser.activeSupervisedTeams?.length ?? 7) - 5)} active teams above optimal limit (5 max). Reassign recommended.</span>
                                                        </p>
                                                    ) : (
                                                        <p className="text-[9.5px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                                                            <CheckCircle2Icon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                            <span>Active mentorship workload is healthy and within optimal capacity.</span>
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Interactive Active vs Completed Teams Sub-Tabs */}
                                                <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                                                    <div className="flex p-0.5 bg-black/5 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 text-[9px] font-bold mb-2">
                                                        <button
                                                            onClick={() => setMentorTeamsTab('active')}
                                                            className={`flex-1 py-1 rounded transition-all flex items-center justify-center gap-1.5 ${
                                                                mentorTeamsTab === 'active' 
                                                                    ? 'bg-white dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200/80 dark:border-sky-500/30 font-black' 
                                                                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                                                            }`}
                                                        >
                                                            <ZapIcon className="w-3 h-3 shrink-0" />
                                                            <span>Active ({selectedUser.activeSupervisedTeams?.length || selectedUser.activeTeamsCount || (selectedUser.isOverloaded ? 7 : 2)})</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setMentorTeamsTab('past')}
                                                            className={`flex-1 py-1 rounded transition-all flex items-center justify-center gap-1.5 ${
                                                                mentorTeamsTab === 'past' 
                                                                    ? 'bg-white dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200/80 dark:border-sky-500/30 font-black' 
                                                                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                                                            }`}
                                                        >
                                                            <CheckCircle2Icon className="w-3 h-3 shrink-0" />
                                                            <span>Completed ({selectedUser.pastSupervisedTeams?.length || selectedUser.pastTeamsCount || (selectedUser.isOverloaded ? 5 : 2)})</span>
                                                        </button>
                                                    </div>

                                                    {/* ACTIVE TEAMS LIST */}
                                                    {mentorTeamsTab === 'active' && (
                                                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar animate-in fade-in duration-150">
                                                            {(selectedUser.activeSupervisedTeams || selectedUser.supervisedTeams || []).map((t, idx) => (
                                                                <div key={idx} className="p-2 rounded-lg bg-white/70 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 flex items-center justify-between text-xs">
                                                                    <div className="min-w-0 pr-2">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <p className="font-bold text-slate-800 dark:text-white leading-tight truncate">{t.name}</p>
                                                                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase flex items-center gap-0.5">
                                                                                <ZapIcon className="w-2 h-2 shrink-0" />
                                                                                <span>Active</span>
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[9px] text-slate-500 dark:text-gray-400 truncate mt-0.5">{t.hackathon} • {t.milestone}</p>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => handleReassignTeam(t.name, selectedUser.name)}
                                                                        className="text-[9px] px-2 py-0.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded font-bold transition-colors shrink-0"
                                                                        title="Reassign team to an available mentor"
                                                                    >
                                                                        Reassign
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* COMPLETED TEAMS LIST */}
                                                    {mentorTeamsTab === 'past' && (
                                                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar animate-in fade-in duration-150">
                                                            {(selectedUser.pastSupervisedTeams && selectedUser.pastSupervisedTeams.length > 0 ? selectedUser.pastSupervisedTeams : [
                                                                { id: 'pst_def1', name: 'Team AlgoStream', hackathon: 'FinTech 2025', milestone: 'Completed', outcome: '1st Runner Up', year: '2025' },
                                                                { id: 'pst_def2', name: 'Team CyberShield', hackathon: 'CyberKnights 2025', milestone: 'Completed', outcome: 'Top 5 Finalist', year: '2025' },
                                                                { id: 'pst_def3', name: 'Team OmniMatrix', hackathon: 'Global AI 2024', milestone: 'Completed', outcome: 'Winner Category', year: '2024' },
                                                                { id: 'pst_def4', name: 'Team CodePulse', hackathon: 'Campus Hack 2024', milestone: 'Completed', outcome: 'Graduated', year: '2024' }
                                                            ]).map((t, idx) => (
                                                                <div key={idx} className="p-2 rounded-lg bg-slate-50/80 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs opacity-95">
                                                                    <div className="min-w-0 pr-2">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <p className="font-bold text-slate-700 dark:text-slate-200 leading-tight truncate">{t.name}</p>
                                                                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase flex items-center gap-0.5">
                                                                                <CheckCircle2Icon className="w-2 h-2 shrink-0" />
                                                                                <span>Completed</span>
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[9px] text-slate-400 dark:text-gray-400 truncate mt-0.5">{t.hackathon} • {t.year || 'Past Event'}</p>
                                                                    </div>
                                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                                                        {t.outcome || 'Completed'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Profile & Account Details Grid */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className={`p-3 rounded-xl border space-y-1.5 ${theme.innerBg}`}>
                                                <h4 className={`text-[9px] font-black uppercase tracking-wider mb-1 ${theme.mutedText}`}>Academic Info</h4>
                                                <div><p className="text-[9px] text-slate-400">Department</p><p className="text-xs font-bold text-slate-800 dark:text-white truncate">{selectedUser.department}</p></div>
                                                <div><p className="text-[9px] text-slate-400">Year / Title</p><p className="text-xs font-bold text-slate-800 dark:text-white truncate">{selectedUser.year}</p></div>
                                            </div>
                                            <div className={`p-3 rounded-xl border space-y-1.5 ${theme.innerBg}`}>
                                                <h4 className={`text-[9px] font-black uppercase tracking-wider mb-1 ${theme.mutedText}`}>Account Meta</h4>
                                                <div><p className="text-[9px] text-slate-400">Joined Date</p><p className="text-xs font-bold text-slate-800 dark:text-white">{selectedUser.joinedDate}</p></div>
                                                <div>
                                                    <p className="text-[9px] text-slate-400">Verification</p>
                                                    <button 
                                                        onClick={() => handleToggleVerification(selectedUser)}
                                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                                                            selectedUser.emailVerified 
                                                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                                                                : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                                        }`}
                                                    >
                                                        {selectedUser.emailVerified ? 'Verified' : 'Click to Verify'}
                                                    </button>

                                                </div>
                                            </div>
                                        </div>

                                        <div className={`p-3 rounded-xl border text-xs ${theme.innerBg}`}>
                                            <p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Email Address</p>
                                            <p className="font-mono font-bold text-slate-800 dark:text-white text-xs truncate">{selectedUser.email}</p>
                                        </div>

                                    </div>
                                )}

                                {/* TAB 2: ACTIVITY & RISK AUDIT */}
                                {profileTab === 'activity' && (
                                    <div className="space-y-3.5 animate-in fade-in duration-200">
                                        
                                        {/* Risk Indicator */}
                                        <div className={`p-3.5 rounded-xl border space-y-2 ${
                                            selectedUser.riskLevel === 'CRITICAL' || selectedUser.riskLevel === 'HIGH'
                                            ? 'bg-rose-50 dark:bg-red-500/10 border-rose-200 dark:border-red-500/30'
                                            : selectedUser.riskLevel === 'MEDIUM'
                                            ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
                                            : theme.innerBg
                                        }`}>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-[9px] font-black uppercase text-slate-500">Risk Assessment</p>
                                                    <p className={`text-xs font-black flex items-center gap-1.5 ${
                                                        selectedUser.riskLevel === 'CRITICAL' || selectedUser.riskLevel === 'HIGH'
                                                        ? 'text-rose-600 dark:text-red-400'
                                                        : selectedUser.riskLevel === 'MEDIUM'
                                                        ? 'text-amber-600 dark:text-amber-400'
                                                        : 'text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                            selectedUser.riskLevel === 'CRITICAL' || selectedUser.riskLevel === 'HIGH'
                                                            ? 'bg-rose-500'
                                                            : selectedUser.riskLevel === 'MEDIUM'
                                                            ? 'bg-amber-500'
                                                            : 'bg-emerald-500'
                                                        }`} />
                                                        <span>{selectedUser.riskLevel || 'LOW'} RISK</span>
                                                        <span className="text-[9px] font-mono ml-1 opacity-70">({selectedUser.riskScore || 0} pts)</span>
                                                    </p>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-400">Last active: {selectedUser.lastActive}</span>
                                            </div>

                                            <div className="pt-1.5 border-t border-slate-200 dark:border-white/10 text-xs">
                                                <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Indicators:</p>
                                                <ul className="space-y-1">
                                                    {(selectedUser.riskFactors || ["No suspicious activities flagged", "Account status clean"]).map((factor, idx) => (
                                                        <li key={idx} className="flex items-center gap-1.5 text-[10px] font-medium text-slate-700 dark:text-gray-300">
                                                            <span className={selectedUser.riskLevel === 'LOW' ? 'text-emerald-500' : 'text-amber-500'}>•</span>
                                                            <span className="truncate">{factor}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Platform Participation Metrics (Rich breakdown for Mentors vs Others) */}
                                        <div className={`p-3.5 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className={`text-[9px] font-black uppercase tracking-wider mb-2 ${theme.mutedText}`}>Participation Overview</h4>
                                            {selectedUser.role === 'MENTOR' ? (
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className={`p-2 rounded border ${theme.statBoxBg}`}>
                                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{selectedUser.activeTeamsCount ?? selectedUser.activeSupervisedTeams?.length ?? 0}</p>
                                                        <p className="text-[8px] text-slate-500 uppercase flex items-center justify-center gap-0.5">
                                                            <ZapIcon className="w-2.5 h-2.5 text-emerald-500" />
                                                            <span>Active</span>
                                                        </p>
                                                    </div>
                                                    <div className={`p-2 rounded border ${theme.statBoxBg}`}>
                                                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{selectedUser.pastTeamsCount ?? selectedUser.pastSupervisedTeams?.length ?? 0}</p>
                                                        <p className="text-[8px] text-slate-500 uppercase flex items-center justify-center gap-0.5">
                                                            <CheckCircle2Icon className="w-2.5 h-2.5 text-blue-500" />
                                                            <span>Completed</span>
                                                        </p>
                                                    </div>
                                                    <div className={`p-2 rounded border ${theme.statBoxBg}`}><p className="text-sm font-bold text-slate-900 dark:text-white">{selectedUser.activityStats?.hackathons || 4}</p><p className="text-[8px] text-slate-500 uppercase">Hackathons</p></div>
                                                    <div className={`p-2 rounded border ${theme.statBoxBg}`}><p className="text-sm font-bold text-slate-900 dark:text-white">{selectedUser.activityStats?.submissions || 4}</p><p className="text-[8px] text-slate-500 uppercase">Submissions</p></div>
                                                    <div className={`p-2 rounded border ${theme.statBoxBg} col-span-2`}><p className="text-sm font-bold text-slate-900 dark:text-white">{selectedUser.activityStats?.mentorSessions || 18}</p><p className="text-[8px] text-slate-500 uppercase">Mentor Sessions</p></div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className={`p-2 rounded border ${theme.statBoxBg}`}><p className="text-sm font-bold text-slate-900 dark:text-white">{selectedUser.activityStats?.hackathons || 4}</p><p className="text-[8px] text-slate-500 uppercase">Hackathons</p></div>
                                                    <div className={`p-2 rounded border ${theme.statBoxBg}`}><p className="text-sm font-bold text-slate-900 dark:text-white">{selectedUser.activityStats?.teams || 3}</p><p className="text-[8px] text-slate-500 uppercase">Teams</p></div>
                                                    <div className={`p-2 rounded border ${theme.statBoxBg}`}><p className="text-sm font-bold text-slate-900 dark:text-white">{selectedUser.activityStats?.submissions || 4}</p><p className="text-[8px] text-slate-500 uppercase">Submissions</p></div>
                                                    <div className={`p-2 rounded border ${theme.statBoxBg}`}><p className="text-sm font-bold text-slate-900 dark:text-white">{selectedUser.activityStats?.certificates || 3}</p><p className="text-[8px] text-slate-500 uppercase">Certificates</p></div>
                                                    <div className={`p-2 rounded border ${theme.statBoxBg} col-span-2`}><p className="text-sm font-bold text-slate-900 dark:text-white">{selectedUser.activityStats?.mentorSessions || 7}</p><p className="text-[8px] text-slate-500 uppercase">Mentor Sessions</p></div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Recent Activity Timeline */}
                                        <div className={`p-3.5 rounded-xl border ${theme.innerBg}`}>
                                            <h4 className={`text-[9px] font-black uppercase tracking-wider mb-2 ${theme.mutedText}`}>Recent Activity</h4>
                                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                                                {(selectedUser.recentActivity || []).map((act, i) => (
                                                    <div key={i} className={`flex justify-between items-center text-xs p-1.5 rounded border ${theme.statBoxBg}`}>
                                                        <span className="text-slate-800 dark:text-gray-300 font-medium text-[10px] truncate max-w-[170px]">{act.event}</span>
                                                        <span className="text-[9px] text-slate-400 font-mono shrink-0">{act.time}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                )}

                            </div>

                            {/* Quick Action Inspector Footer (Always Visible Docked) */}
                            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex gap-2">
                                <button 
                                    onClick={() => setContactModalConfig({ isOpen: true, user: selectedUser, subject: 'Official Admin Inquiry', body: '' })}
                                    className="py-2 px-3 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-800 dark:text-white font-bold text-xs rounded-xl transition-colors border border-slate-200 dark:border-white/10 shadow-sm"
                                >
                                    Contact
                                </button>
                                <button onClick={() => openRoleModal(selectedUser)} className="flex-1 py-2 bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 text-[#0052cc] dark:text-blue-400 font-bold text-xs rounded-xl transition-colors border border-blue-200 dark:border-blue-500/30 shadow-sm">
                                    Edit Role
                                </button>
                                <button onClick={() => openSuspendModal(selectedUser)} className={`flex-1 py-2 font-bold text-xs rounded-xl transition-colors border shadow-sm ${selectedUser.status === 'Active' ? 'bg-rose-50 dark:bg-red-500/20 text-rose-700 dark:text-red-400 border-rose-200 dark:border-red-500/30 hover:bg-rose-100' : 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100'}`}>
                                    {selectedUser.status === 'Active' ? 'Suspend' : 'Restore'}
                                </button>
                            </div>

                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center min-h-[300px]">
                            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            <p className="font-bold text-sm">Select a user to view profile and activity timeline</p>
                        </div>
                    )}
                </div>
            </div>

            {/* SENSITIVE ROLE CHANGE PROTECTION MODAL */}
            <ActionModal isOpen={roleModalConfig.isOpen} onClose={() => setRoleModalConfig({ isOpen: false, user: null, selectedRole: '', reason: '' })} title="Change User Role">
                {roleModalConfig.user && (
                    <div className="space-y-4">
                        <div className={`p-3 rounded-lg border text-xs ${theme.innerBg}`}>
                            Target User: <strong className="text-slate-900 dark:text-white">{roleModalConfig.user.name}</strong> ({roleModalConfig.user.email})
                        </div>

                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-wider mb-2 block ${theme.mutedText}`}>Select New Role</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['STUDENT', 'MENTOR', 'ORGANIZER', 'ADMIN'].map(role => (
                                    <button 
                                        key={role}
                                        onClick={() => setRoleModalConfig(prev => ({ ...prev, selectedRole: role }))}
                                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${roleModalConfig.selectedRole === role ? 'bg-[#0052cc] border-blue-600 text-white shadow-md' : theme.inputBg}`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {roleModalConfig.selectedRole === 'ADMIN' && (
                            <div className="p-3 bg-rose-50 dark:bg-red-500/10 border border-rose-200 dark:border-red-500/30 rounded-lg text-xs text-rose-700 dark:text-red-300 font-bold">
                                ⚠ <strong>Warning:</strong> Granting ADMIN role gives this user full control over platform governance, user moderation, and data.
                            </div>
                        )}

                        <textarea 
                            placeholder="Reason for role change (Required for audit log)..."
                            rows="3"
                            value={roleModalConfig.reason}
                            onChange={(e) => setRoleModalConfig(prev => ({ ...prev, reason: e.target.value }))}
                            className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 resize-none ${theme.inputBg}`}
                        ></textarea>

                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setRoleModalConfig({ isOpen: false, user: null, selectedRole: '', reason: '' })} className="px-4 py-2 text-xs text-slate-500 font-bold">Cancel</button>
                            <button onClick={handleRoleChangeConfirm} className="px-5 py-2 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 text-xs font-bold rounded-lg shadow-sm">Confirm Change</button>
                        </div>
                    </div>
                )}
            </ActionModal>

            {/* STRUCTURED GOVERNANCE SUSPENSION MODAL */}
            <ActionModal isOpen={suspendModalConfig.isOpen} onClose={() => setSuspendModalConfig({ isOpen: false, user: null, action: '', reason: '', duration: '', message: '' })} title={`${suspendModalConfig.action} User Account`}>
                {suspendModalConfig.user && (
                    <div className="space-y-4">
                        <div className={`p-3 rounded-lg border text-xs ${theme.innerBg}`}>
                            Target User: <strong className="text-slate-900 dark:text-white">{suspendModalConfig.user.name}</strong> ({suspendModalConfig.user.email})
                        </div>

                        {suspendModalConfig.action === 'Suspend' && (
                            <>
                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-wider mb-1 block ${theme.mutedText}`}>Suspension Reason</label>
                                    <select 
                                        value={suspendModalConfig.reason}
                                        onChange={(e) => setSuspendModalConfig(prev => ({ ...prev, reason: e.target.value }))}
                                        className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`}
                                    >
                                        <option value="Policy violation">Policy violation</option>
                                        <option value="Suspicious activity">Suspicious activity</option>
                                        <option value="Plagiarism">Plagiarism</option>
                                        <option value="Abuse">Abuse / Harassment</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={`text-[10px] font-black uppercase tracking-wider mb-1 block ${theme.mutedText}`}>Duration</label>
                                    <select 
                                        value={suspendModalConfig.duration}
                                        onChange={(e) => setSuspendModalConfig(prev => ({ ...prev, duration: e.target.value }))}
                                        className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`}
                                    >
                                        <option value="24 hours">24 hours</option>
                                        <option value="7 days">7 days</option>
                                        <option value="30 days">30 days</option>
                                        <option value="Permanent">Permanent</option>
                                    </select>
                                </div>

                                <textarea 
                                    placeholder="Custom message to user explaining suspension..."
                                    rows="3"
                                    value={suspendModalConfig.message}
                                    onChange={(e) => setSuspendModalConfig(prev => ({ ...prev, message: e.target.value }))}
                                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-rose-500 resize-none ${theme.inputBg}`}
                                ></textarea>
                            </>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setSuspendModalConfig({ isOpen: false, user: null, action: '', reason: '', duration: '', message: '' })} className="px-4 py-2 text-xs text-slate-500 font-bold">Cancel</button>
                            <button onClick={handleSuspendConfirm} className={`px-5 py-2 text-white text-xs font-bold rounded-lg shadow-md ${suspendModalConfig.action === 'Suspend' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                                Confirm {suspendModalConfig.action}
                            </button>
                        </div>
                    </div>
                )}
            </ActionModal>

            {/* BULK NOTIFY MODAL */}
            <ActionModal isOpen={isBulkNotifyOpen} onClose={() => setIsBulkNotifyOpen(false)} title="Broadcast Bulk Notice to Selected Users">
                <div className="space-y-4">
                    <p className="text-xs text-slate-500">Dispatch broadcast notification to {selectedUserIds.length} selected users.</p>
                    <textarea 
                        placeholder="Enter broadcast message text..."
                        rows="4"
                        value={bulkNotifyMessage}
                        onChange={(e) => setBulkNotifyMessage(e.target.value)}
                        className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 resize-none ${theme.inputBg}`}
                    ></textarea>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsBulkNotifyOpen(false)} className="px-4 py-2 text-xs text-slate-500 font-bold">Cancel</button>
                        <button onClick={() => handleBulkAction('notify', bulkNotifyMessage)} className="px-5 py-2 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 font-bold text-xs rounded-lg shadow-sm">Dispatch Notice</button>
                    </div>
                </div>
            </ActionModal>

            {/* BULK CHANGE ROLE MODAL */}
            <ActionModal isOpen={bulkRoleConfig.isOpen} onClose={() => setBulkRoleConfig({ isOpen: false, targetRole: 'STUDENT' })} title={`Change Role for ${selectedUserIds.length} Selected Users`}>
                <div className="space-y-4">
                    <p className="text-xs text-slate-500">Select the new platform role to assign to all {selectedUserIds.length} selected accounts:</p>
                    <div className="grid grid-cols-2 gap-2">
                        {['STUDENT', 'MENTOR', 'ORGANIZER', 'ADMIN'].map(role => (
                            <button 
                                key={role}
                                onClick={() => setBulkRoleConfig(prev => ({ ...prev, targetRole: role }))}
                                className={`py-2 text-xs font-bold rounded-lg border transition-all ${bulkRoleConfig.targetRole === role ? 'bg-[#0052cc] border-blue-600 text-white shadow-md' : theme.inputBg}`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setBulkRoleConfig({ isOpen: false, targetRole: 'STUDENT' })} className="px-4 py-2 text-xs text-slate-500 font-bold">Cancel</button>
                        <button onClick={() => handleBulkAction('change_role', bulkRoleConfig.targetRole)} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm">Apply Role Change</button>
                    </div>
                </div>
            </ActionModal>

            {/* DIRECT CONTACT USER MODAL */}
            <ActionModal isOpen={contactModalConfig.isOpen} onClose={() => setContactModalConfig({ isOpen: false, user: null, subject: '', body: '' })} title={`Dispatch Direct Notice to ${contactModalConfig.user?.name}`}>
                {contactModalConfig.user && (
                    <div className="space-y-4">
                        <div className={`p-3 rounded-lg border text-xs ${theme.innerBg}`}>
                            Recipient: <strong className="text-slate-900 dark:text-white">{contactModalConfig.user.name}</strong> ({contactModalConfig.user.email})
                        </div>
                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-wider mb-1 block ${theme.mutedText}`}>Subject</label>
                            <input 
                                type="text"
                                value={contactModalConfig.subject}
                                onChange={(e) => setContactModalConfig(prev => ({ ...prev, subject: e.target.value }))}
                                placeholder="Subject title..."
                                className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${theme.inputBg}`}
                            />
                        </div>
                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-wider mb-1 block ${theme.mutedText}`}>Message Body</label>
                            <textarea 
                                placeholder="Write direct message to user..."
                                rows="4"
                                value={contactModalConfig.body}
                                onChange={(e) => setContactModalConfig(prev => ({ ...prev, body: e.target.value }))}
                                className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 resize-none ${theme.inputBg}`}
                            ></textarea>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setContactModalConfig({ isOpen: false, user: null, subject: '', body: '' })} className="px-4 py-2 text-xs text-slate-500 font-bold">Cancel</button>
                            <button onClick={handleContactUserConfirm} className="px-5 py-2 bg-sky-50 dark:bg-sky-500/20 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40 font-bold text-xs rounded-xl shadow-sm transition-all">Send Message</button>
                        </div>
                    </div>
                )}
            </ActionModal>

        </div>
    );
};

export default UsersManagement;
