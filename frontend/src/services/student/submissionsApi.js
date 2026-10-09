import apiClient from '../../api/api';

/**
 * Student Submissions API
 */

export const fetchSubmissions = async (teamId) => {
    try {
        if (!teamId) {
            try {
                const { data } = await apiClient.get('/submissions/my');
                if (Array.isArray(data) && data.length > 0) {
                    return data.map((sub) => ({
                        id: sub.id || sub._id,
                        project: sub.title || sub.project || `Project Submission v${sub.version || 1}`,
                        hackathon: sub.hackathon || sub.hackathonTitle || 'Current Hackathon',
                        team: sub.team || 'My Team',
                        teamId: sub.teamId,
                        submittedAt: sub.time || (sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Recently'),
                        status: sub.status || 'Pending Review',
                        score: sub.score ?? null,
                        feedback: sub.feedback ?? null,
                        desc: sub.description || sub.desc || '',
                        githubUrl: sub.githubUrl || '',
                        liveDemoUrl: sub.liveDemoUrl || '',
                        fileUrl: sub.fileUrl || '',
                        resources: sub.fileUrl ? ['Download Project'] : ['Submission File']
                    }));
                }
            } catch (myErr) {
                console.log('/submissions/my fallback to team query:', myErr);
            }

            const { data: teams } = await apiClient.get('/teams/my-teams').catch(() => ({ data: [] }));
            if (!teams || teams.length === 0) return [];

            const results = await Promise.all(
                teams.map((team) => apiClient.get(`/submissions/team/${team._id || team.id}`).catch(() => ({ data: [] })))
            );

            return results
                .flatMap((response) => response.data || [])
                .map((sub) => ({
                    id: sub._id,
                    project: sub.project || sub.title || `Project Submission v${sub.version || 1}`,
                    hackathon: sub.hackathonTitle || sub.hackathon || 'Current Hackathon',
                    submittedAt: sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Recently',
                    status: sub.status || 'Pending Review',
                    score: sub.score ?? null,
                    feedback: sub.feedback ?? null,
                    desc: sub.desc || sub.description || '',
                    githubUrl: sub.githubUrl || '',
                    liveDemoUrl: sub.liveDemoUrl || '',
                    fileUrl: sub.fileUrl || '',
                    resources: sub.fileUrl ? ['Download Project'] : ['Submission File']
                }));
        }

        const { data } = await apiClient.get(`/submissions/team/${teamId}`);
        return (data || []).map((sub) => ({
            id: sub._id,
            project: sub.project || sub.title || `Project Submission v${sub.version || 1}`,
            hackathon: sub.hackathonTitle || sub.hackathon || 'Current Hackathon',
            submittedAt: sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Recently',
            status: sub.status || 'Pending Review',
            score: sub.score ?? null,
            feedback: sub.feedback ?? null,
            desc: sub.desc || sub.description || '',
            githubUrl: sub.githubUrl || '',
            liveDemoUrl: sub.liveDemoUrl || '',
            fileUrl: sub.fileUrl || '',
            resources: sub.fileUrl ? ['Download Project'] : ['Submission File']
        }));
    } catch (error) {
        console.error('Failed to fetch student submissions:', error);
        return [];
    }
};

export const submitProject = async (submissionData) => {
    try {
        let uploadedFileUrl = submissionData.fileUrl || '';

        // If a real file deliverable is provided, upload it first
        if (submissionData.file instanceof File) {
            const formData = new FormData();
            formData.append('file', submissionData.file);
            const uploadRes = await apiClient.post('/submissions/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (uploadRes.data?.fileUrl) {
                uploadedFileUrl = uploadRes.data.fileUrl;
            }
        }

        let nextVersion = 1;
        if (submissionData.teamId) {
            try {
                const { data: teamSubs } = await apiClient.get(`/submissions/team/${submissionData.teamId}`);
                if (Array.isArray(teamSubs)) {
                    nextVersion = teamSubs.length + 1;
                }
            } catch {
                nextVersion = 1;
            }
        }

        const payload = {
            teamId: submissionData.teamId,
            stageId: submissionData.stageId || 'initial_stage',
            fileUrl: uploadedFileUrl || submissionData.fileUrl || '',
            project: submissionData.project || 'Untitled Project',
            desc: submissionData.desc || '',
            category: submissionData.category || 'General',
            githubUrl: submissionData.githubUrl || '',
            liveDemoUrl: submissionData.liveDemoUrl || '',
            status: submissionData.status || 'Pending Review',
            version: nextVersion
        };

        const { data } = await apiClient.post('/submissions/', payload);
        return { success: true, submission: data };
    } catch (error) {
        console.error('Project submission failed:', error);
        throw error;
    }
};
