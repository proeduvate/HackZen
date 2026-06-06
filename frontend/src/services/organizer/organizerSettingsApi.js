import apiClient from '../../api/api';

/**
 * Organizer Settings API Integration
 * Synchronized with profileModel.py and profileRoutes.py
 */

export const fetchOrganizerSettings = async () => {
    try {
        const { data } = await apiClient.get('/profile/me');
        const roleProfile = data.organizer_profile || data.profile || {};
        
        return {
            orgName: roleProfile.institutionName || 'TechConnect Events',
            emailReports: 'weekly', // System preference
            autoApproveMentors: false // System preference
        };
    } catch (error) {
        console.error("Error fetching organizer settings:", error);
        throw error;
    }
};

export const updateOrganizerSettings = async (updatedSettings) => {
    try {
        // Map frontend fields to backend OrganizerInDB model
        const profilePayload = {
            institutionName: updatedSettings.institutionName || updatedSettings.orgName,
            institutionType: updatedSettings.institutionType,
            designation: updatedSettings.designation,
            bio: updatedSettings.bio,
            phoneNumber: updatedSettings.phoneNumber,
            linkedinUrl: updatedSettings.linkedinUrl
        };

        const { data } = await apiClient.put('/profile/me', profilePayload);
        
        return {
            success: true,
            data: {
                ...updatedSettings,
                orgName: data.institutionName
            }
        };
    } catch (error) {
        console.error("Error updating organizer settings:", error);
        throw error;
    }
};
