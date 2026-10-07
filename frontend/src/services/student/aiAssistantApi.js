/**
 * Student AI Assistant API
 * Uses the backend AI Co-Mentor when available, and fails gracefully when the
 * service is not configured or the route is unavailable.
 */

import apiClient from '../../api/api';

const QUICK_STARTERS = [
    { id: 1, text: 'Analyze the hackathon theme and suggest key focus areas' },
    { id: 2, text: 'Critique my project idea for feasibility and impact' },
    { id: 3, text: 'Suggest a folder structure and tech stack' },
    { id: 4, text: 'What are urgent problems fitting this track?' }
];

const resolveAiError = (error) => {
    const detail = error?.response?.data?.detail || error?.message || 'AI Co-Mentor is currently unavailable.';
    return new Error(detail);
};

const toUiMessage = (entry) => ({
    id: entry._id || entry.id || Date.now(),
    sender: entry.sender === 'user' ? 'user' : 'ai',
    text: entry.response || entry.text || '',
    timestamp: entry.timestamp
        ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});

export const fetchInitialMessages = async () => {
    try {
        const { data } = await apiClient.get('/ai/logs');
        return Array.isArray(data) ? data.map(toUiMessage) : [];
    } catch (error) {
        throw resolveAiError(error);
    }
};

export const fetchQuickStarters = async () => {
    return QUICK_STARTERS;
};

export const sendChatMessage = async (text, context, objective) => {
    try {
        const cachedUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        const currentHackathon = cachedUser.currentHackathonId || cachedUser.hackathonId || cachedUser.team?.hackathonId;

        const payload = {
            query: text,
            hackathon_id: currentHackathon || 'general'
        };

        const { data } = await apiClient.post('/ai/chat', payload);

        return {
            id: Date.now(),
            sender: 'ai',
            text: data.response || 'AI Co-Mentor is currently unavailable.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    } catch (error) {
        throw resolveAiError(error);
    }
};
