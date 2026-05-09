import apiClient from '../../api/api';

/**
 * Mentor Discover Teams API
 * Real backend integration for discovering and requesting teams in the Mentor Dashboard.
 */

/**
 * Fetch all teams that don't have a mentor assigned yet.
 * @returns {Promise<Array>}
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
 * Request to mentor a team by assigning yourself as the mentor.
 * @param {string} teamId
 */
export const requestMentorTeam = async (teamId) => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        await apiClient.post(`/teams/${teamId}/assign-mentor`, {
            mentorId: user._id || user.id
        });
        return { success: true, message: 'Mentorship request sent successfully.' };
    } catch (error) {
        console.error('Failed to request mentor for team:', error);
        throw error;
    }
};
