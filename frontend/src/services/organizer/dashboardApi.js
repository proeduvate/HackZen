import apiClient from '../../api/api';

/**
 * Organizer Dashboard API
 * 
 * This service provides the core data required for the Organizer Dashboard,
 * connecting to backend statistical endpoints.
 */

export const fetchOrganizerDashboardData = async (dateFilter = '30days') => {
    try {
        const { data } = await apiClient.get('/dashboard/organizer-stats');
        
        return {
            stats: [
                { id: 'active_h', title: 'Live Events', value: data.totalHackathons, change: 'Sync', isPositive: true, icon: '🚀', color: 'cyan' },
                { id: 'total_p', title: 'Participants', value: data.totalParticipants, change: '+10%', isPositive: true, icon: '👥', color: 'purple' },
                { id: 'total_t', title: 'Total Teams', value: data.totalTeams, change: '+5%', isPositive: true, icon: '📥', color: 'emerald' },
                { id: 'pending_e', title: 'Need Review', value: 0, change: 'Stable', isPositive: true, icon: '⚖️', color: 'amber' },
            ],
            hackathons: {
                active: data.hackathonBreakdown.filter(h => h.status !== 'completed' && h.status !== 'draft').map(h => ({
                    id: h.id,
                    name: h.title,
                    status: h.status.charAt(0).toUpperCase() + h.status.slice(1),
                    duration: 'Active',
                    registrations: h.participantCount,
                    track: 'General',
                    progress: h.status === 'live' ? 50 : 20
                })),
                upcoming: data.hackathonBreakdown.filter(h => h.status === 'draft').map(h => ({
                    id: h.id,
                    name: h.title,
                    status: 'Draft',
                    duration: 'Planning',
                    registrations: 0,
                    track: 'General',
                    progress: 0
                })),
                past: data.hackathonBreakdown.filter(h => h.status === 'completed').map(h => ({
                    id: h.id,
                    name: h.title,
                    status: 'Completed',
                    duration: 'Finished',
                    registrations: h.participantCount,
                    track: 'General',
                    progress: 100
                }))
            },
            // Activity and funnel can stay as mocks for now until backend provides them
            activity: [
                { id: 1, action: 'Platform Sync', target: 'Intelligence Matrix', time: 'Just now', type: 'update' }
            ],
            funnelData: { accepted: 85, inReview: 45, rejected: 12 }
        };
    } catch (error) {
        console.error("Error fetching organizer dashboard data:", error);
        throw error;
    }
};
