import apiClient from '../../api/api';

/**
 * Admin Analytics API
 * Fetches platform analytics, registration data, and user satisfaction sentiment from the live backend.
 */

/**
 * Fetch the entire analytics dashboard payload
 * @returns {Promise<Object>}
 */
export const getAnalyticsDashboard = async () => {
    try {
        const { data } = await apiClient.get('/dashboard/platform-analytics');
        return data;
    } catch (error) {
        console.error('Failed to fetch analytics dashboard:', error);
        throw error;
    }
};
