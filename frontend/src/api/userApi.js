import apiClient from './api';

export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

export const register = async (userData) => {
    try {
        const { data } = await apiClient.post('/auth/register', userData);
        return data;
    } catch (error) {
        console.error('Registration failed:', error);
        throw error.response?.data || error;
    }
};

export const login = async (credentials) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setAuthToken(data.token);
    }
    return data;
};

export const forgotPassword = async (payload) => {
    const { data } = await apiClient.post('/auth/forgot-password', payload);
    return data;
};

export const getMe = async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
};

export const logout = () => {
    // Clear all authentication and profile data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberedEmail');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userRole');
    setAuthToken(null);
    
    // Clear any cached profile data
    try {
        // Add custom cleanup if needed for other cache keys
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('mentor_') || key.startsWith('student_') || 
                key.startsWith('organizer_') || key.startsWith('admin_')) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error('Error clearing cache on logout:', error);
    }
};

export const fetchMyNotifications = async () => {
    try {
        const response = await apiClient.get('/auth/my-notifications');
        return response.data;
    } catch (error) {
        try {
            const response = await apiClient.get('/dashboard/my-notifications');
            return response.data;
        } catch (err) {
            console.error("Error fetching notifications:", error);
            return [];
        }
    }
};

export const markAllNotificationsRead = async () => {
    try {
        const response = await apiClient.put('/auth/my-notifications/read');
        return response.data;
    } catch (error) {
        try {
            const response = await apiClient.put('/dashboard/my-notifications/read');
            return response.data;
        } catch (err) {
            console.error("Error marking notifications as read:", err);
            throw err;
        }
    }
};

