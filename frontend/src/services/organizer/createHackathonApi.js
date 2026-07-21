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

const mapToValidTheme = (themeStr) => {
    const lower = (themeStr || '').toLowerCase();
    if (lower.includes('ai') || lower.includes('ml') || lower.includes('machine')) return 'AIML';
    if (lower.includes('llm') || lower.includes('gpt')) return 'LLM';
    if (lower.includes('gen') || lower.includes('generative')) return 'GenAI';
    if (lower.includes('web') || lower.includes('frontend') || lower.includes('backend')) return 'Web Dev';
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('ios')) return 'Mobile Dev';
    if (lower.includes('data') || lower.includes('analyt')) return 'Data Science';
    if (lower.includes('cyber') || lower.includes('security')) return 'Cyber Security';
    if (lower.includes('cloud') || lower.includes('aws') || lower.includes('azure')) return 'Cloud Computing';
    if (lower.includes('devops') || lower.includes('secops')) return 'DevSecOps';
    if (lower.includes('iot') || lower.includes('hardware')) return 'IoT';
    if (lower.includes('block') || lower.includes('crypto') || lower.includes('chain')) return 'Blockchain';
    if (lower.includes('game') || lower.includes('gaming')) return 'Gaming';
    if (lower.includes('edu') || lower.includes('learn')) return 'Education';
    if (lower.includes('health') || lower.includes('medic')) return 'Health Care';
    if (lower.includes('fin') || lower.includes('money')) return 'Finance';
    return 'Web Dev';
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
            ? draft.tracks.map(t => {
                const title = typeof t === 'string' ? t : t.title;
                return mapToValidTheme(title);
            }).slice(0, 5) 
            : ["Web Dev"],
        registrationStart: draft.startDate || new Date().toISOString(),
        registrationEnd: draft.endDate || new Date().toISOString(),
        hackathonStart: draft.startDate || new Date().toISOString(),
        hackathonEnd: draft.endDate || new Date().toISOString(),
        minTeamSize: draft.minTeamSize || 1,
        maxTeamSize: draft.maxTeamSize || 4,
        isPublic: draft.isPublic !== undefined ? draft.isPublic : true,
        status: "Pending"
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