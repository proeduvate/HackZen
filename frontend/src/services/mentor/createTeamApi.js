import apiClient from '../../api/api';

/**
 * Mentor Create Team API
 * Real backend integration for team creation in the Mentor Dashboard.
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
