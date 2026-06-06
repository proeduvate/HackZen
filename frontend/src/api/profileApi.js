import apiClient from './api';

export const fetchMyProfile = async () => {
    const { data } = await apiClient.get('/profile/me');
    return data;
};

export const updateProfile = async (profileData) => {
    const { data } = await apiClient.put('/profile/me', profileData);
    return data;
};

export const fetchAvailableMentors = async () => {
    const { data } = await apiClient.get('/profile/mentors');
    return data || [];
};

export const fetchMyCertificates = async () => {
    const { data } = await apiClient.get('/certificates/me');
    return data || [];
};
