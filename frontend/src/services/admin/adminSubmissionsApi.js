import apiClient from '../../api/api';

/**
 * Admin Submissions API
 * Fetches and manages hackathon submissions using real backend endpoints.
 */

/**
 * Fetch all admin submissions
 * @returns {Promise<Array>}
 */
export const fetchAdminSubmissions = async () => {
    try {
        const { data } = await apiClient.get('/submissions/admin/all');
        return data;
    } catch (error) {
        console.error('Failed to fetch admin submissions:', error);
        throw error;
    }
};

/**
 * Update the status of a specific submission
 * @param {string} id - Submission ID
 * @param {string} newStatus - 'Approved', 'Rejected', etc.
 * @returns {Promise<{success: boolean, updatedSubmission: Object}>}
 */
export const updateSubmissionStatus = async (id, newStatus) => {
    try {
        const { data } = await apiClient.put(`/submissions/${id}/status`, { status: newStatus });
        return {
            success: true,
            updatedSubmission: data
        };
    } catch (error) {
        console.error('Failed to update submission status:', error);
        throw error;
    }
};
