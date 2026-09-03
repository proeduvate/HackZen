import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/api';

const PlatformSettingsContext = createContext();

export const defaultPlatformSettings = {
    platformName: 'ProEduvate',
    website: 'https://proeduvate.com',
    supportEmail: 'support@proeduvate.com',
    supportPhone: '+91 800 123 4567',
    timezone: 'Asia/Kolkata (IST)',
    country: 'India',
    dateFormat: 'MMM DD, YYYY',
    maintenanceMode: false,
    publicRegistrations: true,
    maxTeamSize: 4,
    minTeamSize: 1,
    allowLateSubmissions: false,
    publicLeaderboard: true,
};

export const PlatformSettingsProvider = ({ children }) => {
    const [platformSettings, setPlatformSettings] = useState(() => {
        try {
            const cached = localStorage.getItem('cachedPlatformSettings');
            return cached ? { ...defaultPlatformSettings, ...JSON.parse(cached) } : defaultPlatformSettings;
        } catch {
            return defaultPlatformSettings;
        }
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        try {
            const { data } = await apiClient.get('/admin/settings/public');
            if (data && typeof data === 'object') {
                const merged = { ...defaultPlatformSettings, ...data };
                setPlatformSettings(merged);
                localStorage.setItem('cachedPlatformSettings', JSON.stringify(merged));
            }
        } catch (error) {
            console.warn('Failed to load public platform settings, using cached/defaults:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch and event subscriptions for real-time synchronization
    useEffect(() => {
        fetchSettings();

        const handleSettingsUpdated = () => {
            fetchSettings();
        };

        const handleStorageChange = (e) => {
            if (e.key === 'cachedPlatformSettings' || e.key === 'platformSettingsTimestamp') {
                fetchSettings();
            }
        };

        // Window events
        window.addEventListener('platform-settings-updated', handleSettingsUpdated);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('focus', handleSettingsUpdated);

        // Polling every 15 seconds for real-time platform updates across sessions
        const pollInterval = setInterval(fetchSettings, 15000);

        return () => {
            window.removeEventListener('platform-settings-updated', handleSettingsUpdated);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('focus', handleSettingsUpdated);
            clearInterval(pollInterval);
        };
    }, [fetchSettings]);

    // Dynamically update document title with real-time platform name
    useEffect(() => {
        if (platformSettings.platformName) {
            const currentTitle = document.title;
            const suffix = currentTitle.includes('-') ? currentTitle.split('-').slice(1).join('-') : 'Build. Compete. Innovate.';
            document.title = `${platformSettings.platformName} -${suffix}`;
        }
    }, [platformSettings.platformName]);

    // Real-time Date Formatter based on admin configured dateFormat
    const formatDate = useCallback((dateInput) => {
        if (!dateInput) return '';
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);

        const format = platformSettings.dateFormat || 'MMM DD, YYYY';

        const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const year = d.getFullYear();
        const monthNum = String(d.getMonth() + 1).padStart(2, '0');
        const monthShort = monthsShort[d.getMonth()];
        const day = String(d.getDate()).padStart(2, '0');

        switch (format) {
            case 'DD/MM/YYYY':
                return `${day}/${monthNum}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${monthNum}-${day}`;
            case 'MMM DD, YYYY':
            default:
                return `${monthShort} ${day}, ${year}`;
        }
    }, [platformSettings.dateFormat]);

    return (
        <PlatformSettingsContext.Provider value={{
            platformSettings,
            isLoading,
            formatDate,
            refreshPlatformSettings: fetchSettings,
            platformName: platformSettings.platformName,
            supportEmail: platformSettings.supportEmail,
            supportPhone: platformSettings.supportPhone,
            website: platformSettings.website,
            timezone: platformSettings.timezone,
            country: platformSettings.country,
            dateFormat: platformSettings.dateFormat,
            isMaintenanceMode: platformSettings.maintenanceMode,
            isPublicRegistrationAllowed: platformSettings.publicRegistrations
        }}>
            {children}
        </PlatformSettingsContext.Provider>
    );
};

export const usePlatformSettings = () => {
    const context = useContext(PlatformSettingsContext);
    if (!context) {
        return {
            platformSettings: defaultPlatformSettings,
            isLoading: false,
            formatDate: (d) => String(d || ''),
            refreshPlatformSettings: () => {},
            platformName: defaultPlatformSettings.platformName,
            supportEmail: defaultPlatformSettings.supportEmail,
            supportPhone: defaultPlatformSettings.supportPhone,
            website: defaultPlatformSettings.website,
            timezone: defaultPlatformSettings.timezone,
            country: defaultPlatformSettings.country,
            dateFormat: defaultPlatformSettings.dateFormat,
            isMaintenanceMode: defaultPlatformSettings.maintenanceMode,
            isPublicRegistrationAllowed: defaultPlatformSettings.publicRegistrations
        };
    }
    return context;
};
