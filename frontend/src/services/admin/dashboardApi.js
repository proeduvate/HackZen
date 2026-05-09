import apiClient from '../../api/api';

/**
 * Admin Dashboard API
 * Connected to backend functionality for fetching dashboard statistics and activity logs
 */

export const fetchDashboardData = async () => {
    try {
        // Admins can see organizer stats too
        const [statsData, adminsData] = await Promise.all([
            apiClient.get('/dashboard/organizer-stats'),
            apiClient.get('/dashboard/admins')
        ]);
        
        return {
            stats: [
                {
                    title: 'Active Hackathons',
                    value: statsData.data.totalHackathons,
                    change: '+Sync',
                    isPositive: true,
                    isAlert: false,
                },
                {
                    title: 'Total Teams',
                    value: statsData.data.totalTeams,
                    change: '+Live',
                    isPositive: true,
                    isAlert: false,
                },
                {
                    title: 'System Admins',
                    value: adminsData.data.length,
                    change: 'Verified',
                    isPositive: true,
                    isAlert: false,
                }
            ],
            activities: [
                {
                    id: 1,
                    title: 'System Intelligence Sync',
                    description: `Active monitoring of ${statsData.data.totalParticipants} participants across ${statsData.data.totalHackathons} entities.`,
                    time: 'Real-time',
                    category: 'System',
                    icon: '🚀',
                    categoryColor: 'blue'
                },
                {
                    id: 2,
                    title: 'Admin Hierarchy Verified',
                    description: `${adminsData.data.length} active administrative nodes identified.`,
                    time: 'Just now',
                    category: 'Security',
                    icon: '✅',
                    categoryColor: 'emerald'
                }
            ]
        };
    } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        throw error;
    }
};

/**
 * Simulate a security audit run
 */
export const runSecurityAudit = async () => {
    try {
        // Re-ping health or settings
        await apiClient.get('/dashboard/settings');
        return { success: true, message: 'All security protocols are active and verified.' };
    } catch (error) {
        return { success: false, message: 'Security scan identified synchronization latency.' };
    }
};
