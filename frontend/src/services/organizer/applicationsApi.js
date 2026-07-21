import apiClient from '../../api/api';

export const fetchApplicationsForHackathon = async (hackathonId) => {
    const { data } = await apiClient.get(`/applications/hackathon/${hackathonId}`);
    return data;
};

export const updateApplicationStatus = async (applicationId, status) => {
    const { data } = await apiClient.put(`/applications/${applicationId}`, { status });
    return data;
};
