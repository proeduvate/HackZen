/**
 * Organizer Profile API Integration
 */

import apiClient from '../../api/api';

// Default profile structure matching the OrganizerProfile component's expectations
const DEFAULT_PROFILE = {
    name: 'Jane Doe',
    role: 'Lead Organizer',
    organization: 'TechConnect Events',
    bio: '',
    avatarGradient: 'from-cyan-600 to-blue-600',
    links: {
        website: '',
        linkedin: '',
        twitter: ''
    },
    stats: {
        hackathons: 0,
        participants: '0',
        teams: 0
    },
    upcomingEvents: [],
    initials: 'JD',
    verifiedSince: ''
};

/**
 * Fetches the current organizer's profile data from backend.
 */
export const fetchOrganizerProfile = async () => {
    try {
        const { data } = await apiClient.get('/profile/me');
        const roleProfile = data.organizer_profile || {};
        
        const profileData = {
            ...DEFAULT_PROFILE,
            ...data,
            ...roleProfile,
            organization: roleProfile.institutionName || DEFAULT_PROFILE.organization,
            institutionType: roleProfile.institutionType || '',
            designation: roleProfile.designation || '',
            links: {
                linkedin: roleProfile.linkedinUrl || '',
            },
            initials: (data.name || '').split(' ').map(n => n[0]).join('').toUpperCase() || 'JD'
        };
        
        // Cache in localStorage for persistence across sessions
        const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
        const cachedUser = { ...existingUser, ...data, organizer_profile: profileData };
        localStorage.setItem('user', JSON.stringify(cachedUser));
        sessionStorage.setItem('user', JSON.stringify(cachedUser));
        
        return profileData;
    } catch (error) {
        console.error('Failed to fetch organizer profile from server:', error);
        
        // Fallback to cached data if server request fails
        try {
            const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (cachedUser && cachedUser.organizer_profile) {
                console.log('Using cached organizer profile data from localStorage');
                return cachedUser.organizer_profile;
            }
        } catch (cacheError) {
            console.error('Failed to retrieve cached profile:', cacheError);
        }
        
        throw error;
    }
};

/**
 * Get cached profile from localStorage without server request
 */
export const getCachedOrganizerProfile = () => {
    try {
        const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
        return cachedUser.organizer_profile || null;
    } catch (error) {
        console.error('Failed to retrieve cached profile:', error);
        return null;
    }
};

/**
 * Updates the organizer's profile data in backend.
 */
export const updateOrganizerProfile = async (updatedFields) => {
    try {
        const backendPayload = { ...updatedFields };
        
        if (updatedFields.organization) {
            backendPayload.institutionName = updatedFields.organization;
            delete backendPayload.organization;
        }

        if (updatedFields.institutionType) {
            backendPayload.institutionType = updatedFields.institutionType;
        }

        if (updatedFields.designation) {
            backendPayload.designation = updatedFields.designation;
        }
        
        if (updatedFields.links) {
            backendPayload.linkedinUrl = updatedFields.links.linkedin;
            delete backendPayload.links;
        }

        const { data } = await apiClient.put('/profile/me', backendPayload);
        
        // Sync updated profile to localStorage for persistence across sessions
        if (data) {
            const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = {
                ...existingUser,
                name: updatedFields.name || existingUser.name,
                organizer_profile: {
                    ...existingUser.organizer_profile,
                    ...data,
                    institutionName: backendPayload.institutionName || existingUser.organizer_profile?.institutionName,
                    institutionType: backendPayload.institutionType || existingUser.organizer_profile?.institutionType,
                    designation: backendPayload.designation || existingUser.organizer_profile?.designation,
                    linkedinUrl: backendPayload.linkedinUrl || existingUser.organizer_profile?.linkedinUrl
                }
            };
            
            localStorage.setItem('user', JSON.stringify(updatedUser));
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        return {
            success: true,
            message: 'Organizer profile updated successfully',
            profile: data
        };
    } catch (error) {
        console.error('Organizer profile update failed:', error);
        throw error;
    }
};
