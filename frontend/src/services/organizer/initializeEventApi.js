import apiClient from '../../api/api';

/**
 * Initialize Event API Service
 * Handles event creation and synchronization with the backend.
 */

export const createEvent = async (eventData) => {
    // Map the simplified "Initialize" data to the backend HackathonCreate schema
    const payload = {
        title: eventData.name,
        description: eventData.description || `A new ${eventData.category} hackathon.`,
        problemStatement: eventData.description || "Challenge details to be provided.",
        themes: [eventData.category],
        registrationStart: eventData.startDate,
        registrationEnd: eventData.endDate,
        hackathonStart: eventData.startDate,
        hackathonEnd: eventData.endDate,
        minTeamSize: 1,
        maxTeamSize: 4,
        isPublic: eventData.mode !== 'Private', // Assuming mode implies public/private in some context
        status: "Draft" // Initializing usually implies a draft state
    };

    try {
        const { data } = await apiClient.post('/hackathon/', payload);
        return data;
    } catch (error) {
        console.error('Failed to initialize event:', error);
        throw error;
    }
};

export const validateEventSchema = async (data) => {
    const errors = {};
    if (!data.name || data.name.length < 5) {
        errors.name = "Event Designation must be at least 5 characters.";
    }
    if (!data.startDate) {
        errors.startDate = "Genesis Date is required for temporal alignment.";
    }
    if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
        errors.startDate = "Genesis must occur before Termination.";
    }
    
    return { 
        isValid: Object.keys(errors).length === 0, 
        errors 
    };
};
