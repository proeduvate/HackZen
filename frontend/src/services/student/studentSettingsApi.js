import apiClient from '../../api/api';

/**
 * Student Settings API
 *
 * Manages user preferences using localStorage for persistence.
 * Falls back to defaults if no saved settings exist.
 */

const SETTINGS_KEY = 'student_settings';

const DEFAULT_SETTINGS = {
    profileMode: 'Public',
    emailNotifications: true,
    pushNotifications: false,
    theme: 'Blue Dark',
    accessibilityMode: false,
    contentLanguage: 'English (US)',
    twoFactorEnabled: true,
    dataSharing: true
};

/**
 * Fetches the current student settings from localStorage.
 */
export const fetchStudentSettings = async () => {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
    } catch (error) {
        console.error('Failed to fetch student settings:', error);
        return { ...DEFAULT_SETTINGS };
    }
};

/**
 * Updates specific settings for the student and persists to localStorage.
 */
export const updateStudentSettings = async (updatedSettings) => {
    try {
        const current = await fetchStudentSettings();
        const merged = { ...current, ...updatedSettings };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
        return {
            success: true,
            message: 'Preferences updated successfully',
            updatedAt: new Date().toISOString()
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
        const updated = { ...current, [key]: !current[key] };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
        return {
            success: true,
            key,
            newValue: updated[key],
            message: 'Setting toggled successfully'
        };
    } catch (error) {
        console.error(`Failed to toggle setting "${key}":`, error);
        throw error;
    }
};
