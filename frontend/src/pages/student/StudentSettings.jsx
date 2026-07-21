import React, { useEffect, useState } from 'react';
import { fetchStudentSettings, updateStudentSettings, deactivateStudentAccount } from '../../services/student/studentSettingsApi';

const StudentSettings = () => {
    const [settings, setSettings] = useState({
        profileMode: 'Public',
        emailNotifications: true,
        pushNotifications: false,
        theme: 'Blue Dark',
        accessibilityMode: false,
        contentLanguage: 'English (US)',
        twoFactorEnabled: true,
        dataSharing: true
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await fetchStudentSettings();
                setSettings(data);
            } catch (error) {
                console.error('Failed to load settings:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    const toggleSetting = async (key) => {
        const newValue = !settings[key];
        setSettings((prev) => ({ ...prev, [key]: newValue }));

        try {
            await updateStudentSettings({ [key]: newValue });
        } catch (error) {
            console.error(`Failed to update ${key}:`, error);
            setSettings((prev) => ({ ...prev, [key]: !newValue }));
        }
    };

    const handleProfileModeChange = async (e) => {
        const newValue = e.target.value;
        setSettings((prev) => ({ ...prev, profileMode: newValue }));
        try {
            await updateStudentSettings({ profileMode: newValue });
        } catch (error) {
            console.error('Failed to update profile mode:', error);
        }
    };

    const handleDeactivate = async () => {
        if (window.confirm('Are you absolutely sure you want to deactivate your account? This action cannot be undone.')) {
            try {
                const response = await deactivateStudentAccount();
                alert(response.message);
            } catch (error) {
                console.error('Deactivation failed:', error);
            }
        }
    };

    if (isLoading) {
        return <div className="glass rounded-2xl border border-white/5 h-[60vh] animate-pulse bg-navy-900/40" />;
    }

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-500 max-w-5xl mx-auto w-full">
            <div className="mb-4 flex-none">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    Account <span className="gradient-text">Settings</span>
                </h1>
                <p className="text-[10px] text-gray-400">Manage your privacy, notifications, and student workspace preferences in the same clean dashboard style.</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="glass rounded-xl border border-white/5 p-3 sm:p-4 shadow-sm">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Profile Mode</p>
                        <p className="text-sm font-bold text-white">{settings.profileMode}</p>
                    </div>
                    <div className="glass rounded-xl border border-white/5 p-3 sm:p-4 shadow-sm">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Theme</p>
                        <p className="text-sm font-bold text-white">{settings.theme}</p>
                    </div>
                    <div className="glass rounded-xl border border-white/5 p-3 sm:p-4 shadow-sm">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Language</p>
                        <p className="text-sm font-bold text-white">{settings.contentLanguage}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    <div className="glass rounded-xl border border-white/5 p-4 sm:p-5 space-y-3 shadow-md">
                        <div>
                            <h2 className="text-base font-bold text-white mb-1">Privacy & Account</h2>
                            <p className="text-[10px] text-gray-400">Control visibility, language, and data-sharing preferences.</p>
                        </div>

                        <div className="space-y-2">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Profile Visibility</label>
                                <select
                                    value={settings.profileMode}
                                    onChange={handleProfileModeChange}
                                    className="w-full bg-navy-900/50 border border-white/10 text-white px-3 py-1.5 text-[10px] rounded-lg focus:outline-none focus:border-blue-500/50 shadow-inner"
                                >
                                    <option>Public</option>
                                    <option>Private</option>
                                    <option>Connections Only</option>
                                </select>
                            </div>

                            <button
                                onClick={() => toggleSetting('dataSharing')}
                                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${settings.dataSharing ? 'bg-blue-500/10 border-blue-500/30 shadow-sm' : 'bg-white/5 border-white/10'}`}
                            >
                                <div className="text-left">
                                    <h3 className="font-bold text-[10px] text-white">Data Sharing</h3>
                                    <p className="text-[9px] text-gray-400 mt-0.5">Allow product insights to improve recommendations.</p>
                                </div>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${settings.dataSharing ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${settings.dataSharing ? 'left-4' : 'left-0.5'}`} />
                                </div>
                            </button>

                            <button
                                onClick={() => toggleSetting('twoFactorEnabled')}
                                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${settings.twoFactorEnabled ? 'bg-blue-500/10 border-blue-500/30 shadow-sm' : 'bg-white/5 border-white/10'}`}
                            >
                                <div className="text-left">
                                    <h3 className="font-bold text-[10px] text-white">Two-Factor Authentication</h3>
                                    <p className="text-[9px] text-gray-400 mt-0.5">Add another layer of security to your student account.</p>
                                </div>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${settings.twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${settings.twoFactorEnabled ? 'left-4' : 'left-0.5'}`} />
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="glass rounded-xl border border-white/5 p-4 sm:p-5 space-y-3 shadow-md">
                        <div>
                            <h2 className="text-base font-bold text-white mb-1">Notifications</h2>
                            <p className="text-[10px] text-gray-400">Choose how the platform keeps you updated.</p>
                        </div>

                        <div className="space-y-2">
                            {[
                                {
                                    key: 'emailNotifications',
                                    title: 'Email Notifications',
                                    description: 'Receive hackathon updates and team requests by email.'
                                },
                                {
                                    key: 'pushNotifications',
                                    title: 'Browser Push Notifications',
                                    description: 'Get real-time alerts for submissions, invites, and reminders.'
                                },
                                {
                                    key: 'accessibilityMode',
                                    title: 'Accessibility Mode',
                                    description: 'Enable easier-to-read preferences and reduced visual complexity.'
                                }
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => toggleSetting(item.key)}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${settings[item.key] ? 'bg-blue-500/10 border-blue-500/30 shadow-sm' : 'bg-white/5 border-white/10'}`}
                                >
                                    <div className="text-left">
                                        <h3 className="font-bold text-[10px] text-white">{item.title}</h3>
                                        <p className="text-[9px] text-gray-400 mt-0.5">{item.description}</p>
                                    </div>
                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${settings[item.key] ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${settings[item.key] ? 'left-4' : 'left-0.5'}`} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="glass rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:p-5 space-y-3 shadow-md">
                    <h2 className="text-base font-bold text-red-400">Danger Zone</h2>
                    <p className="text-[10px] text-gray-300">Deactivate your account if you no longer want access to your student profile, teams, and certificates.</p>
                    <div className="flex justify-start">
                        <button
                            onClick={handleDeactivate}
                            className="px-4 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-[10px] font-bold transition-all shadow-sm"
                        >
                            Deactivate Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentSettings;
