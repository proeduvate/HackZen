import apiClient from '../../api/api';

/**
 * Mentorship Requests API
 * Provides service functions for fetching and managing mentorship requests
 * using real backend data.
 */

const STORAGE_KEY = 'mentorship_requests_archive';

/**
 * Fetches the list of all mentorship requests directed to the mentor.
 * This fetches teams that don't have a mentor assigned yet.
 */
export const fetchMentorshipRequests = async () => {
    try {
        // Fetch all teams the user has access to (e.g. in their hackathons)
        const { data: teams } = await apiClient.get('/teams/my-teams');
        
        // Load archived/processed requests from local storage
        const archive = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');

        // Map teams to the frontend's request format
        const requests = teams.map(team => {
            const status = archive[team._id] || (team.mentorId ? 'Assigned' : 'Pending');
            
            return {
                id: team._id,
                teamName: team.teamName,
                description: team.description || 'No description provided.',
                requestDate: new Date(team.createdAt).toLocaleDateString(),
                appliedDate: new Date(team.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                domain: team.domain || 'General',
                stage: team.stage || 'Exploration',
                teamSize: 1, // Need member count
                location: 'Remote',
                duration: 'Project Duration',
                frequency: 'Weekly',
                focusArea: 'General Mentorship',
                message: `We are looking for a mentor to guide our team through the ${team.domain || 'project'} track.`,
                status: status,
                members: [] // Need member details
            };
        });

        return requests;
    } catch (error) {
        console.error('Failed to fetch mentorship requests:', error);
        throw error;
    }
};

/**
 * Accepts or rejects a mentorship request.
 */
export const updateMentorshipRequestStatus = async (requestId, actionType) => {
    try {
        if (actionType === 'accept') {
            // Call the real assign-mentor endpoint
            await apiClient.post(`/teams/${requestId}/assign-mentor`, { mentorId: 'current' });
        }

        // Persist status locally to handle 'Archived' state which might not be in backend
        const archive = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        archive[requestId] = actionType === 'accept' ? 'Assigned' : 'Archived';
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(archive));

        return { success: true };
    } catch (error) {
        console.error(`Failed to ${actionType} mentorship request:`, error);
        throw error;
    }
};
