import apiClient from './api';

export const applyForHackathon = async (hackathonId) => {
    const { data } = await apiClient.post('/applications/', { hackathonId });
    return data;
};

export const fetchMyApplications = async () => {
    const { data } = await apiClient.get('/applications/my');
    return data || [];
};

export const fetchHackathonApplications = async (hackathonId) => {
    const { data } = await apiClient.get(`/applications/hackathon/${hackathonId}`);
    return data || [];
};
