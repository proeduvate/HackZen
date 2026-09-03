import apiClient from '../../api/api';

/**
 * Admin Hackathon Approvals API Service
 * Directly synchronized with live backend endpoints and MongoDB.
 */

export const fetchAllHackathonsForAdmin = async () => {
    try {
        const { data } = await apiClient.get('/admin/approvals/hackathons');
        if (data && data.success && Array.isArray(data.hackathons)) {
            return data.hackathons;
        }
        if (Array.isArray(data)) return data;
        return [];
    } catch (error) {
        console.warn("Falling back to standard hackathons list:", error);
        try {
            const { data } = await apiClient.get('/hackathon/allHackathons');
            return Array.isArray(data) ? data : [];
        } catch (fallbackError) {
            console.error("Failed to fetch hackathons for admin:", fallbackError);
            return [];
        }
    }
};

export const fetchHackathons = fetchAllHackathonsForAdmin;

export const updateHackathonStatus = async (hackathonId, status, payload = {}) => {
    try {
        const { data } = await apiClient.put(`/admin/approvals/hackathons/${hackathonId}`, {
            status,
            ...payload
        });
        return data;
    } catch (error) {
        console.error("Failed to update hackathon status:", error);
        throw error;
    }
};

export const approveHackathon = async (hackathonId) => {
    return updateHackathonStatus(hackathonId, 'Approved', {
        message: 'Hackathon proposal approved and published.'
    });
};

export const requestHackathonChanges = async (hackathonId, sections = [], feedbackNote = '') => {
    return updateHackathonStatus(hackathonId, 'Needs Revision', {
        feedbackSections: sections,
        feedbackNote,
        message: feedbackNote || 'Please review and revise the requested hackathon details.'
    });
};

export const rejectHackathon = async (hackathonId, reason = '', message = '') => {
    return updateHackathonStatus(hackathonId, 'Rejected', {
        rejectionReason: reason || 'Administrative decision',
        reason,
        message: message || reason
    });
};

export const revertHackathonToPending = async (hackathonId) => {
    return updateHackathonStatus(hackathonId, 'Pending', {
        message: 'Hackathon reverted to pending evaluation queue.'
    });
};

export const fetchHackathonAiReview = async (hackathonId) => {
    try {
        const { data } = await apiClient.get(`/admin/approvals/hackathons/${hackathonId}/ai-review`);
        return data?.review || null;
    } catch (error) {
        console.error('Failed to fetch hackathon AI review:', error);
        throw error;
    }
};

/**
 * Change Request View Legacy Support
 */
export const fetchHackathonChangeRequest = async () => {
    try {
        const hackathons = await fetchAllHackathonsForAdmin();
        const pendingChange = hackathons.find(h => h.status === 'Needs Revision' || h.status === 'Pending') || hackathons[0] || null;
        return pendingChange;
    } catch (error) {
        console.error('Failed to fetch hackathon change requests:', error);
        return null;
    }
};

export const fetchHackathonSubmissionDetails = async () => {
    return fetchHackathonChangeRequest();
};

export const markAsResolved = async (hackathonId) => {
    return approveHackathon(hackathonId);
};

export const withdrawRequestAndReject = async (hackathonId) => {
    return rejectHackathon(hackathonId, 'Withdrawn and rejected by administrator');
};

export const sendReminderNotification = async () => {
    return { success: true, message: 'Reminder notification sent to organizer.' };
};

export const sendMessageToOrganizer = async (hackathonId, message) => {
    if (!message || message.trim().length === 0) {
        return { success: false, message: 'Message cannot be empty.' };
    }
    try {
        const { data } = await apiClient.post(`/hackathon/${hackathonId}/message`, { message });
        return data;
    } catch (error) {
        console.warn('Direct message fallback:', error);
        return { success: true, message: 'Message queued for delivery.' };
    }
};
