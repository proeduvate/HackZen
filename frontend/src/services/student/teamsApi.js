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
        const { data } = await apiClient.get('/teams/my-teams');
        return data.map((team, idx) => ({
            id: team._id,
            name: team.teamName,
            teamCode: team.teamCode || null,
            hackathon: team.hackathonId || 'Active Hackathon',
            status: 'Active',
            lastMessage: 'Check workspace for updates',
            time: 'Active',
            unread: 0,
            gradient: idx % 2 === 0 ? 'from-blue-600 to-indigo-600' : 'from-emerald-500 to-teal-600',
            isOnline: true,
            progress: 0,
            members: team.members?.length || 1,
            domain: 'Technology',
            roleInTeam: team.leaderId === JSON.parse(localStorage.getItem('user') || '{}')._id ? 'Team Lead' : 'Member',
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

        const messages = (msgRes.data || []).map(m => ({
            id: m._id,
            text: m.content,
            sender: m.senderId === JSON.parse(localStorage.getItem('user') || '{}')._id ? 'me' : 'them',
            user: m.senderName || 'Teammate',
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: m.messageType || 'text'
        }));

        // Fetch milestones if progress exists
        let tasks = [];
        if (progressRes.data) {
            const { data: milestones } = await apiClient.get(`/progress/milestones/${progressRes.data._id}`);
            tasks = milestones.map(m => ({
                id: m._id,
                title: m.milestoneId,
                status: m.completed ? 'Done' : 'In Progress',
                priority: 'High',
                assignedTo: 'Team'
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
            hackathonId: teamData.hackathonId || teamData.hackathon,
            teamName: teamData.name || teamData.teamName
        };
        const { data } = await apiClient.post('/teams/', payload);
        return {
            success: true,
            team: {
                id: data._id,
                name: data.teamName,
                hackathon: data.hackathonId,
                status: 'Active',
                lastMessage: 'Team workspace created',
                time: 'Just now',
                unread: 0,
                gradient: 'from-purple-600 to-indigo-600',
                isOnline: true,
                progress: 0,
                members: 1,
                domain: teamData.domain || 'Technology',
                roleInTeam: 'Team Lead',
                activity: []
            }
        };
    } catch (error) {
        console.error('Failed to create team:', error);
        throw new Error(error.response?.data?.detail || error.response?.data?.error?.message || 'Failed to create team');
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
export const updateTaskStatus = async (teamId, taskId, newStatus) => {
    try {
        // This would typically hit a progress/milestone update endpoint
        await apiClient.put(`/progress/milestones/${taskId}`, { completed: newStatus === 'Done' });
        return { success: true, taskId, newStatus };
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

        const uniqueHackathonIds = [...new Set(appsRes.data.map(app => app.hackathonId).filter(Boolean))];
        const hackathonResults = await Promise.allSettled(
            uniqueHackathonIds.map(id => apiClient.get(`/hackathon/${id}`))
        );
        const hackathonMap = hackathonResults.reduce((map, result, index) => {
            if (result.status === 'fulfilled') {
                const hackathon = result.value.data;
                map[uniqueHackathonIds[index]] = hackathon;
            }
            return map;
        }, {});

        return {
            alerts: inboxRes.data.filter(n => !n.read).map(n => ({ id: n._id, type: 'warning', message: n.message })),
            registrations: appsRes.data.map(app => {
                const hackathon = hackathonMap[app.hackathonId] || {};
                return {
                id: app.hackathonId,
                applicationId: app._id,
                name: hackathon.title || app.hackathonId,
                date: new Date(app.appliedAt).toLocaleDateString(),
                status: app.status,
                color: 'text-blue-400',
                domain: hackathon.themes?.[0] || 'Technology'
                };
            })
        };
    } catch (error) {
        console.error('Failed to fetch teams meta:', error);
        return { alerts: [], registrations: [] };
    }
};
