import apiClient from '../api/api';

/**
 * Home Page API Service
 * Centralizes all data fetching requirements for the landing page.
 */

/**
 * Fetches the featured hackathons for the home page discovery section
 * Includes automatic formatting for the landing page UI components.
 */
export const fetchHomeHackathons = async () => {
    try {
        // We call the public-enabled allHackathons endpoint
        const { data } = await apiClient.get('/hackathon/allHackathons');
        
        // Transform the raw backend data into the specific format expected by Home.jsx
        return (data || []).map(h => ({
            id: h._id,
            domain: h.themes && h.themes.length > 0 ? h.themes[0] : 'Various',
            title: h.title,
            date: new Date(h.hackathonStart).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            participants: h.participants_count || 0,
            venue: h.location || 'Virtual'
        })).slice(0, 3); // Return the top 3 featured hackathons
    } catch (error) {
        console.error('Home Service Error [fetchHomeHackathons]:', error);
        throw error;
    }
};

/**
 * Fetches landing page statistics (e.g., total participants, active mentors)
 * Currently returns mock data synchronized with future backend telemetry endpoints.
 */
export const fetchHomeStats = async () => {
    try {
        // Placeholder for future telemetry endpoint
        // const { data } = await apiClient.get('/telemetry/landing-stats');
        return {
            totalUsers: '5000+',
            activeHackathons: '12+',
            mentors: '150+',
            successRate: '94%'
        };
    } catch (error) {
        console.error('Home Service Error [fetchHomeStats]:', error);
        return null;
    }
};
