import { saveHackathonDraft } from './createHackathonApi';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getStepTwoConfig = async (draft) => {
    await delay(250);
    return {
        currentTracks: draft.tracks || [],
        minTeamSize: 1,
        maxTeamSize: 10,
        defaultTracks: [
            { id: 1, title: 'AI & Machine Learning', description: 'Projects leveraging generative AI, computer vision, or NLP.' },
            { id: 2, title: 'FinTech Revolution', description: 'Innovative financial solutions using blockchain.' }
        ]
    };
};

export const saveStepTwoData = async (draft, stepData) => {
    const nextDraft = {
        ...draft,
        tracks: stepData.tracks,
        minTeamSize: stepData.minTeamSize,
        maxTeamSize: stepData.maxTeamSize,
        isPublic: stepData.isPublic,
        autoApprove: stepData.autoApprove,
    };

    await saveHackathonDraft(nextDraft);
    return nextDraft;
};