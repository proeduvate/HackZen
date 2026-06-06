import apiClient from '../../api/api';

/**
 * Submissions API
 */

/**
 * Fetches the list of all project submissions and resolves team details.
 */
export const fetchSubmissions = async () => {
    try {
        const [subsRes, teamsRes] = await Promise.all([
            apiClient.get('/submissions/'),
            apiClient.get('/teams/my-teams') // Assuming organizer has access
        ]);

        const submissions = subsRes.data;
        const teams = teamsRes.data;

        // Map backend submissions to frontend format with resolved team data
        return submissions.map(sub => {
            const team = teams.find(t => t._id === sub.teamId) || { teamName: 'Unknown Team', teamCode: 'N/A' };
            
            return {
                id: sub._id,
                team: team.teamName,
                logo: team.teamName[0],
                teamId: sub.teamId,
                status: sub.evaluationId ? 'Evaluated' : 'Pending Review',
                title: sub.projectTitle || 'Project Submission v' + sub.version,
                time: new Date(sub.submittedAt).toLocaleDateString(),
                score: sub.totalScore ? `${sub.totalScore}/100` : null,
                track: sub.track || 'General',
                docs: sub.repoUrl ? ['🐙 Repo'] : ['📄 Docs']
            };
        });
    } catch (error) {
        console.error('Failed to fetch submissions:', error);
        throw error;
    }
};

/**
 * Evaluation is handled via the EvaluationPanel.
 */
export const evaluateSubmission = async (id, score) => {
    console.warn("evaluateSubmission is deprecated. Use EvaluationPanel for grading.");
    return { success: false, message: "Use evaluation panel" };
};
