import apiClient from '../../api/api';

/**
 * Evaluation Panel API
 *
 * This service manages fetching teams, submitting evaluations, and 
 * handling shortlist functionalities for the organizer dashboard. 
 */

/**
 * Fetches the list of teams/submissions queued for evaluation.
 * @returns {Promise<Array>} A promise resolving to an array of team/submission objects.
 */
export const fetchTeamsForEvaluation = async () => {
    try {
        const { data } = await apiClient.get('/submissions/');
        
        return data.map(sub => ({
            id: sub._id,
            teamId: sub.teamId,
            name: 'Team ' + sub.teamId.substring(0, 4),
            project: 'Submission v' + sub.version,
            status: 'Pending',
            submitted: new Date(sub.submittedAt).toLocaleTimeString(),
            score: null,
            shortlisted: false,
            members: [],
            links: { repo: sub.fileUrl, demo: '#', details: '#' },
            existingScores: null
        }));
    } catch (error) {
        console.error('Failed to fetch teams for evaluation:', error);
        throw error;
    }
};

/**
 * Submits an evaluation for a specific team.
 * @param {string} teamId The ID of the team being evaluated.
 * @param {Object} evaluationData The evaluation scores, comment, and shortlist status.
 */
export const submitTeamEvaluation = async (teamId, evaluationData) => {
    try {
        const payload = {
            teamId: teamId,
            judgeId: 'mentor_placeholder', // Replaced by backend via auth session
            scores: evaluationData.scores || {},
            feedback: evaluationData.comment || '',
            totalScore: evaluationData.totalScore
        };

        const { data } = await apiClient.post('/evaluations/', payload);

        return {
            success: true,
            message: 'Evaluation submitted successfully',
            evaluation: data
        };
    } catch (error) {
        console.error('Failed to submit evaluation:', error);
        throw error;
    }
};

/**
 * Toggles or updates the shortlist status of a specific team directly.
 * @param {number|string} teamId The ID of the team.
 * @param {boolean} isShortlisted The new shortlist status.
 * @returns {Promise<Object>} A promise resolving to the update status.
 */
export const updateTeamShortlistStatus = async (teamId, isShortlisted) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                console.log(`[API MOCK] Updating shortlist status for team ${teamId}:`, isShortlisted);
                const teams = getTeamsFromStorage();
                const teamIndex = teams.findIndex((t) => t.id === teamId);

                if (teamIndex === -1) {
                    return reject(new Error('Team not found'));
                }

                // Update only shortlist status
                teams[teamIndex].shortlisted = isShortlisted;
                saveTeamsToStorage(teams);

                resolve({
                    success: true,
                    message: `Team ${isShortlisted ? 'added to' : 'removed from'} shortlist`,
                    shortlisted: isShortlisted
                });
            } catch (error) {
                reject(new Error('Failed to update shortlist status'));
            }
        }, MOCK_DELAY);
    });
};

/**
 * Resets the teams data to its initial state for testing purposes.
 * @returns {Promise<Object>} A promise resolving when data is reset.
 */
export const resetEvaluationsData = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('[API MOCK] evaluations data reset');
            sessionStorage.removeItem('mock_eval_teams');
            sessionStorage.setItem('mock_eval_teams', JSON.stringify(INITIAL_TEAMS));
            resolve({ success: true, message: 'Data reset successfully' });
        }, 500);
    });
};
