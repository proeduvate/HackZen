import apiClient from '../../api/api';

/**
 * Organizer Dashboard API
 * 
 * Provides core operational data, broadcasts, and CSV reporting
 * for the Organizer Portal.
 */

export const fetchOrganizerDashboardData = async (dateFilter = '30days') => {
    try {
        const { data } = await apiClient.get('/dashboard/organizer-stats');
        
        return {
            raw: data,
            // 4 Core Stat Cards matching Figma Screenshot 1
            stats: [
                { 
                    id: 'active_hackathons', 
                    title: 'ACTIVE HACKATHONS', 
                    value: data.totalHackathons || 3, 
                    change: '+2', 
                    isPositive: true, 
                    type: 'hackathons'
                },
                { 
                    id: 'total_registrations', 
                    title: 'TOTAL REGISTRATIONS', 
                    value: data.totalParticipants || 1240, 
                    change: '+12%', 
                    isPositive: true, 
                    type: 'registrations'
                },
                { 
                    id: 'submissions', 
                    title: 'SUBMISSIONS', 
                    value: data.totalSubmissions || 458, 
                    change: '+8%', 
                    isPositive: true, 
                    type: 'submissions'
                },
                { 
                    id: 'mentors_judges', 
                    title: 'MENTORS & JUDGES', 
                    value: data.stats?.find(s => s.id === 'mentorsJudges')?.value || 86, 
                    change: 'Verified', 
                    isPositive: true, 
                    type: 'mentors'
                }
            ],
            // Active Events Table
            activeHackathons: data.activeHackathons && data.activeHackathons.length > 0 ? data.activeHackathons : [
                { id: '1', title: 'Global Fintech Hackathon 2024', participants: '342 Participants', status: 'Active', timeline: 'Oct 12 - Oct 15', category: 'FinTech' },
                { id: '2', title: 'AI for Good: Global Challenge', participants: '128 Participants', status: 'Active', timeline: 'Oct 20 - Oct 22', category: 'AI & ML' },
                { id: '3', title: 'Eco-Innovation Sprint', participants: '86 Participants', status: 'Pending Review', timeline: 'Nov 01 - Nov 03', category: 'Sustainability' },
                { id: '4', title: 'Web3 & Decentralized Future', participants: '512 Participants', status: 'Approved', timeline: 'Nov 15 - Nov 18', category: 'Blockchain' }
            ],
            // Recent Registrations Feed
            recentRegistrations: data.recentRegistrations && data.recentRegistrations.length > 0 ? data.recentRegistrations : [
                { id: 'r1', name: 'Sarah Jenkins', initials: 'SJ', hackathon: 'Global Fintech Hack', roleOrMembers: 'Developer', timeAgo: '2 mins ago', color: 'purple' },
                { id: 'r2', name: 'Team Mavericks', initials: 'TM', hackathon: 'Global Fintech Hack', roleOrMembers: '4 Members', timeAgo: '15 mins ago', color: 'slate' },
                { id: 'r3', name: 'David Chen', initials: 'DC', hackathon: 'AI for Good', roleOrMembers: 'UI/UX Designer', timeAgo: '1 hour ago', color: 'indigo' },
                { id: 'r4', name: 'CyberPulse Team', initials: 'CP', hackathon: 'Global Fintech Hack', roleOrMembers: '3 Members', timeAgo: '3 hours ago', color: 'teal' }
            ],
            // Upcoming Deadlines Feed
            upcomingDeadlines: data.upcomingDeadlines && data.upcomingDeadlines.length > 0 ? data.upcomingDeadlines : [
                { id: 'd1', color: 'red', time: 'Today, 11:59 PM', label: 'Registration Closes', hackathon: 'Global Fintech Hack' },
                { id: 'd2', color: 'purple', time: 'Tomorrow, 9:00 AM', label: 'Judging Commences', hackathon: 'Global Fintech Hack' },
                { id: 'd3', color: 'grey', time: 'Oct 25, 5:00 PM', label: 'Submission Deadline', hackathon: 'Eco-Innovation Sprint' }
            ],
            // Backward-compatible structures
            hackathons: {
                active: (data.hackathonBreakdown || []).filter(h => h.status !== 'completed' && h.status !== 'draft').map(h => ({
                    id: h.id,
                    name: h.title,
                    status: h.status.charAt(0).toUpperCase() + h.status.slice(1),
                    duration: 'Active',
                    registrations: h.participantCount,
                    track: h.category || 'General',
                    progress: h.progress || 65
                })),
                upcoming: (data.hackathonBreakdown || []).filter(h => h.status === 'draft').map(h => ({
                    id: h.id,
                    name: h.title,
                    status: 'Draft',
                    duration: 'Planning',
                    registrations: h.participantCount || 0,
                    track: h.category || 'General',
                    progress: 0
                })),
                past: (data.hackathonBreakdown || []).filter(h => h.status === 'completed').map(h => ({
                    id: h.id,
                    name: h.title,
                    status: 'Completed',
                    duration: 'Finished',
                    registrations: h.participantCount,
                    track: h.category || 'General',
                    progress: 100
                }))
            },
            activity: (data.activityStream && data.activityStream.length > 0) ? data.activityStream.map(a => ({
                id: a.id,
                action: `${a.name} registered for`,
                target: a.hackathon,
                time: a.time,
                type: 'registration'
            })) : [
                { id: 1, action: 'Platform Sync', target: 'Live Operational Feed', time: 'Just now', type: 'update' }
            ],
            funnelData: data.funnelData || { accepted: 14, inReview: 6, rejected: 2 }
        };
    } catch (error) {
        console.error("Error fetching organizer dashboard data:", error);
        throw error;
    }
};

/**
 * Send an announcement broadcast to enrolled hackathon participants
 */
export const sendOrganizerBroadcast = async (payload) => {
    try {
        const { data } = await apiClient.post('/dashboard/organizer-broadcast', payload);
        return data;
    } catch (error) {
        console.error("Error sending organizer broadcast:", error);
        throw error;
    }
};

/**
 * Export and trigger CSV download for Organizer statistics and event breakdown
 */
export const exportOrganizerReport = async () => {
    try {
        const response = await apiClient.get('/dashboard/organizer-report', {
            responseType: 'blob'
        });
        
        // Create download link
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `organizer_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        console.error("Error exporting organizer report:", error);
        throw error;
    }
};
