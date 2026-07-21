import apiClient from '../../api/api';

/**
 * Student Teams API
 * Provides service functions for team management and collaboration using the real backend.
 */

/**
 * Fetches all teams the user is part of
 */
export const fetchMyTeams = async () => {
    try {
        const { data } = await apiClient.get('/teams/my');
        const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
        const currentUserId = user._id || user.id;

        return data.map((team, idx) => ({
            id: team._id || team.id,
            name: team.teamName,
            hackathon: team.hackathonId || 'Active Hackathon',
            status: 'Active',
            lastMessage: 'Check workspace for updates',
            time: 'Active',
            unread: 0,
            gradient: idx % 2 === 0 ? 'from-blue-600 to-indigo-600' : 'from-emerald-500 to-teal-600',
            isOnline: true,
            progress: 0,
            members: team.members?.length || 1,
            domain: team.domain || 'Technology',
            roleInTeam: team.leaderId === currentUserId ? 'Team Lead' : 'Member',
            activity: []
        }));
    } catch (error) {
        console.error('Failed to fetch teams:', error);
        return [];
    }
};

/**
 * Fetches workspace data for a specific team (messages, tasks, files)
 */
export const fetchTeamWorkspace = async (teamId) => {
    try {
        const [msgRes, progressRes] = await Promise.all([
            apiClient.get(`/chat/${teamId}/messages`),
            apiClient.get(`/progress/team/${teamId}`).catch(() => ({ data: null }))
        ]);

        const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
        const currentUserId = user._id || user.id;

        const messages = (msgRes.data || []).map(m => ({
            id: m._id || m.id,
            text: m.content,
            sender: m.senderId === currentUserId ? 'me' : 'them',
            user: m.senderName || 'Teammate',
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: m.messageType || 'text'
        }));

        // Fetch milestones if progress exists
        let tasks = [];
        if (progressRes.data) {
            const { data: milestones } = await apiClient.get(`/progress/milestones/${progressRes.data._id}`);
            tasks = milestones.map(m => ({
                id: m._id || m.id,
                title: m.milestoneId,
                status: m.completed ? 'Done' : 'In Progress',
                priority: 'High',
                assignedTo: 'Team',
                progressId: m.progressId
            }));
        }

        return {
            messages,
            tasks,
            files: [] // Placeholder for files router
        };
    } catch (error) {
        console.error('Failed to fetch team workspace:', error);
        throw error;
    }
};

/**
 * Creates a new team
 */
export const createTeam = async (teamData) => {
    try {
        const payload = {
            teamName: teamData.name,
            hackathonId: teamData.hackathon,
            domain: teamData.domain
        };
        const { data } = await apiClient.post('/teams/', payload);
        return { success: true, team: data };
    } catch (error) {
        console.error('Failed to create team:', error);
        throw error;
    }
};

/**
 * Joins a team using an invite code
 */
export const joinTeamByCode = async (inviteCode) => {
    try {
        const { data } = await apiClient.post(`/teams/join/${inviteCode}`);
        return { success: true, message: 'Successfully joined team', data };
    } catch (error) {
        console.error('Failed to join team:', error);
        throw error;
    }
};

/**
 * Sends a message in a team workspace
 */
export const sendMessage = async (teamId, messageData) => {
    try {
        // Most messaging happens via WebSocket in the component
        // This is a fallback or for HTTP-based sending
        const { data } = await apiClient.post(`/chat/${teamId}/send`, messageData);
        return { success: true, message: data };
    } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
    }
};

/**
 * Updates a task status
 */
export const updateTaskStatus = async (progressId, milestoneId, completed) => {
    try {
        // Hit the correct POST endpoint to log milestone completion
        const { data } = await apiClient.post('/progress/milestone', {
            progressId,
            milestoneId,
            completed
        });
        return { success: true, data };
    } catch (error) {
        console.error('Failed to update task:', error);
        throw error;
    }
};

/**
 * Fetches alerts and registered hackathons for the overview
 */
export const fetchTeamsMeta = async () => {
    try {
        const [inboxRes, appsRes] = await Promise.all([
            apiClient.get('/inbox/'),
            apiClient.get('/applications/my')
        ]);

        const approvedApps = appsRes.data.filter(app => app.status === 'approved');

        // Fetch details for each approved hackathon to resolve the name
        const registrations = await Promise.all(
            approvedApps.map(async (app) => {
                try {
                    const { data: hackathon } = await apiClient.get(`/hackathon/${app.hackathonId}`);
                    return {
                        id: app._id || app.id,
                        name: hackathon.title || 'Unknown Hackathon',
                        hackathonId: app.hackathonId,
                        date: new Date(app.appliedAt).toLocaleDateString(),
                        status: app.status,
                        color: 'text-blue-400'
                    };
                } catch (e) {
                    return {
                        id: app._id || app.id,
                        name: `Hackathon (${app.hackathonId.substring(0, 6)})`,
                        hackathonId: app.hackathonId,
                        date: new Date(app.appliedAt).toLocaleDateString(),
                        status: app.status,
                        color: 'text-blue-400'
                    };
                }
            })
        );

        return {
            alerts: inboxRes.data.filter(n => !n.isRead).map(n => ({ id: n._id, type: 'warning', message: n.title })),
            registrations
        };
    } catch (error) {
        console.error('Failed to fetch teams meta:', error);
        return { alerts: [], registrations: [] };
    }
};
