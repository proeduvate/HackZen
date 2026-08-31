import apiClient from '../../api/api';

/**
 * Student Submissions API
 */

export const fetchSubmissions = async (teamId) => {
    try {
        if (!teamId) return [];
        const { data } = await apiClient.get(`/submissions/team/${teamId}`);

        return data.map(sub => ({
            id: sub.id,
            teamId: sub.teamId,
            team: sub.team || 'Unknown Team',
            project: sub.title || `Project Submission v${sub.version}`,
            hackathon: sub.hackathon || 'Current Hackathon',
            desc: sub.description || '',
            category: sub.track || 'General',
            fileUrl: sub.fileUrl || null,
            version: sub.version || 1,
            submittedAt: sub.time || (sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : ''),
            iso: sub.submittedAt || null,
            status: sub.status || 'Pending Review',
            score: sub.score ?? null,
            evaluationCount: sub.evaluationCount ?? 0
        }));
    } catch (error) {
        console.error('Failed to fetch student submissions:', error);
        return [];
    }
};

export const submitProject = async (submissionData) => {
    try {
        const payload = {
            teamId: submissionData.teamId,
            stageId: submissionData.stageId || 'initial_stage',
            fileUrl: submissionData.fileUrl,
            project: submissionData.project || 'Untitled Project',
            desc: submissionData.desc || '',
            category: submissionData.category || 'General'
        };

        const { data } = await apiClient.post('/submissions/', payload);
        return { success: true, submission: data };
    } catch (error) {
        console.error('Project submission failed:', error);
        throw error;
    }
};
