import apiClient from '../../api/api';

/**
 * Saves the current hackathon draft to the backend or local storage.
 */
export const saveHackathonDraft = async (draft) => {
    // For now, we'll continue to use sessionStorage for drafts to avoid partial database entries,
    // but we'll simulate a backend save for consistency.
    sessionStorage.setItem('hackathonDraft', JSON.stringify(draft));
    return draft;
};

/**
 * Publishes the hackathon to the live backend.
 */
export const publishHackathon = async (draft) => {
    // Map the frontend UI draft data to match the backend HackathonCreate schema
    const payload = {
        title: draft.title || "Untitled Hackathon",
        description: draft.description || (draft.tagline || "A new hackathon"),
        problemStatement: draft.description || "Solve the challenges.",
        themes: draft.tracks && draft.tracks.length > 0 
            ? draft.tracks.map(t => typeof t === 'string' ? t : t.title).slice(0, 5) 
            : ["General"],
        registrationStart: draft.startDate || new Date().toISOString(),
        registrationEnd: draft.endDate || new Date().toISOString(),
        hackathonStart: draft.startDate || new Date().toISOString(),
        hackathonEnd: draft.endDate || new Date().toISOString(),
        minTeamSize: draft.minTeamSize || 1,
        maxTeamSize: draft.maxTeamSize || 4,
        isPublic: draft.isPublic !== undefined ? draft.isPublic : true,
        status: "Registration Open"
    };

    try {
        // Use apiClient for automatic token management and base URL handling
        const { data } = await apiClient.post('/hackathon/', payload);
        
        // Clear draft after successful publishing
        sessionStorage.removeItem('hackathonDraft');

        return {
            id: data._id || data.id,
            status: data.status,
            publishedAt: new Date().toISOString(),
            ...data
        };
    } catch (error) {
        console.error('Error publishing hackathon:', error);
        throw error;
    }
};

/**
 * Retrieves the current hackathon draft.
 */
export const getHackathonDraft = () => {
    const saved = sessionStorage.getItem('hackathonDraft');
    return saved ? JSON.parse(saved) : null;
};