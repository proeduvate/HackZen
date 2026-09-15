import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_BASE_URL = rawBaseUrl.endsWith('/api') || rawBaseUrl.includes('/api/')
    ? rawBaseUrl.replace(/\/$/, '')
    : `${rawBaseUrl.replace(/\/$/, '')}/api`;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to add the auth token to hea   ders
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle errors globally
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const token = localStorage.getItem('token');
            if (token?.startsWith('mock-token-')) {
                return Promise.reject(error);
            }

            // Handle unauthorized access (e.g., redirect to login)
            localStorage.removeItem('token');
            localStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('isLoggedIn');
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;
