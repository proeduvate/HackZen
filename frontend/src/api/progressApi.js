import apiClient from './api';

export const getTeamProgress = async (teamId) => {
  const { data } = await apiClient.get(`/progress/team/${teamId}`);
  return data;
};

export const updateTeamProgress = async (teamId, progressData) => {
  const { data } = await apiClient.put(`/progress/team/${teamId}`, progressData);
  return data;
};

export const createMilestoneProgress = async (milestoneData) => {
  const { data } = await apiClient.post('/progress/milestone', milestoneData);
  return data;
};

export const getMilestonesProgress = async (progressId) => {
  const { data } = await apiClient.get(`/progress/milestones/${progressId}`);
  return data;
};
