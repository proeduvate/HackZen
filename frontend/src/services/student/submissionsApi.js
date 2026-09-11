import apiClient from '../../api/api';

/**
 * Student Submissions API
 */

export const fetchSubmissions = async (teamId) => {
    try {
        let teamsToFetch = [];
        if (teamId) {
            teamsToFetch = [{ id: teamId, teamName: 'Active Team' }];
        } else {
            try {
                const { data: myTeams } = await apiClient.get('/teams/my-teams');
                if (Array.isArray(myTeams) && myTeams.length > 0) {
                    teamsToFetch = myTeams.map(t => ({ id: t.id || t._id, teamName: t.teamName, hackathonId: t.hackathonId }));
                }
            } catch (err) {
                console.warn('Could not fetch student teams:', err);
            }
        }

        if (teamsToFetch.length === 0) {
            return [];
        }

        const results = await Promise.all(
            teamsToFetch.map(async (t) => {
                try {
                    const { data } = await apiClient.get(`/submissions/team/${t.id}`);
                    if (!Array.isArray(data)) return [];
                    return data.map(sub => ({
                        id: sub._id || sub.id,
                        project: sub.project || (`Project Submission v${sub.version}`),
                        hackathon: sub.hackathonTitle || t.teamName || 'Active Hackathon',
                        teamName: t.teamName,
                        teamId: t.id,
                        submittedAt: new Date(sub.submittedAt).toLocaleDateString(),
                        status: sub.status || (sub.isLate ? 'Late Submission' : 'Submitted'),
                        isLate: Boolean(sub.isLate),
                        score: sub.aiScore || null,
                        feedback: sub.aiReview || sub.feedback || null,
                        githubUrl: sub.githubUrl || '',
                        liveDemoUrl: sub.liveDemoUrl || '',
                        fileUrl: sub.fileUrl || '',
                        resources: [
                            sub.githubUrl ? 'GitHub Repo' : null,
                            sub.liveDemoUrl ? 'Live Demo' : null,
                            sub.fileUrl ? 'Deliverable Archive' : null
                        ].filter(Boolean)
                    }));
                } catch {
                    return [];
                }
            })
        );

        return results.flat();
    } catch (error) {
        console.error('Failed to fetch student submissions:', error);
        return [];
    }
};

export const submitProject = async (submissionData) => {
    try {
        let nextVersion = 1;
        try {
            const { data: teamSubs } = await apiClient.get(`/submissions/team/${submissionData.teamId}`);
            if (Array.isArray(teamSubs)) {
                nextVersion = teamSubs.length + 1;
            }
        } catch {}

        const payload = {
            teamId: submissionData.teamId,
            stageId: submissionData.stageId || 'initial_stage',
            project: submissionData.project || 'Hackathon Project Submission',
            desc: submissionData.desc || '',
            category: submissionData.category || 'General',
            fileUrl: submissionData.fileUrl || 'https://storage.proeduvate.com/submissions/archive.zip',
            githubUrl: submissionData.githubUrl || '',
            liveDemoUrl: submissionData.liveDemoUrl || '',
            version: nextVersion
        };

        const { data } = await apiClient.post('/submissions/', payload);
        return { success: true, submission: data };
    } catch (error) {
        console.error('Project submission failed:', error);
        throw error;
    }
};
