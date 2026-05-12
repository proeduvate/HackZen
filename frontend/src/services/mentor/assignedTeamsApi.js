import apiClient from '../../api/api';

/**
 * Mentor Assigned Teams API
 * Real backend integration for managing assigned and past teams in Mentor Dashboard.
 */

/**
 * Fetch all teams assigned to the current mentor (active) and all teams collection for past context.
 * @returns {Promise<{activeTeams: Array, pastTeams: Array}>}
 */
export const fetchAssignedTeams = async () => {
    try {
        const { data: teams } = await apiClient.get('/teams/mentor-teams');

        const activeTeams = teams.map(team => ({
            id: team._id,
            name: team.teamName,
            hackathon: team.hackathonId || 'Active Hackathon',
            domain: team.domain || 'Technology',
            status: team.status || 'Active',
            progress: team.progress || 0,
            nextAction: team.nextAction || 'Check in with team',
            nextActionTime: team.nextActionTime || 'TBD',
            alert: team.alert || null,
            members: team.memberCount || 0,
            icon: '🚀'
        }));

        return { activeTeams, pastTeams: [] };
    } catch (error) {
        console.error('Failed to fetch assigned teams:', error);
        return { activeTeams: [], pastTeams: [] };
    }
};

/**
 * Join a team using an invite code
 * @param {string} code - The invite code
 */
export const joinTeam = async (code) => {
    try {
        const { data } = await apiClient.post(`/teams/join/${code}`);
        return {
            success: true,
            message: `Successfully joined team`,
            team: {
                id: data._id || data.teamId,
                name: data.teamName || `Team ${code}`,
                hackathon: data.hackathonId || 'Open Challenge',
                domain: data.domain || 'General',
                status: 'Active',
                progress: 0,
                nextAction: 'Onboarding',
                nextActionTime: 'Pending',
                alert: null,
                members: 1,
                icon: '🚀'
            }
        };
    } catch (error) {
        console.error('Failed to join team:', error);
        throw error;
    }
};

/**
 * Fetch teams available for mentoring (Teams without a mentor assigned)
 */
export const fetchDiscoverableTeams = async () => {
    try {
        const { data: teams } = await apiClient.get('/teams/my-teams');
        return teams
            .filter(team => !team.mentorId)
            .map(team => ({
                id: team._id,
                name: team.teamName,
                hackathon: team.hackathonId || 'Active Hackathon',
                domain: team.domain || 'Technology',
                description: team.description || 'This team is looking for a mentor.',
                requiredSkills: team.requiredSkills || [],
                members: team.memberCount || 0,
                maxSize: team.maxSize || 4,
                progress: team.progress || 0,
                status: team.status || 'Active',
                requested: false,
                icon: '⚛️'
            }));
    } catch (error) {
        console.error('Failed to fetch discoverable teams:', error);
        return [];
    }
};

/**
 * Request to mentor a team by assigning yourself
 * @param {string} teamId
 */
export const requestMentorTeam = async (teamId) => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        await apiClient.post(`/teams/${teamId}/assign-mentor`, { mentorId: user._id || user.id });
        return { success: true, message: 'Mentorship request sent successfully.' };
    } catch (error) {
        console.error('Failed to request mentor team:', error);
        throw error;
    }
};

/**
 * Create a new team — note: team creation is student-only in backend.
 * This is a placeholder that surfaces the backend error clearly.
 */
export const createTeam = async (teamData) => {
    try {
        const { data } = await apiClient.post('/teams/', {
            teamName: teamData.name || teamData.teamName,
            hackathonId: teamData.hackathonId,
            domain: teamData.domain || 'Technology',
            description: teamData.description || ''
        });
        return {
            success: true,
            message: `Team ${data.teamName} created successfully!`,
            team: {
                id: data._id,
                name: data.teamName,
                hackathon: data.hackathonId,
                domain: data.domain || 'Technology',
                status: 'Active',
                progress: 0,
                nextAction: 'Initial Meeting',
                nextActionTime: 'TBD',
                alert: null,
                members: 1,
                icon: '🛠️'
            }
        };
    } catch (error) {
        console.error('Failed to create team:', error);
        throw error;
    }
};

/**
 * Fetch mentorship requests (notifications of type mentor_assignment)
 */
export const fetchMentorshipRequests = async () => {
    try {
        const { data: notifications } = await apiClient.get('/inbox/?type=mentor_assignment');
        return notifications.map(notif => ({
            id: notif._id,
            team: notif.message.split('assigned to ')[1] || 'New Team',
            domain: 'Mentorship',
            desc: notif.message,
            date: new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            time: 'Pending',
            priority: notif.read === false,
            icon: '🚀'
        }));
    } catch (error) {
        console.error('Failed to fetch mentorship requests:', error);
        return [];
    }
};

/**
 * Graduate a team — updates team status to completed via backend.
 */
export const graduateTeam = async (teamId) => {
    try {
        await apiClient.put(`/teams/${teamId}`, { status: 'completed' });
        return { success: true, message: 'Team graduated successfully' };
    } catch (error) {
        console.error('Failed to graduate team:', error);
        throw error;
    }
};
