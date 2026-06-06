import apiClient from './api';

export const fetchAllHackathons = async (params = {}) => {
    const { data } = await apiClient.get('/hackathon/allHackathons', { params });
    return data || [];
};

export const fetchMyHackathons = async () => {
    const { data } = await apiClient.get('/hackathon/myhackathons');
    return data || [];
};

export const fetchHackathonById = async (id) => {
    const { data } = await apiClient.get(`/hackathon/${id}`);
    return data;
};

export const createHackathon = async (hackathonFormData) => {
    // Note: This might be multipart/form-data
    const { data } = await apiClient.post('/hackathon', hackathonFormData);
    return data;
};

export const updateHackathon = async (id, hackathonFormData) => {
    const { data } = await apiClient.put(`/hackathon/${id}`, hackathonFormData);
    return data;
};

export const deleteHackathon = async (id) => {
    const { data } = await apiClient.delete(`/hackathon/${id}`);
    return data;
};
