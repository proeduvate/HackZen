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

export const fetchInitialMessages = async (hackathonId) => {
    try {
        const { data } = await apiClient.get('/ai/logs', {
            params: hackathonId ? { hackathon_id: hackathonId } : {}
        });
        if (Array.isArray(data) && data.length > 0) {
            const list = [];
            const chronological = [...data].reverse();
            for (const log of chronological) {
                if (log.query) {
                    list.push({
                        id: `q_${log._id || log.id || Math.random()}`,
                        sender: 'user',
                        text: log.query,
                        timestamp: log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                    });
                }
                if (log.response) {
                    list.push({
                        id: `r_${log._id || log.id || Math.random()}`,
                        sender: 'ai',
                        text: log.response,
                        timestamp: log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                    });
                }
            }
            return list;
        }
        return [];
    } catch (error) {
        console.warn('AI logs could not be loaded:', error);
        return [];
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
            hackathon_id: context || currentHackathon || 'general',
            objective: objective || 'Theme understanding'
        };

        const { data } = await apiClient.post('/ai/chat', payload);

        return {
            id: Date.now(),
            sender: 'ai',
            text: data.response || 'I am ready to help you brainstorm and plan your project.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    } catch (error) {
        throw resolveAiError(error);
    }
};
