import apiClient from '../../api/api';

/** Fetch the persisted dashboard data for the authenticated student. */
export const fetchDashboardData = async () => {
    const { data } = await apiClient.get('/dashboard/my-hackathons');
    return data;
};
