import apiClient from '../../api/api';

/**
 * Mentorship Requests API
 * Reads organizer mentor assignments from the real notification inbox.
 */

export const fetchMentorshipRequests = async () => {
    try {
        const { data: notifications } = await apiClient.get('/inbox/?type=mentor_assignment');

        return notifications.map(notification => {
            const teamName = (notification.message || '')
                .replace('You have been assigned to mentor ', '')
                .replace('.', '') || 'Assigned Team';

            return {
                id: notification._id,
                teamId: notification.teamId,
                teamName,
                description: notification.message || 'Organizer assigned you to mentor this team.',
                requestDate: new Date(notification.createdAt).toLocaleDateString(),
                appliedDate: new Date(notification.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric'
                }),
                domain: 'Mentorship',
                stage: notification.read ? 'Acknowledged' : 'New Assignment',
                teamSize: 'Tracked in team workspace',
                location: 'Remote',
                duration: 'Hackathon duration',
                frequency: 'Organizer scheduled',
                focusArea: 'Team guidance',
                message: notification.message || 'Please review this mentorship assignment.',
                status: notification.read ? 'Assigned' : 'Pending',
                members: []
            };
        });
    } catch (error) {
        console.error('Failed to fetch mentorship requests:', error);
        throw error;
    }
};

export const updateMentorshipRequestStatus = async (requestId, actionType) => {
    try {
        await apiClient.put(`/inbox/${requestId}/read`);
        return { success: true, status: actionType === 'accept' ? 'Assigned' : 'Archived' };
    } catch (error) {
        console.error(`Failed to ${actionType} mentorship request:`, error);
        throw error;
    }
};
