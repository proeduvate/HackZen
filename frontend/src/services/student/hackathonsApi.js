import apiClient from '../../api/api';

/**
 * Student Hackathons API
 * Associated Page: StudentHackathons.jsx
 */

export const fetchExploreHackathons = async (filters = {}) => {
    try {
        console.log('Mocking Explore Hackathons fetch');
        
        // Simulating network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        /* REAL API CALL - Commented out for mock flow
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.theme) params.append('theme', filters.theme);
        if (filters.search) params.append('search', filters.search);

        const { data } = await apiClient.get(`/hackathon/allHackathons?${params.toString()}`);
        
        return data.map(h => ({
            id: h._id,
            title: h.title,
            organizer: 'ProEduvate Partner', // Placeholder until organizer name is joined
            description: h.description,
            tags: h.themes || [],
            date: new Date(h.hackathonStart).toLocaleDateString(),
            duration: 'Flexible',
            participants: 'Active',
            mode: h.location === 'Online' ? 'Online' : 'Hybrid',
            status: h.status,
            teamSizeLimit: h.maxTeamSize || 4,
            image: h.posterUrl || 'bg-gradient-to-r from-purple-600 to-indigo-600',
        }));
        */

        // Mock data
        return [
            {
                id: 'mock_h1',
                title: 'Global AI Innovators 2026',
                organizer: 'TechGiant Corp',
                description: 'Build the next generation of AI tools for social good.',
                tags: ['AI', 'Sustainability', 'Open Source'],
                date: 'May 15, 2026',
                duration: '48 Hours',
                participants: '120+',
                mode: 'Online',
                status: 'Open',
                teamSizeLimit: 4,
                image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800',
            },
            {
                id: 'mock_h2',
                title: 'Eco-Hack: Green Solutions',
                organizer: 'EarthWatch',
                description: 'Solve environmental challenges with software and hardware.',
                tags: ['Environment', 'IoT', 'CleanTech'],
                date: 'June 10, 2026',
                duration: '72 Hours',
                participants: '85+',
                mode: 'Hybrid',
                status: 'Open',
                teamSizeLimit: 3,
                image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800',
            },
            {
                id: 'mock_h3',
                title: 'CyberDefenders Challenge',
                organizer: 'SecureNet',
                description: 'Capture the flag and build secure infrastructure.',
                tags: ['Cybersecurity', 'Networking', 'Python'],
                date: 'July 22, 2026',
                duration: '24 Hours',
                participants: '200+',
                mode: 'Online',
                status: 'Upcoming',
                teamSizeLimit: 2,
                image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
            }
        ];
    } catch (error) {
        console.error('Failed to fetch explore hackathons:', error);
        return [];
    }
};

export const registerForHackathon = async (hackathonId, registrationData) => {
    try {
        console.log('Mocking legacy Registration for:', hackathonId);
        
        // Simulating network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        /* REAL API CALL
        const { data } = await apiClient.post('/applications/', {
            hackathonId: hackathonId,
            ...registrationData
        });
        return { success: true, message: 'Registration confirmed', data };
        */

        return { 
            success: true, 
            message: 'Registration confirmed (Mock)', 
            data: { _id: 'mock_' + Date.now() } 
        };
    } catch (error) {
        console.error('Registration failed:', error);
        throw error;
    }
};
