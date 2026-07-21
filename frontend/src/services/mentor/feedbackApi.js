import apiClient from '../../api/api';

/**
 * Mentor Feedback API
 * Provides service functions for fetching and submitting feedback in the Mentor Dashboard
 * using real backend data where available.
 */

const STORAGE_KEY = 'mentor_feedback_persistence';

/**
 * Fetch all students from the mentor's assigned teams
 * @returns {Promise<Array>}
 */
export const fetchStudents = async () => {
    try {
        // 1. Get mentor's teams
        const { data: teams } = await apiClient.get('/teams/mentor/my');
        
        let allStudents = [];
        
        // 2. For each team, get members
        // In a production app, we would have a dedicated endpoint for this to avoid N+1 queries.
        for (const team of teams) {
            const { data: members } = await apiClient.get(`/teams/${team._id}/members`);
            
            for (const member of members) {
                // Check if already added (user might be in multiple teams)
                if (allStudents.find(s => s.id === member.userId)) continue;
                
                // Map to the frontend's expected "Tactical" format
                allStudents.push({
                    id: member.userId,
                    name: `Student ${member.userId.substring(0, 5)}`, // Fallback since we don't have user profiles yet
                    role: member.role === 'leader' ? 'Team Lead' : 'Developer',
                    team: team.teamName,
                    status: 'online', // Simulation
                    hasNewActivity: Math.random() > 0.7,
                    avatarColor: ['from-blue-500 to-cyan-500', 'from-blue-500 to-pink-500', 'from-orange-500 to-red-500', 'from-teal-500 to-green-500'][allStudents.length % 4],
                    recentFeedback: [] // To be fetched or stored locally
                });
            }
        }

        // Merge with locally stored feedback if any
        const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        return allStudents.map(student => ({
            ...student,
            recentFeedback: stored[student.id] || []
        }));
    } catch (error) {
        console.error('Failed to fetch students for feedback:', error);
        throw error;
    }
};

/**
 * Reset a student's new activity marker
 */
export const markStudentActivityViewed = async (studentId) => {
    // Local state management for now
    return Promise.resolve();
};

/**
 * Submit feedback for a specific student
 * @param {string} studentId 
 * @param {object} feedbackData - { type, message, rating }
 */
export const submitFeedback = async (studentId, feedbackData) => {
    try {
        // If we have a backend endpoint for personal feedback, call it here.
        // For now, we persist it in the session to ensure the UI updates correctly and survives refreshes.
        
        const newEntry = {
            id: Date.now(),
            ...feedbackData,
            date: 'Just Now'
        };

        const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
        if (!stored[studentId]) stored[studentId] = [];
        stored[studentId].unshift(newEntry);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

        // Optionally call evaluation API if it's team-wide
        // await apiClient.post('/evaluation/', { teamId: ..., feedback: feedbackData.message, ... });

        return newEntry;
    } catch (error) {
        console.error('Failed to submit feedback:', error);
        throw error;
    }
};
