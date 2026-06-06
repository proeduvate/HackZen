import apiClient from '../../api/api';

/**
 * Student Dashboard API
 * Associated Page: StudentDashboard.jsx
 */

export const fetchDashboardData = async () => {
    try {
        const { data } = await apiClient.get('/dashboard/my-hackathons');
        
        const featuredHackathon = data.ongoing_hackathons?.[0] || data.upcoming_hackathons?.[0] || null;

        return {
            stats: [
                { label: 'Engagements', value: String(data.user_stats.total_hackathons).padStart(2, '0'), icon: '⚡', color: 'blue' },
                { label: 'Collaborations', value: String(data.my_teams.length).padStart(2, '0'), icon: '👥', color: 'purple' },
                { label: 'Badges', value: String(data.user_stats.badges_earned).padStart(2, '0'), icon: '💎', color: 'amber' }
            ],
            featured: featuredHackathon ? {
                id: featuredHackathon._id || featuredHackathon.id,
                title: featuredHackathon.title,
                organizer: featuredHackathon.organizer || 'ProEduVate',
                description: featuredHackathon.description || '',
                date: featuredHackathon.hackathonStart
                    ? new Date(featuredHackathon.hackathonStart).toLocaleDateString()
                    : '',
                status: featuredHackathon.status || 'Open',
                image: featuredHackathon.posterUrl || 'bg-gradient-to-r from-purple-600 to-indigo-600',
                tags: featuredHackathon.themes || []
            } : {},
            tracked: data.my_teams.map(team => {
                const hackathon = data.ongoing_hackathons.find(h => h.id === team.hackathonId) || 
                                 data.past_hackathons.find(h => h.id === team.hackathonId);
                
                return {
                    id: team.id,
                    name: team.hackathonTitle,
                    status: hackathon ? (hackathon.status.charAt(0).toUpperCase() + hackathon.status.slice(1)) : 'Active',
                    team: team.name,
                    progress: hackathon ? (hackathon.status === 'completed' ? 100 : 45) : 10,
                    next: team.role === 'leader' ? 'Manage Team' : 'Complete Tasks',
                    logo: team.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                };
            })
        };
    } catch (error) {
        console.error("Error fetching student dashboard data:", error);
        return {
            stats: [{ label: 'Engagements', value: '00', icon: '⚡', color: 'blue' }],
            featured: {},
            tracked: []
        };
    }
};
