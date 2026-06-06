import React, { useState, useEffect, useMemo } from 'react';
import { fetchOrganizerSettings, updateOrganizerSettings } from '../../services/organizer/organizerSettingsApi';

const OrganizerSettings = () => {
    // --- State Management ---
    const [orgSettings, setOrgSettings] = useState({
        orgName: '',
        emailReports: 'weekly',
        autoApproveMentors: false
    });

    const [initialSettings, setInitialSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    // --- Data Initialization ---
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await fetchOrganizerSettings();
                setOrgSettings(data);
                setInitialSettings(data);
            } catch (error) {
                console.error("Failed to load organizer settings:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, []);

    // --- Dirty State Detection ---
    const isDirty = useMemo(() => {
        if (!initialSettings) return false;
        return (
            orgSettings.orgName !== initialSettings.orgName ||
            orgSettings.emailReports !== initialSettings.emailReports ||
            orgSettings.autoApproveMentors !== initialSettings.autoApproveMentors
        );
    }, [orgSettings, initialSettings]);

    const isValid = orgSettings.orgName.trim().length > 0;

    const handleSave = async () => {
        if (!isValid || !isDirty || isSaving) return;
        setIsSaving(true);
        setSaveStatus(null);

        try {
            const response = await updateOrganizerSettings(orgSettings);
            setInitialSettings(response.data);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (error) {
            console.error("Failed to save settings:", error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        System Configuration
                    </h1>
                    <p className="text-sm text-gray-400">Define your operational protocols and organizational identity.</p>
                </div>

                <div className="flex items-center gap-4">
                    {saveStatus === 'success' && <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest animate-pulse">✓ Matrix Updated</span>}
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || !isValid || isSaving}
                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                            !isDirty || !isValid || isSaving
                                ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 hover:scale-105'
                        }`}
                    >
                        {isSaving ? 'Synchronizing...' : 'Update Matrix'}
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Organization Section */}
                <div className="lg:col-span-7 space-y-8">
                    <div className="glass-strong border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl bg-navy-950/20">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-3">
                                <span className="w-1 h-6 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]"></span>
                                Organizational Identity
                            </h2>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400">Official Name</label>
                                <input
                                    type="text"
                                    value={orgSettings.orgName}
                                    placeholder="e.g. Global Tech Innovations"
                                    onChange={(e) => setOrgSettings({ ...orgSettings, orgName: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400">Analytical Report Frequency</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['daily', 'weekly', 'monthly'].map(freq => (
                                        <button
                                            key={freq}
                                            onClick={() => setOrgSettings({ ...orgSettings, emailReports: freq })}
                                            className={`py-2 rounded-lg text-sm font-semibold border transition-all ${
                                                orgSettings.emailReports === freq 
                                                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-lg shadow-cyan-900/20' 
                                                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="glass-strong border border-white/10 rounded-[2.5rem] p-10 space-y-8 shadow-2xl bg-navy-950/20">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-3 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                Protocol Automations
                            </h2>
                            <p className="text-sm text-gray-400 ml-4.5">Automated event logistics</p>
                        </div>

                        <div className="space-y-6">
                            <div 
                                className="group p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between"
                                onClick={() => setOrgSettings({ ...orgSettings, autoApproveMentors: !orgSettings.autoApproveMentors })}
                            >
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-white text-sm">Auto-approve Mentors</h3>
                                    <p className="text-xs text-gray-400">High-tier criteria validation</p>
                                </div>
                                <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${
                                    orgSettings.autoApproveMentors ? 'bg-cyan-600 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : 'bg-gray-800'
                                }`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                                        orgSettings.autoApproveMentors ? 'left-7' : 'left-1'
                                    }`} />
                                </div>
                            </div>

                            <div className="p-6 bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-3xl opacity-50 grayscale cursor-not-allowed">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-white text-sm">Slack Integration</h3>
                                    <p className="text-xs text-gray-400">Locked | Coming in v2.1</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizerSettings;
