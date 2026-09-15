/**
 * Admin Settings Mock API
 * Connected to localStorage for managing platform config and admin access without a backend,
 * but simulates real API network latency to trigger UI loading states correctly.
 */

const INITIAL_SETTINGS = {
    platformName: 'Hackathon Command Center',
    supportEmail: 'support@hackathon.com',
    publicRegistrations: false,
    maintenanceMode: false
};

const INITIAL_ADMINS = [
    { id: '1', user: 'Admin One', email: 'admin1@test.com', role: 'Super Admin', avatar: 'A1' },
    { id: '2', user: 'Admin Two', email: 'admin2@test.com', role: 'Moderator', avatar: 'A2' }
];

const getStorage = (key, defaultData) => {
    const data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
};

const setStorage = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// Re-introducing latency to simulate real API behavior
const simulateDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const getPlatformSettings = async () => {
    await simulateDelay(600);
    return getStorage('mock_admin_settings', INITIAL_SETTINGS);
};

export const updatePlatformSettings = async (newSettings) => {
    await simulateDelay(800);
    setStorage('mock_admin_settings', newSettings);
    return newSettings;
};

export const getAdmins = async () => {
    await simulateDelay(600);
    return getStorage('mock_admin_list', INITIAL_ADMINS);
};

export const addAdmin = async (adminData) => {
    await simulateDelay(800);
    const admins = getStorage('mock_admin_list', INITIAL_ADMINS);
    const newAdmin = {
        id: Math.random().toString(36).substr(2, 9),
        user: adminData.user || 'New Admin',
        email: adminData.email || 'new@test.com',
        role: adminData.role || 'Moderator',
        avatar: (adminData.user || 'NA').substring(0, 2).toUpperCase()
    };
    admins.push(newAdmin);
    setStorage('mock_admin_list', admins);
    return { success: true, admin: newAdmin };
};

export const removeAdmin = async (id) => {
    await simulateDelay(600);
    let admins = getStorage('mock_admin_list', INITIAL_ADMINS);
    admins = admins.filter(admin => admin.id !== id);
    setStorage('mock_admin_list', admins);
    return { success: true, admins };
import apiClient from '../../api/api';

/**
 * Admin Settings API
 * Connected to live backend endpoints for managing platform configuration, RBAC, sessions, and audit logs.
 */

export const fetchPlatformSettings = async () => {
    try {
        const { data } = await apiClient.get('/admin/settings');
        return data;
    } catch (error) {
        console.error('Failed to fetch platform settings, attempting fallback:', error);
        try {
            const { data: fallbackData } = await apiClient.get('/dashboard/settings');
            return fallbackData;
        } catch (e) {
            console.error('Fallback settings fetch failed:', e);
            throw error;
        }
    }
};

export const updatePlatformSettings = async (payload) => {
    try {
        const { data } = await apiClient.put('/admin/settings', payload);
        return data;
    } catch (error) {
        console.error('Failed to update platform settings, trying dashboard fallback:', error);
        const { data: fallbackData } = await apiClient.put('/dashboard/settings', payload);
        return fallbackData;
    }
};

export const fetchAdminsList = async () => {
    try {
        const { data } = await apiClient.get('/admin/settings/admins');
        return data;
    } catch (error) {
        console.error('Failed to fetch admins, trying dashboard fallback:', error);
        const { data: fallbackData } = await apiClient.get('/dashboard/admins');
        return fallbackData;
    }
};

export const createAdmin = async (payload) => {
    try {
        const { data } = await apiClient.post('/admin/settings/admins', payload);
        return data;
    } catch (error) {
        console.error('Failed to invite/promote admin:', error);
        throw error;
    }
};

export const updateAdminPermissions = async (adminId, payload) => {
    try {
        const { data } = await apiClient.put(`/admin/settings/admins/${adminId}/permissions`, payload);
        return data;
    } catch (error) {
        console.error('Failed to update admin permissions:', error);
        throw error;
    }
};

export const revokeAdminAccess = async (adminId) => {
    try {
        const { data } = await apiClient.delete(`/admin/settings/admins/${adminId}`);
        return data;
    } catch (error) {
        console.error('Failed to revoke admin:', error);
        throw error;
    }
};

export const fetchActiveSessions = async () => {
    try {
        const { data } = await apiClient.get('/admin/settings/sessions');
        return data;
    } catch (error) {
        console.error('Failed to fetch active sessions:', error);
        return [];
    }
};

export const revokeSession = async (sessionId) => {
    try {
        const { data } = await apiClient.delete(`/admin/settings/sessions/${sessionId}`);
        return data;
    } catch (error) {
        console.error('Failed to revoke session:', error);
        throw error;
    }
};

export const revokeAllOtherSessions = async () => {
    try {
        const { data } = await apiClient.post('/admin/settings/sessions/revoke-all');
        return data;
    } catch (error) {
        console.error('Failed to revoke all other sessions:', error);
        throw error;
    }
};

export const fetchAuditLogs = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.admin) params.append('admin', filters.admin);
        if (filters.category) params.append('category', filters.category);
        if (filters.dateRange) params.append('dateRange', filters.dateRange);

        const { data } = await apiClient.get(`/admin/settings/audit-logs?${params.toString()}`);
        return data;
    } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        return [];
    }
};

export const uploadPlatformLogo = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await apiClient.post('/admin/settings/branding/logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data;
    } catch (error) {
        console.error('Failed to upload platform logo:', error);
        throw error;
    }
};

export const sendTestNotification = async (alertType) => {
    try {
        const { data } = await apiClient.post('/admin/settings/notifications/test', { alertType });
        return data;
    } catch (error) {
        console.error('Failed to dispatch test notification:', error);
        throw error;
    }
};

export const broadcastPlatformAnnouncement = async (payload) => {
    try {
        const { data } = await apiClient.post('/admin/settings/notifications/broadcast', payload);
        return data;
    } catch (error) {
        console.error('Failed to broadcast announcement:', error);
        throw error;
    }
};

export const fetchNotificationHistory = async () => {
    try {
        const { data } = await apiClient.get('/admin/settings/notifications/history');
        return data;
    } catch (error) {
        console.error('Failed to fetch notification history:', error);
        return [];
    }
};


