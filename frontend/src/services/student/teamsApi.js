import apiClient from '../../api/api';
import { updateMilestoneProgress } from '../../api/progressApi';

const currentUserId = () => {
    const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
    return user._id || user.id || '';
};

const toWorkspaceMessage = (message) => ({
    id: message._id || message.id,
    text: message.content,
    sender: message.senderId === currentUserId() ? 'me' : 'them',
    user: message.senderName || 'Team member',
    time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: message.messageType || 'text',
});

const toWorkspaceFile = (file) => ({
    id: file._id || file.id,
    name: file.name,
    size: `${(Number(file.size || 0) / (1024 * 1024)).toFixed(1)} MB`,
    type: (file.name || '').split('.').pop()?.toUpperCase() || 'FILE',
    uploader: file.uploadedByName || 'Team member',
    time: new Date(file.createdAt).toLocaleString(),
    url: file.url,
    attachmentType: file.attachmentType,
    attachmentSize: Number(file.size || 0),
});

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
        return data.map((team, idx) => ({
            id: team._id,
            name: team.teamName,
            hackathon: team.hackathonName || team.hackathonTitle || 'Active Hackathon',
            hackathonId: team.hackathonId,
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
        const [msgRes, progressRes, filesRes] = await Promise.all([
            apiClient.get(`/chat/${teamId}/messages`),
            apiClient.get(`/progress/team/${teamId}`).catch(() => ({ data: null })),
            apiClient.get(`/chat/${teamId}/files`),
        ]);

        const messages = (msgRes.data || []).map(toWorkspaceMessage);

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
            files: (filesRes.data || []).map(toWorkspaceFile)
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
        const { data } = await apiClient.post('/teams/', teamData);
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
        const { data } = await apiClient.post(`/chat/${teamId}/messages`, {
            content: messageData.text || messageData.content,
            messageType: messageData.type || 'text'
        });
        return { success: true, message: toWorkspaceMessage(data) };
    } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
    }
};

export const fetchTeamFiles = async (teamId) => {
    const { data } = await apiClient.get(`/chat/${teamId}/files`);
    return data || [];
};

export const uploadTeamFile = async (teamId, file) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post(`/chat/${teamId}/files`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return toWorkspaceFile(data);
};

export const downloadTeamFile = async (file) => {
    const { data } = await apiClient.get(file.url.replace(/^\/api/, ''), { responseType: 'blob' });
    const href = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = href;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(href);
};

/**
 * Updates a task status
 */
export const updateTaskStatus = async (teamId, taskId, newStatus) => {
    try {
        await updateMilestoneProgress(taskId, newStatus === 'Done');
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

        return {
            alerts: inboxRes.data.filter(n => !n.isRead).map(n => ({ id: n._id, type: 'warning', message: n.title })),
            registrations: await Promise.all(appsRes.data.map(async (app) => {
                let name = 'Hackathon';
                try {
                    const { data: hackathon } = await apiClient.get(`/hackathon/${app.hackathonId}`);
                    name = hackathon.title || name;
                } catch (_) {
                    // An inaccessible/deleted event should not prevent the
                    // remainder of the user's registrations from loading.
                }
                return {
                    id: app.hackathonId,
                    name,
                    date: new Date(app.appliedAt).toLocaleDateString(),
                    status: app.status,
                    color: 'text-blue-400'
                };
            }))
        };
    } catch (error) {
        console.error('Failed to fetch teams meta:', error);
        return { alerts: [], registrations: [] };
    }
};
