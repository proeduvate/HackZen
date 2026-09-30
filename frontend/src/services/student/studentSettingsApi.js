import apiClient from '../../api/api';

/**
 * Student Settings API
 *
 * Manages user preferences through the authenticated backend API.
 */

const DEFAULT_SETTINGS = {
    profileMode: 'Public',
    emailNotifications: true,
    pushNotifications: false,
    theme: 'Purple Dark',
    accessibilityMode: false,
    contentLanguage: 'English (US)',
    twoFactorEnabled: true,
    dataSharing: true
};

/**
 * Fetches the current student's saved MongoDB settings.
 */
export const fetchStudentSettings = async () => {
    try {
        const { data } = await apiClient.get('/settings/me');
        return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    } catch (error) {
        console.error('Failed to fetch student settings:', error);
        return { ...DEFAULT_SETTINGS };
    }
};

/**
 * Updates specific settings for the student in MongoDB.
 */
export const updateStudentSettings = async (updatedSettings) => {
    try {
        const { data } = await apiClient.put('/settings/me', updatedSettings);
        return {
            success: data.success,
            message: 'Preferences updated successfully',
            settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) }
        };
    } catch (error) {
        console.error('Failed to update student settings:', error);
        throw error;
    }
};

/**
 * Deactivates the student account via backend.
 */
export const deactivateStudentAccount = async () => {
    try {
        const { data } = await apiClient.delete('/profile/me');
        localStorage.clear();
        sessionStorage.clear();
        return {
            success: true,
            message: data?.message || 'Account has been scheduled for deactivation'
        };
    } catch (error) {
        console.error('Account deactivation failed:', error);
        throw error;
    }
};

/**
 * Toggles a specific boolean setting for the student.
 */
export const toggleStudentSetting = async (key) => {
    try {
        const current = await fetchStudentSettings();
        const updated = { [key]: !current[key] };
        const { data } = await apiClient.put('/settings/me', updated);
        return {
            success: data.success,
            key,
            newValue: updated[key],
            message: 'Setting toggled successfully'
        };
    } catch (error) {
        console.error(`Failed to toggle setting "${key}":`, error);
        throw error;
    }
};
