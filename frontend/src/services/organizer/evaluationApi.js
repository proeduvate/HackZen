import apiClient from '../../api/api';

/**
 * Evaluation Criteria & Submission API Integration
 */

const STORAGE_KEY = 'organizer_evaluation_criteria';
const MOCK_DELAY = 600;

// Default Criteria
const DEFAULT_CRITERIA = [
    { id: 'innovation', label: 'Innovation & Originality', description: 'Is the idea unique and novel?', weight: 10, minScore: 0, maxScore: 10 },
    { id: 'technical', label: 'Technical Implementation', description: 'Code quality and complexity.', weight: 10, minScore: 0, maxScore: 10 },
    { id: 'design', label: 'Design & User Experience', description: 'UI/UX and ease of use.', weight: 10, minScore: 0, maxScore: 10 },
    { id: 'presentation', label: 'Presentation Quality', description: 'Clarity of the pitch/demo.', weight: 10, minScore: 0, maxScore: 10 },
    { id: 'feasibility', label: 'Business Feasibility', description: 'Market potential and viability.', weight: 10, minScore: 0, maxScore: 10 }
];

/**
 * Fetch all evaluation criteria
 */
export const fetchCriteria = async () => {
    // In a full implementation, criteria would be fetched per hackathon stage
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CRITERIA));
    return DEFAULT_CRITERIA;
};

/**
 * Fetch all submissions that need evaluation
 */
export const fetchSubmissionsForEvaluation = async () => {
    try {
        const [subsRes, teamsRes] = await Promise.all([
            apiClient.get('/submissions/'),
            apiClient.get('/teams/my-teams') // Assuming organizer has access to teams in their hackathons
        ]);

        const submissions = subsRes.data;
        const teams = teamsRes.data;

        // Map submissions to the UI team evaluation format
        return submissions.map(sub => {
            const team = teams.find(t => t._id === sub.teamId) || { teamName: 'Unknown Team', members: [] };
            
            return {
                id: sub._id,
                name: team.teamName,
                project: sub.projectTitle || 'Untitled Project',
                status: sub.evaluationId ? 'Evaluated' : 'Pending',
                submitted: new Date(sub.submittedAt).toLocaleDateString(),
                score: sub.totalScore || null,
                shortlisted: sub.isShortlisted || false,
                members: team.members?.map(m => m.name) || ['Anonymous'],
                links: { 
                    repo: sub.repoUrl || '#', 
                    demo: sub.demoUrl || '#', 
                    details: sub.projectDescription || '#' 
                },
                submissionId: sub._id,
                teamId: sub.teamId
            };
        });
    } catch (error) {
        console.error("Failed to fetch submissions for evaluation:", error);
        throw error;
    }
};

/**
 * Submit a real evaluation to evaluation.py backend
 */
export const submitEvaluation = async (evalData) => {
    try {
        const payload = {
            submissionId: evalData.submissionId,
            teamId: evalData.teamId,
            scores: evalData.scores,
            feedback: evalData.feedback,
            totalScore: evalData.totalScore
        };
        
        const { data } = await apiClient.post('/evaluations/', payload);
        return { success: true, data };
    } catch (error) {
        console.error("Evaluation submission failed:", error);
        throw error;
    }
};

/**
 * Save all evaluation criteria
 */
export const saveCriteria = async (criteria) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(criteria));
    return { success: true, message: 'Criteria updated successfully' };
};

/**
 * Reset criteria
 */
export const resetCriteria = async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CRITERIA));
    return DEFAULT_CRITERIA;
};
