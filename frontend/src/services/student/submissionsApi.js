import apiClient from '../../api/api';

/**
 * Student Submissions API
 */

export const fetchSubmissions = async (teamId) => {
    try {
        if (!teamId) return [];
        const { data } = await apiClient.get(`/submissions/team/${teamId}`);
        
        return data.map(sub => ({
            id: sub._id,
            project: 'Project Submission v' + sub.version,
            hackathon: 'Current Hackathon', // Placeholder until hackathon title is joined
            submittedAt: new Date(sub.submittedAt).toLocaleDateString(),
            status: 'Submitted',
            score: null,
            feedback: null,
            resources: ['Download Project']
        }));
    } catch (error) {
        console.error('Failed to fetch student submissions:', error);
        return [];
    }
};

export const submitProject = async (submissionData) => {
    try {
        const { data: teamSubs } = await apiClient.get(`/submissions/team/${submissionData.teamId}`);
        const nextVersion = teamSubs.length + 1;

        const payload = {
            teamId: submissionData.teamId,
            stageId: submissionData.stageId || 'initial_stage',
            fileUrl: submissionData.fileUrl || 'pending_upload',
            version: nextVersion
        };

        const { data } = await apiClient.post('/submissions/', payload);
        return { success: true, submission: data };
    } catch (error) {
        console.error('Project submission failed:', error);
        throw error;
    }
};
