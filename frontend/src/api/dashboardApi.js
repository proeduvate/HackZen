import apiClient from './api';

export const fetchStudentDashboardData = async () => {
    const { data } = await apiClient.get('/dashboard/my-hackathons');
    return data;
};

export const fetchOrganizerStats = async () => {
    const { data } = await apiClient.get('/dashboard/organizer-stats');
    return data;
};
