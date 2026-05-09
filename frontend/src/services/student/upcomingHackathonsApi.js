import apiClient from '../../api/api';

/**
 * Upcoming Hackathons API
 * 
 * This service provides data and functionality for the student "Explore Hackathons" page.
 * It is connected to the live backend for real-time data.
 */

/**
 * Fetches all upcoming hackathons from the backend.
 * @returns {Promise<Array>} A promise that resolves to an array of hackathon objects.
 */
export const fetchUpcomingHackathons = async () => {
    try {
        const { data } = await apiClient.get('/hackathon/allHackathons');
        return data.map(h => ({
            ...h,
            id: h._id,
            teamSizeLimit: h.maxTeamSize || 4
        }));
    } catch (error) {
        console.error('Failed to fetch upcoming hackathons:', error);
        throw error;
    }
};

export const fetchHackathonById = async (id) => {
    try {
        const { data } = await apiClient.get(`/hackathon/${id}`);
        return {
            ...data,
            id: data._id,
            teamSizeLimit: data.maxTeamSize || 4,
            date: new Date(data.hackathonStart).toLocaleDateString(),
            mode: data.location
        };
    } catch (error) {
        console.error(`Failed to fetch hackathon with ID ${id}:`, error);
        throw error;
    }
};

/**
 * Registers a team for a specific hackathon.
 * @param {string} hackathonId The ID of the hackathon to register for.
 * @param {Object} registrationData Data including team name, members, etc.
 * @returns {Promise<Object>} A promise that resolves to a success response.
 */
export const registerForHackathon = async (hackathonId, registrationData) => {
    try {
        const { data } = await apiClient.post('/applications/', {
            hackathonId,
            ...registrationData
        });
        return data;
    } catch (error) {
        console.error('Registration failed:', error);
        throw error;
    }
};

/**
 * Filters hackathons by tag or search query.
 * @param {string} query The search string or tag.
 * @returns {Promise<Array>} Filtered list of hackathons.
 */
export const searchHackathons = async (query) => {
    try {
        const { data } = await apiClient.get('/hackathon/allHackathons', {
            params: { search: query }
        });
        return data.map(h => ({
            ...h,
            id: h._id,
            teamSizeLimit: h.maxTeamSize || 4
        }));
    } catch (error) {
        console.error('Search failed:', error);
        throw error;
    }
};
