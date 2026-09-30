import apiClient from '../../api/api';

const QUICK_STARTERS = [
    { id: 1, text: 'Explain this hackathon theme in simple terms and identify the key focus areas.' },
    { id: 2, text: 'Help me identify real user pain points that fit this problem statement.' },
    { id: 3, text: 'Review my idea and suggest how to validate it with real users.' },
    { id: 4, text: 'Recommend a practical project structure, architecture, and development approach.' },
];

export const fetchInitialMessages = async () => {
    const { data } = await apiClient.get('/ai/logs');
    return data
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .flatMap(log => [
            { id: `${log._id}-query`, sender: 'user', text: log.query, timestamp: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
            { id: `${log._id}-response`, sender: 'ai', text: log.response, timestamp: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);
};

export const fetchQuickStarters = async () => QUICK_STARTERS;

export const sendChatMessage = async (text, hackathonId, objective = 'General guidance') => {
    const query = `[Focus: ${objective}]\n${text}`;
    const { data } = await apiClient.post('/ai/chat', { query, hackathon_id: hackathonId });
    return {
        id: `${Date.now()}-response`,
        sender: 'ai',
        text: data.response,
        timestamp: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
};
