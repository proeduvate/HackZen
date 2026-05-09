import apiClient from '../../api/api';

/**
 * Teams & Mentors API
 *
 * This service manages fetching teams, mentors, and judges for the organizer dashboard,
 * and handles assigning mentors to teams using real backend endpoints.
 */

/**
 * Fetches the list of all teams, mentors, and judges.
 */
export const fetchTeamsMentorsJudges = async () => {
    try {
        const [mentorsRes, teamsRes] = await Promise.all([
            apiClient.get('/profile/mentors'),
            apiClient.get('/teams/my-teams')
        ]);

        // Map teams data
        const teams = await Promise.all(teamsRes.data.map(async (team) => {
            // Optional: Fetch member count/names if the backend doesn't provide them in bulk
            // For now, we'll map the basic info and add placeholders for the UI
            return {
                id: team._id,
                name: team.teamName,
                domain: team.domain || 'General',
                logo: team.teamName[0],
                members: [], // We can fetch these on-demand or leave empty for the summary view
                status: 'Active',
                mentor: team.mentorId ? { id: team.mentorId, name: 'Mentor Assigned', avatar: 'M' } : null,
                createdAt: team.createdAt
            };
        }));

        // Map mentors data
        const mentors = mentorsRes.data.map(m => ({
            id: m.userId,
            name: m.name || 'Anonymous Mentor',
            avatar: (m.name || 'M')[0],
            domain: m.expertiseDomains?.[0] || 'Tech',
            assignedTeams: 0, // This would need a backend aggregation
            expertise: m.expertiseDomains || []
        }));

        return {
            teams,
            mentors,
            judges: [] // Judges integration to be completed in evaluation phase
        };
    } catch (error) {
        console.error('Failed to fetch teams and mentors:', error);
        throw error;
    }
};

/**
 * Assigns a mentor to a team.
 * @param {string} teamId The ID of the team.
 * @param {Object|null} mentor The mentor object to assign.
 */
export const assignMentorToTeam = async (teamId, mentor) => {
    try {
        if (!mentor) {
            // For removal, we'd need a backend endpoint like DELETE /teams/{id}/mentor
            // For now, we'll return a placeholder error if removal isn't supported yet
            throw new Error('Mentor removal not yet implemented on backend');
        }

        const { data } = await apiClient.post(`/teams/${teamId}/assign-mentor`, {
            mentorId: mentor.id
        });

        return {
            success: true,
            message: 'Mentor assigned successfully',
            team: data
        };
    } catch (error) {
        console.error('Failed to assign mentor:', error);
        throw error;
    }
};

/**
 * Sends invitations to a list of mentors.
 */
export const inviteMentors = async (invitationData) => {
    // This currently uses a mock implementation for invitation flow
    return new Promise((resolve) => {
        setTimeout(() => {
            const historyKey = 'mock_tm_invitations';
            const existingHistory = JSON.parse(sessionStorage.getItem(historyKey) || '[]');
            
            const newInvitations = invitationData.emails.map(email => ({
                id: Date.now() + Math.random(),
                email,
                role: invitationData.role,
                domain: invitationData.domain,
                status: 'Pending',
                sentAt: new Date().toISOString()
            }));

            sessionStorage.setItem(historyKey, JSON.stringify([...newInvitations, ...existingHistory]));
            
            resolve({ 
                success: true, 
                message: `${invitationData.emails.length} invitations dispatched.` 
            });
        }, 1200);
    });
};

/**
 * Fetches the history of sent invitations.
 */
export const fetchInvitationHistory = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const history = JSON.parse(sessionStorage.getItem('mock_tm_invitations') || '[]');
            resolve(history);
        }, 800);
    });
};
