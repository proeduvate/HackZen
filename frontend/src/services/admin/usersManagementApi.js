import apiClient from '../../api/api';

/**
 * Admin Users Management API
 * Manages platform users, roles, and account status using real backend endpoints.
 */

/**
 * Fetch all registered users across the platform
 * @returns {Promise<Array>}
 */
export const fetchUsers = async () => {
    try {
        const { data } = await apiClient.get('/dashboard/users');
        return data;
    } catch (error) {
        console.error('Failed to fetch users:', error);
        throw error;
    }
};

/**
 * Update the active status of a user (Suspend / Reactivate)
 * @param {string} userId
 * @param {string} newStatus - 'Active' or 'Suspended'
 * @returns {Promise<{success: boolean, updatedData: Array}>}
 */
export const updateUserStatus = async (userId, newStatus) => {
    try {
        await apiClient.put(`/dashboard/users/${userId}/status`, { status: newStatus });
        // Refetch the full list so caller gets updated state
        const updatedData = await fetchUsers();
        return { success: true, updatedData };
    } catch (error) {
        console.error('Failed to update user status:', error);
        throw error;
    }
};
