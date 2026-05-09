import apiClient from '../../api/api';

/**
 * My Hackathons API
 * 
 * This service manages fetching the organizer's hackathons, and toggling
 * their visibility and registration statuses using the real backend.
 */

/**
 * Fetches the list of hackathons created by the organizer.
 * @returns {Promise<Array>} A promise resolving to an array of hackathon objects.
 */
export const fetchMyHackathons = async () => {
    try {
        const { data } = await apiClient.get('/hackathons/myhackathons');
        
        return data.map(h => ({
            id: h._id,
            title: h.title,
            banner: h.posterUrl || "https://images.unsplash.com/photo-1504384308090-c54be3852f33?auto=format&fit=crop&q=80&w=1000",
            startDate: new Date(h.hackathonStart).toLocaleDateString(),
            endDate: new Date(h.hackathonEnd).toLocaleDateString(),
            mode: h.location === 'Online' ? 'Online' : 'Hybrid',
            registrations: 0, // Need to fetch separately or join in backend
            daysLeft: Math.max(0, Math.ceil((new Date(h.hackathonEnd) - new Date()) / (1000 * 60 * 60 * 24))),
            status: h.status,
            regStatus: new Date(h.registrationEnd) > new Date() ? "Open" : "Closed",
            isVisible: h.isPublic,
            category: h.themes?.[0] || "General"
        }));
    } catch (error) {
        console.error('Failed to fetch my hackathons:', error);
        throw error;
    }
};

/**
 * Toggles the visibility of a specific hackathon.
 * @param {string} id The ID of the hackathon.
 * @returns {Promise<Object>} A promise resolving to the update status and updated hackathon.
 */
export const toggleHackathonVisibility = async (id) => {
    try {
        const { data: current } = await apiClient.get(`/hackathons/${id}`);
        const { data: updated } = await apiClient.put(`/hackathons/${id}`, {
            isPublic: !current.isPublic
        });

        return {
            success: true,
            message: `Hackathon visibility updated to ${updated.isPublic}`,
            hackathon: {
                ...updated,
                id: updated._id,
                isVisible: updated.isPublic
            }
        };
    } catch (error) {
        console.error('Failed to update visibility:', error);
        throw error;
    }
};

/**
 * Toggles the registration status of a specific hackathon.
 * @param {string} id The ID of the hackathon.
 * @returns {Promise<Object>} A promise resolving to the update status and updated hackathon.
 */
export const toggleHackathonRegistration = async (id) => {
    try {
        const { data: current } = await apiClient.get(`/hackathons/${id}`);
        const newStatus = current.status === 'Active' ? 'Draft' : 'Active';
        
        const { data: updated } = await apiClient.put(`/hackathons/${id}`, {
            status: newStatus
        });

        return {
            success: true,
            message: `Hackathon registration status updated to ${updated.status}`,
            hackathon: {
                ...updated,
                id: updated._id,
                status: updated.status
            }
        };
    } catch (error) {
        console.error('Failed to update registration status:', error);
        throw error;
    }
};

/**
 * Resets the hackathons data - Not applicable for real API
 */
export const resetMyHackathonsData = async () => {
    return { success: true, message: 'Reset not supported for live data' };
};
