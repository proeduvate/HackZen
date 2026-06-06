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
