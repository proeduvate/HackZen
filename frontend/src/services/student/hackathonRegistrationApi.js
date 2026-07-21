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
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        const userId = user._id || user.id || '';

        const payload = {
            hackathonId: hackathonId,
            userId: userId
        };

        const { data } = await apiClient.post('/applications/', payload);
        
        // Clean up local draft on success
        const drafts = readDrafts();
        delete drafts[hackathonId];
        writeDrafts(drafts);

        return {
            success: true,
            registrationId: data._id || data.id,
            timestamp: data.appliedAt,
            draft,
        };
    } catch (error) {
        console.error('Registration submission failed:', error);
        throw error;
    }
};
