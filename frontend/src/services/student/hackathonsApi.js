import apiClient from '../../api/api';

/**
 * Student Hackathons API
 * Associated Page: StudentHackathons.jsx
 */

export const fetchExploreHackathons = async (filters = {}) => {
    try {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.theme) params.append('theme', filters.theme);
        if (filters.search) params.append('search', filters.search);

        const { data } = await apiClient.get(`/hackathon/allHackathons?${params.toString()}`);
        
        return data.map(h => ({
            id: h._id,
            title: h.title,
            organizer: 'ProEduvate Partner', // Placeholder until organizer name is joined in backend
            description: h.description,
            tags: h.themes || [],
            date: h.hackathonStart ? new Date(h.hackathonStart).toLocaleDateString() : 'TBD',
            duration: h.duration || 'Flexible',
            participants: 'Active',
            mode: h.location === 'Online' ? 'Online' : 'Hybrid',
            status: h.status,
            teamSizeLimit: h.maxTeamSize || 4,
            image: h.posterUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
        }));
    } catch (error) {
        console.error('Failed to fetch explore hackathons:', error);
        return [];
    }
};

export const registerForHackathon = async (hackathonId, registrationData) => {
    try {
        const { data } = await apiClient.post('/applications/', {
            hackathonId: hackathonId,
            ...registrationData
        });
        return { success: true, message: 'Registration confirmed', data };
    } catch (error) {
        console.error('Registration failed:', error);
        throw error;
    }
};
