import { saveRegistrationDraft } from './hackathonRegistrationApi';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getStepOneConfig = async (hackathon, user) => {
    await delay(250);
    return {
        leaderName: user?.name || 'Student',
        leaderEmail: user?.email || '',
        minTeamSize: 2,
        maxTeamSize: hackathon.teamSizeLimit || 4,
    };
};

export const saveStepOneData = async (hackathonId, draft, stepData) => {
    const teamSize = Number(stepData.teamSize);
    const memberCount = Math.max(teamSize - 1, 1);
    const nextDraft = {
        ...draft,
        teamName: stepData.teamName,
        teamSize,
        leaderName: stepData.leaderName,
        leaderEmail: stepData.leaderEmail,
        memberEmails: Array.from({ length: memberCount }, (_, index) => draft.memberEmails[index] || ''),
    };

    await saveRegistrationDraft(hackathonId, nextDraft);
    return nextDraft;
};
