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
        throw error;
    }
};

export const login = async (credentials) => {
    /*
    const { data } = await apiClient.post('/auth/login', credentials);
    if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setAuthToken(data.token);
    }
    return data;
    */

    const mockUsers = {
        "ananya.rao@microsoft.com": {
            password: "Ananya@MS2024",
            user: {
                id: "698b615367147347c157446a",
                _id: "698b615367147347c157446a",
                name: "Ananya Rao",
                email: "ananya.rao@microsoft.com",
                role: "mentor"
            }
        },
        "msailesh@gmail.com": {
            password: "sailesh2412",
            user: {
                id: "698a2aa4c09b0ea765f8816c",
                _id: "698a2aa4c09b0ea765f8816c",
                name: "M Sailesh",
                email: "msailesh@gmail.com",
                role: "student"
            }
        },
        "psaravanan@gmail.com": {
            password: "saro2802",
            user: {
                id: "698f17438d89b42ab5f058c7",
                _id: "698f17438d89b42ab5f058c7",
                name: "P Saravanan",
                email: "psaravanan@gmail.com",
                role: "organizer"
            }
        },
        "ghariraajan@gmail.com": {
            password: "hari5426",
            user: {
                id: "698306fa7caf8be7fa179732",
                _id: "698306fa7caf8be7fa179732",
                name: "G Hari Raajan",
                email: "ghariraajan@gmail.com",
                role: "admin"
            }
        }
    };

    const email = credentials.email?.toLowerCase();
    const matched = mockUsers[email];

    if (matched && matched.password === credentials.password) {
        const mockToken = `mock-token-jwt-for-${matched.user.role}`;
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(matched.user));
        setAuthToken(mockToken);
        return {
            token: mockToken,
            user: matched.user
        };
    } else {
        throw new Error("Invalid email or password");
    }
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
