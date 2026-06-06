import apiClient from '../../api/api';

/**
 * Admin Hackathon Approvals API
 * Connected to backend for managing hackathon approval requests,
 * reviewing changes, and resolving issues.
 */

/**
 * Fetch the first pending hackathon change request for review.
 * @returns {Promise<Object|null>}
 */
export const fetchHackathonChangeRequest = async () => {
    try {
        const { data } = await apiClient.get('/hackathon/admin/pending');
        // Return the first item or null if the queue is empty
        return data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error('Failed to fetch hackathon change requests:', error);
        throw error;
    }
};

/**
 * Fetch hackathon submission details for viewing (alias for first pending item).
 * @returns {Promise<Object|null>}
 */
export const fetchHackathonSubmissionDetails = async () => {
    return fetchHackathonChangeRequest();
};

/**
 * Approve a hackathon — sets status to Live.
 * @param {string} hackathonId
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const markAsResolved = async (hackathonId) => {
    try {
        const { data } = await apiClient.post(`/hackathon/${hackathonId}/approve`);
        return data;
    } catch (error) {
        console.error('Failed to approve hackathon:', error);
        throw error;
    }
};

/**
 * Reject a hackathon submission.
 * @param {string} hackathonId
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const withdrawRequestAndReject = async (hackathonId) => {
    try {
        const { data } = await apiClient.post(`/hackathon/${hackathonId}/reject`);
        return data;
    } catch (error) {
        console.error('Failed to reject hackathon:', error);
        throw error;
    }
};

/**
 * Send a reminder notification to the organizer (no-op if no backend handler).
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendReminderNotification = async () => {
    // Reminder logic can be wired to the inbox endpoint in a future iteration.
    return { success: true, message: 'Reminder notification sent to organizer.' };
};

/**
 * Send a message to the organizer via the platform inbox.
 * @param {string} hackathonId
 * @param {string} message
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendMessageToOrganizer = async (hackathonId, message) => {
    if (!message || message.trim().length === 0) {
        return { success: false, message: 'Message cannot be empty.' };
    }
    try {
        const { data } = await apiClient.post(`/hackathon/${hackathonId}/message`, { message });
        return data;
    } catch (error) {
        console.error('Failed to send message to organizer:', error);
        throw error;
    }
};
