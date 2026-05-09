import apiClient from './api';

export const createTeam = async (teamData) => {
    const { data } = await apiClient.post('/teams', teamData);
    return data;
};

export const getMyTeams = async () => {
    const { data } = await apiClient.get('/teams/my-teams');
    return data || [];
};

export const fetchMentorTeams = async () => {
  const { data } = await apiClient.get('/teams/mentor-teams');
  return data;
};

export const getTeamById = async (teamId) => {
    const { data } = await apiClient.get(`/teams/${teamId}`);
    return data;
};

export const getTeamMembers = async (teamId) => {
    const { data } = await apiClient.get(`/teams/${teamId}/members`);
    return data || [];
};

export const joinTeamByCode = async (teamIdOrCode) => {
    const { data } = await apiClient.post(`/teams/join/${teamIdOrCode}`);
    return data;
};

export const assignMentor = async (teamId, mentorData) => {
    const { data } = await apiClient.post(`/teams/${teamId}/assign-mentor`, mentorData);
    return data;
};

export const removeTeamMember = async (teamId, userId) => {
    const { data } = await apiClient.delete(`/teams/${teamId}/members/${userId}`);
    return data;
};

export const deleteTeam = async (teamId) => {
    const { data } = await apiClient.delete(`/teams/${teamId}`);
    return data;
};


