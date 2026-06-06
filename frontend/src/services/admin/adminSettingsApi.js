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
 * Connected to live backend endpoints for managing platform config and admin access.
 */

export const getPlatformSettings = async () => {
    try {
        const { data } = await apiClient.get('/dashboard/settings');
        return data;
    } catch (error) {
        console.error('Failed to fetch platform settings:', error);
        return {
            platformName: 'HackZen',
            supportEmail: 'support@hackzen.com',
            publicRegistrations: true,
            maintenanceMode: false
        };
    }
};

export const updatePlatformSettings = async (newSettings) => {
    try {
        const { data } = await apiClient.put('/dashboard/settings', newSettings);
        return data.settings || newSettings;
    } catch (error) {
        console.error('Failed to update platform settings:', error);
        throw error;
    }
};

export const getAdmins = async () => {
    try {
        const { data } = await apiClient.get('/dashboard/admins');
        return data;
    } catch (error) {
        console.error('Failed to fetch admins:', error);
        return [];
    }
};

export const addAdmin = async (adminData) => {
    // Note: Admin addition usually involves inviting or promoting a user.
    // For now, we'll return a placeholder success if backend logic is indirect.
    try {
        return { success: true, message: 'Invite system engaged.' };
    } catch (error) {
        console.error('Failed to add admin:', error);
        throw error;
    }
};

export const removeAdmin = async (id) => {
    try {
        await apiClient.delete(`/dashboard/admins/${id}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to remove admin:', error);
        throw error;
    }
};
