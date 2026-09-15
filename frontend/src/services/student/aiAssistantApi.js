import apiClient from '../../api/api';

const QUICK_STARTERS = [
    { id: 1, text: 'What is the most important problem this hackathon wants us to solve?' },
    { id: 2, text: 'How can I break this idea into the smallest viable next step?' },
    { id: 3, text: 'What tradeoffs should I think through before building this feature?' },
    { id: 4, text: 'Can you help me structure a Socratic plan for my project?' },
];

const FALLBACK_DATASETS = [
    {
        hackathon_id: 'hackathon_1',
        file_name: 'hackathon_1.txt',
        label: 'Sustainable City Challenge',
    },
    {
        hackathon_id: 'hackathon_2',
        file_name: 'hackathon_2.txt',
        label: 'Digital Learning Companion',
    },
    {
        hackathon_id: 'hackathon_3',
        file_name: 'hackathon_3.txt',
        label: 'Smart Volunteer Coordination',
    },
];

const normalizeText = (value) => String(value ?? '').trim();

const formatTimestamp = (timestamp) => {
    if (!timestamp) {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const mapApiMessage = (message, index) => ({
    id: `${message.timestamp || 'history'}-${index}`,
    sender: message.role === 'assistant' ? 'ai' : 'user',
    text: normalizeText(message.content),
    timestamp: formatTimestamp(message.timestamp),
    sources: [],
});

const toAssistantMessage = (payload) => ({
    id: `${payload.session_id || 'ai'}-${payload.timestamp || Date.now()}`,
    sender: 'ai',
    text: normalizeText(payload.response),
    timestamp: formatTimestamp(payload.timestamp),
    sources: Array.isArray(payload.sources) ? payload.sources : [],
});

const getErrorMessage = (error) => {
    if (error?.response?.data?.detail) {
        return Array.isArray(error.response.data.detail)
            ? 'The assistant request failed validation.'
            : String(error.response.data.detail);
    }
    if (error?.response?.data?.error) {
        return String(error.response.data.error);
    }
    if (error?.message) {
        return String(error.message);
    }
    return 'The assistant is temporarily unavailable.';
};

export const createSessionId = () => {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getSessionStorageKey = (hackathonId) => `hackathon-ai-session:${hackathonId}`;

export const loadOrCreateSessionId = (hackathonId) => {
    const key = getSessionStorageKey(hackathonId);
    const stored = localStorage.getItem(key);
    if (stored) {
        return stored;
    }
    const sessionId = createSessionId();
    localStorage.setItem(key, sessionId);
    return sessionId;
};

export const saveSessionId = (hackathonId, sessionId) => {
    localStorage.setItem(getSessionStorageKey(hackathonId), sessionId);
};

export const fetchAvailableDatasets = async () => {
    try {
        const response = await apiClient.get('/ai/datasets');
        const datasets = Array.isArray(response.data?.datasets) ? response.data.datasets : [];
        if (!datasets.length) {
            return FALLBACK_DATASETS;
        }
        return datasets.map((dataset) => ({
            ...dataset,
            label:
                dataset.label ||
                dataset.display_name ||
                dataset.title ||
                dataset.hackathon_id
                    .replace(/[_-]+/g, ' ')
                    .replace(/\b\w/g, (char) => char.toUpperCase()),
        }));
    } catch (error) {
        console.warn('Failed to load datasets from backend, using fallback datasets.', error);
        return FALLBACK_DATASETS;
    }
};

export const fetchQuickStarters = async () => QUICK_STARTERS;

export const fetchConversationHistory = async (sessionId) => {
    const response = await apiClient.get(`/ai/history/${encodeURIComponent(sessionId)}`);
    const messages = Array.isArray(response.data?.messages) ? response.data.messages : [];
    return messages.map(mapApiMessage);
};

export const clearConversationMemory = async (sessionId) => {
    const response = await apiClient.post('/ai/clear-memory', {
        session_id: sessionId,
    });
    return Boolean(response.data?.cleared);
};

export const sendChatMessage = async ({ sessionId, hackathonId, message, objective, userId }) => {
    const composedMessage = objective
        ? `Objective: ${normalizeText(objective)}\n\n${normalizeText(message)}`
        : normalizeText(message);

    const response = await apiClient.post('/ai/chat', {
        session_id: sessionId,
        hackathon_id: hackathonId,
        message: composedMessage,
        user_id: userId || null,
    });

    return toAssistantMessage(response.data);
};

export const buildUserMessage = (text) => ({
    id: `user-${Date.now()}`,
    sender: 'user',
    text: normalizeText(text),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    sources: [],
});

export const extractErrorMessage = getErrorMessage;

