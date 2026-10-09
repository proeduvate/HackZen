import { saveRegistrationDraft } from './hackathonRegistrationApi';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getStepOneConfig = async (hackathon, user, platformConstraints = {}) => {
    await delay(250);
    const minTeam = platformConstraints.minTeamSize || 1;
    const maxTeam = platformConstraints.maxTeamSize 
        ? Math.min(platformConstraints.maxTeamSize, hackathon?.teamSizeLimit || platformConstraints.maxTeamSize)
        : (hackathon?.teamSizeLimit || 4);

    return {
        leaderName: user?.name || 'Student',
        leaderEmail: user?.email || '',
        minTeamSize: minTeam,
        maxTeamSize: maxTeam,
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
