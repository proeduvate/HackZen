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
        console.log('Mocking Registration submission for:', hackathonId, draft);
        
        // Simulating network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        /* REAL API CALL - Commented out for mock flow
        const payload = {
            hackathonId: hackathonId,
            teamName: draft.teamName,
            teamSize: parseInt(draft.teamSize),
            members: draft.memberEmails.filter(email => email.trim() !== ''),
            notes: draft.notes
        };

        const { data } = await apiClient.post('/applications/', payload);
        */

        // Mock response data
        const mockData = {
            _id: 'mock_reg_' + Math.random().toString(36).substr(2, 9),
            appliedAt: new Date().toISOString(),
        };
        
        // Clean up local draft on success
        const drafts = readDrafts();
        delete drafts[hackathonId];
        writeDrafts(drafts);

        return {
            success: true,
            registrationId: mockData._id,
            timestamp: mockData.appliedAt,
            draft,
        };
    } catch (error) {
        console.error('Registration submission failed:', error);
        throw error;
    }
};
