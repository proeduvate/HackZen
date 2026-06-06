/**
 * Student AI Assistant API
 * Provides mock data and service functions for the AI Assistant feature.
 */

const MOCK_DELAY = 1000;

const MOCK_MESSAGES = [
    {
        id: 1,
        sender: 'ai',
        text: "Hello Hari! I see you're working on 'Global Connect 2025' with the 'Neural Ninjas' team. How can I assist you with your ideation process today?",
        timestamp: '10:00 AM'
    }
];

const MOCK_QUICK_STARTERS = [
    { id: 1, text: "Analyze the hackathon theme and suggest key focus areas" },
    { id: 2, text: "Critique my project idea for feasibility and impact" },
    { id: 3, text: "Suggest a folder structure and tech stack" },
    { id: 4, text: "What are urgent problems fitting this track?" }
];

/**
 * Fetches the initial conversation messages
 * @returns {Promise<Array>} List of messages
 */
export const fetchInitialMessages = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(MOCK_MESSAGES);
        }, MOCK_DELAY);
    });
};

/**
 * Fetches the quick starter prompts
 * @returns {Promise<Array>} List of quick starters
 */
export const fetchQuickStarters = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(MOCK_QUICK_STARTERS);
        }, 800);
    });
};

/**
 * Sends a message to the AI and receives a mock response
 * @param {string} text - User's message
 * @param {string} context - Current hackathon context
 * @param {string} objective - Current logic objective
 * @returns {Promise<Object>} AI response object
 */
export const sendChatMessage = async (text, context, objective) => {
    console.log(`[AI Assistant API] Sending message with context: ${context}, objective: ${objective}`);

    return new Promise((resolve) => {
        setTimeout(() => {
            const aiResponse = {
                id: Date.now(),
                sender: 'ai',
                text: getMockResponse(text, context, objective),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            resolve(aiResponse);
        }, 1500);
    });
};

/**
 * Helper to generate different mock responses based on input
 */
const getMockResponse = (text, context, objective) => {
    const textLower = text.toLowerCase();

    if (textLower.includes('tech stack') || textLower.includes('structure')) {
        return `That's an interesting direction for ${context}! Since you're in the ${objective} phase, you might want to consider using a modular architecture. Here are a few tech stack suggestions:\n\n• **Frontend:** React with Vite\n• **Backend:** Node.js with Express\n• **Database:** MongoDB or PostgreSQL\n\nWould you like me to elaborate on a specific component?`;
    }

    if (textLower.includes('analyze') || textLower.includes('theme')) {
        return `Analyzing ${context} theme... This track emphasizes high impact and technical scalability. Your current focus on ${objective} is perfect for identifying core bottlenecks early. I recommend focusing on user accessibility and robust data management as they are primary evaluation criteria.`;
    }

    return "That's a valid point. Integrating this into your current workflow for " + objective + " could significantly enhance the feasibility of your project in " + context + ". Do you want me to break down the implementation steps for this?";
};
