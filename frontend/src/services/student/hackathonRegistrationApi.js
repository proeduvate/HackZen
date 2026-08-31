import apiClient from '../../api/api';

const STORAGE_KEY = 'student_hackathon_registration_drafts';

const readDrafts = () => {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
        return {};
    }
};

const writeDrafts = (drafts) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
};

export const createInitialRegistrationDraft = (hackathon, user) => ({
    hackathonId: hackathon.id || hackathon._id,
    teamName: '',
    teamSize: Math.min(2, hackathon.teamSizeLimit || 2),
    leaderName: user?.name || 'Student',
    leaderEmail: user?.email || '',
    memberEmails: [''],
    notes: '',
    acceptedTerms: false,
});

export const getRegistrationDraft = async (hackathon, user) => {
    const drafts = readDrafts();
    const hId = hackathon.id || hackathon._id;
    const existing = drafts[hId];

    if (existing) {
        return existing;
    }

    const draft = createInitialRegistrationDraft(hackathon, user);
    drafts[hId] = draft;
    writeDrafts(drafts);
    return draft;
};

export const saveRegistrationDraft = async (hackathonId, nextDraft) => {
    const drafts = readDrafts();
    drafts[hackathonId] = nextDraft;
    writeDrafts(drafts);
    return nextDraft;
};

export const submitHackathonRegistration = async (hackathonId, draft) => {
    try {
        const teamPayload = {
            hackathonId: hackathonId,
            teamName: draft.teamName
        };

        let team;
        try {
            const { data } = await apiClient.post('/teams/', teamPayload);
            team = data;
        } catch (teamError) {
            const detail = teamError.response?.data?.detail || teamError.response?.data?.error?.message || '';
            const canReuseExistingTeam = detail.includes('already a member') || detail.includes('Team name already exists');

            if (!canReuseExistingTeam) {
                throw teamError;
            }

            const { data: myTeams } = await apiClient.get('/teams/my-teams');
            team = myTeams.find(item => item.hackathonId === hackathonId);

            if (!team) {
                throw teamError;
            }
        }

        const teamId = team._id || team.id;

        const applicationPayload = {
            hackathonId,
            teamId
        };

        let application;
        try {
            const { data } = await apiClient.post('/applications/', applicationPayload);
            application = data;
        } catch (applicationError) {
            const detail = applicationError.response?.data?.detail || applicationError.response?.data?.error?.message || '';
            if (!detail.includes('already applied')) {
                throw applicationError;
            }

            const { data: applications } = await apiClient.get('/applications/my');
            application = applications.find(item => item.hackathonId === hackathonId) || {};
        }
        
        const drafts = readDrafts();
        delete drafts[hackathonId];
        writeDrafts(drafts);

        return {
            success: true,
            registrationId: application._id || application.id,
            teamId,
            timestamp: application.appliedAt,
            draft,
        };
    } catch (error) {
        console.error('Registration submission failed:', error);
        const detail = error.response?.data?.detail || error.response?.data?.error?.message;
        throw new Error(detail || 'Registration could not be completed. Please try again.');
    }
};
