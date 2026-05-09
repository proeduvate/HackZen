import apiClient from '../../api/api';

/**
 * Results & Certificates API Integration
 */

/**
 * Fetches the leaderboard and certificate templates.
 */
export const fetchResultsAndCertificates = async (hackathonId = 'hack_1') => {
    try {
        const [leaderboardRes, issuedCertsRes] = await Promise.all([
            apiClient.get(`/evaluations/leaderboard/${hackathonId}`),
            apiClient.get('/certificates/me') // Fallback for checking issued status
        ]);

        const leaderboardData = leaderboardRes.data;
        const issuedCerts = issuedCertsRes.data;

        // Map leaderboard data and resolve members
        const mappedLeaderboard = await Promise.all(leaderboardData.map(async (item) => {
            // Fetch team members for each team in the leaderboard
            let members = [];
            try {
                const { data } = await apiClient.get(`/teams/${item.teamId}/members`);
                members = data;
            } catch (err) {
                console.error(`Failed to fetch members for team ${item.teamId}:`, err);
            }

            // Check if certificates have been issued for members of this team
            const certsForTeam = issuedCerts.filter(c => c.teamId === item.teamId);

            return {
                id: item.teamId,
                rank: item.rank,
                team: item.teamName,
                project: 'Hackathon Submission', // In full implementation, fetch from submission
                score: item.score,
                maxScore: item.maxScore || 100,
                tier: item.rank === 1 ? 'Grand Winner' : item.rank <= 3 ? 'Runner Up' : 'Participant',
                certStatus: certsForTeam.length > 0 ? 'Issued' : 'Pending',
                logo: item.teamName[0],
                members: members,
                hackathonId: hackathonId
            };
        }));

        return {
            leaderboard: mappedLeaderboard,
            templates: [
                {
                    id: 't1',
                    name: 'Certificate of Excellence',
                    description: 'Awarded to the top performing teams.',
                    status: 'Ready',
                    type: 'Achievement',
                    recipients: 'Top 3 Teams',
                    eligibleRanks: [1, 2, 3],
                    iconColor: 'yellow'
                },
                {
                    id: 't2',
                    name: 'Participation Certificate',
                    description: 'Recognizing effort and contribution to the hackathon.',
                    status: 'Ready',
                    type: 'Participation',
                    recipients: 'All Participants',
                    eligibleRanks: 'all',
                    iconColor: 'blue'
                }
            ]
        };
    } catch (error) {
        console.error('Failed to fetch results and certificates:', error);
        return { leaderboard: [], templates: [] };
    }
};

/**
 * Publishes the final results by updating hackathon status.
 */
export const publishResults = async (hackathonId) => {
    try {
        await apiClient.put(`/hackathon/${hackathonId}`, { status: 'Past' });
        return { success: true };
    } catch (error) {
        console.error('Failed to publish results:', error);
        throw error;
    }
};

/**
 * Issues certificates to all members of eligible teams.
 */
export const issueCertificates = async (template, currentLeaderboard) => {
    try {
        const eligibleTeams = currentLeaderboard.filter(team => 
            template.eligibleRanks === 'all' || (Array.isArray(template.eligibleRanks) && template.eligibleRanks.includes(team.rank))
        );

        let issuedCount = 0;

        for (const team of eligibleTeams) {
            if (team.certStatus === 'Issued') continue;

            for (const member of team.members) {
                try {
                    await apiClient.post('/certificates/', {
                        user_id: member.userId,
                        team_id: team.id,
                        hackathon_id: team.hackathonId
                    });
                    issuedCount++;
                } catch (err) {
                    console.error(`Failed to issue certificate for member ${member.userId} of team ${team.id}:`, err);
                }
            }
            team.certStatus = 'Issued';
        }

        return {
            success: true,
            message: `Issued certificates to ${issuedCount} participants.`,
            updatedLeaderboard: [...currentLeaderboard]
        };
    } catch (error) {
        console.error("Certificate issuance failed:", error);
        throw error;
    }
};
