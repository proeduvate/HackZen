import { submitHackathonRegistration } from './hackathonRegistrationApi';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getStepThreeReview = async (hackathon, draft) => {
    await delay(250);
    return {
        hackathonTitle: hackathon.title,
        organizer: hackathon.organizer,
        teamName: draft.teamName,
        teamSize: draft.teamSize,
        leaderName: draft.leaderName,
        leaderEmail: draft.leaderEmail,
        memberEmails: draft.memberEmails,
        notes: draft.notes,
    };
};

export const submitStepThreeRegistration = async (hackathonId, draft) => (
    submitHackathonRegistration(hackathonId, draft)
);
