import apiClient from '../api/api';

/**
 * Inbox & Notifications API
 */

export const fetchNotifications = async (options = {}) => {
    try {
        const params = new URLSearchParams();
        if (options.unreadOnly) params.append('unread_only', 'true');
        if (options.limit) params.append('limit', options.limit);
        
        const { data } = await apiClient.get(`/inbox/?${params.toString()}`);
        return data;
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        return [];
    }
};

export const fetchUnreadCount = async () => {
    try {
        const { data } = await apiClient.get('/inbox/count');
        return data.count;
    } catch (error) {
        console.error('Failed to fetch unread count:', error);
        return 0;
    }
};

export const markAsRead = async (id) => {
    try {
        await apiClient.put(`/inbox/${id}/read`);
        return true;
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
        return false;
    }
};

export const markAllAsRead = async () => {
    try {
        await apiClient.put('/inbox/read-all');
        return true;
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        return false;
    }
};

export const deleteNotification = async (id) => {
    try {
        await apiClient.delete(`/inbox/${id}`);
        return true;
    } catch (error) {
        console.error('Failed to delete notification:', error);
        return false;
    }
};
