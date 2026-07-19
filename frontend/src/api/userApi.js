import apiClient from './api';

const MOCK_USERS = [
    {
        name: 'Ananya Rao',
        email: 'ananya.rao@microsoft.com',
        password: 'Ananya@MS2024',
        role: 'mentor',
    },
    {
        name: 'M. Sailesh',
        email: 'msailesh@gmail.com',
        password: 'sailesh2412',
        role: 'student',
    },
    {
        name: 'P. Saravanan',
        email: 'psaravanan@gmail.com',
        password: 'saro2802',
        role: 'organizer',
    },
    {
        name: 'Ghari Rajan',
        email: 'ghariraajan@gmail.com',
        password: 'hari5426',
        role: 'admin',
    },
];

export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

export const register = async (userData) => {
    const existingUser = MOCK_USERS.find(
        (user) => user.email.toLowerCase() === userData.email.toLowerCase()
    );

    if (existingUser) {
        throw { detail: 'Email already registered' };
    }

    const newUser = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role || 'student',
    };

    MOCK_USERS.push(newUser);

    return {
        message: 'User registered successfully (Mock)',
        user: {
            _id: `mock_${Date.now()}`,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
        },
    };
};

export const login = async (credentials) => {
    const user = MOCK_USERS.find(
        (entry) =>
            entry.email.toLowerCase() === credentials.email.toLowerCase() &&
            entry.password === credentials.password
    );

    if (!user) {
        throw { detail: 'Invalid credentials' };
    }

    const data = {
        token: `mock-token-${btoa(user.email)}`,
        user: {
            _id: `mock-${user.role}-${user.email}`,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    };

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setAuthToken(data.token);

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
