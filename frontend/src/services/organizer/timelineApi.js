import apiClient from '../../api/api';

/**
 * Organizer Timeline API
 * Manages hackathon phases and schedules.
 */

export const fetchTimeline = async (hackathonId) => {
    try {
        const [hackathonRes, timelineRes] = await Promise.all([
            apiClient.get(`/hackathons/${hackathonId}`),
            // Note: If a specific timeline endpoint doesn't exist, we might derive it or use a dedicated one
            apiClient.get(`/hackathons/${hackathonId}/timeline`).catch(() => ({ data: { phases: [] } }))
        ]);

        return {
            hackathon: hackathonRes.data,
            phases: timelineRes.data.phases || []
        };
    } catch (error) {
        console.error('Failed to fetch timeline:', error);
        throw error;
    }
};

export const updateTimeline = async (hackathonId, phases) => {
    try {
        const { data } = await apiClient.put(`/hackathons/${hackathonId}/timeline`, { phases });
        return { success: true, data };
    } catch (error) {
        console.error('Failed to update timeline:', error);
        throw error;
    }
};
