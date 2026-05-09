import { saveRegistrationDraft } from './hackathonRegistrationApi';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getStepTwoConfig = async (draft) => {
    await delay(250);
    return {
        memberCount: Math.max(draft.teamSize - 1, 1),
        members: Array.from({ length: Math.max(draft.teamSize - 1, 1) }, (_, index) => draft.memberEmails[index] || ''),
    };
};

export const saveStepTwoData = async (hackathonId, draft, stepData) => {
    const nextDraft = {
        ...draft,
        memberEmails: stepData.memberEmails,
        notes: stepData.notes,
    };

    await saveRegistrationDraft(hackathonId, nextDraft);
    return nextDraft;
};
