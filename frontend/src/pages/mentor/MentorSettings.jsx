import React, { useState, useEffect } from 'react';
import { fetchMentorProfile, updateMentorProfile } from '../../services/mentor/profileApi';

const MentorSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [profileData, setProfileData] = useState({
        name: '',
        institution: '',
        expertise: '',
        experienceYears: 0,
        bio: '',
        availability: 'Available',
        phoneNumber: '',
        links: {
            linkedin: '',
            github: '',
            scholar: ''
        }
    });

    const showToast = (text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await fetchMentorProfile();
                setProfileData({
                    ...data,
                    expertise: Array.isArray(data.expertise) ? data.expertise.join(', ') : (data.expertise || '')
                });
            } catch (err) {
                console.error("Failed to load mentor profile:", err);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updatedPayload = {
                ...profileData,
                expertiseDomains: profileData.expertise?.split(',').map(s => s.trim()).filter(s => s) || [],
                experienceYears: parseInt(profileData.experienceYears || 0),
                companyName: profileData.institution,
                linkedinUrl: profileData.links.linkedin
            };

            const result = await updateMentorProfile(updatedPayload);
            if (result.success) {
                const currentUser = JSON.parse(sessionStorage.getItem('user') || '{}');
                sessionStorage.setItem('user', JSON.stringify({
                    ...currentUser,
                    name: profileData.name
                }));
                window.dispatchEvent(new Event('user-update'));
                showToast('Mentor profile saved successfully!', 'success');
            }
        } catch (err) {
            console.error("Save failed:", err);
            showToast('Failed to save profile changes. Please try again.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-5 duration-700 relative">
            {/* Toast alert */}
            {toast && (
                <div className={`fixed bottom-8 right-8 z-[999] px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300 ${
                    toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 backdrop-blur-md' : 'bg-red-500/20 text-red-300 border-red-500/40 backdrop-blur-md'
                }`}>
                    <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
                    <span>{toast.text}</span>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
                        Protocol Settings
                    </h1>
                    <p className="text-gray-400 mt-2">Configure your professional identity and mentorship availability.</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-8 py-2.5 rounded-xl font-semibold transition-all transform hover:-translate-y-0.5 disabled:opacity-50 ${
                            saving 
                                ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                        }`}
                    >
                        {saving ? 'Syncing...' : 'Sync Changes'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Identity and Operational Status */}
                <div className="lg:col-span-7 space-y-8">
                    <div className="glass-strong border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl bg-navy-950/20">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-3">
                                <span className="w-1 h-6 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span>
                                Core Identity
                            </h2>
                        </div>
                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400">Legal Name</label>
                                <input
                                    type="text"
                                    value={profileData.name}
                                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                    className="w-full bg-navy-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400">Company / Institution</label>
                                <input
                                    type="text"
                                    value={profileData.institution}
                                    onChange={(e) => setProfileData({ ...profileData, institution: e.target.value })}
                                    className="w-full bg-navy-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400">Experience (Years)</label>
                                <input
                                    type="number"
                                    value={profileData.experienceYears}
                                    onChange={(e) => setProfileData({ ...profileData, experienceYears: e.target.value })}
                                    className="w-full bg-navy-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400">Current Status</label>
                                <select
                                    value={profileData.availability}
                                    onChange={(e) => setProfileData({ ...profileData, availability: e.target.value })}
                                    className="w-full bg-navy-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="Available">Available</option>
                                    <option value="Busy">Busy</option>
                                    <option value="Offline">Offline</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="glass-strong border border-white/10 rounded-[2.5rem] p-10 space-y-8 shadow-2xl bg-navy-950/20">
                        <h2 className="text-lg font-semibold text-white">Expertise & Summary</h2>
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400">Expertise Domains (Comma Separated)</label>
                                <input
                                    type="text"
                                    value={profileData.expertise}
                                    onChange={(e) => setProfileData({ ...profileData, expertise: e.target.value })}
                                    placeholder="e.g. Deep Learning, Architecture, Product Design"
                                    className="w-full bg-navy-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400">Professional Bio</label>
                                <textarea
                                    value={profileData.bio}
                                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                    rows="5"
                                    className="w-full bg-navy-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Digital Channels */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="glass-strong border border-white/10 rounded-[2.5rem] p-10 space-y-8 shadow-2xl bg-navy-950/20">
                        <div>
                            <h2 className="text-lg font-semibold text-white flex items-center gap-3 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                                Comm-Channels
                            </h2>
                            <p className="text-sm text-gray-400">Digital presence synchronization</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400">LinkedIn URL</label>
                                <input
                                    type="text"
                                    value={profileData.links.linkedin}
                                    onChange={(e) => setProfileData({ ...profileData, links: { ...profileData.links, linkedin: e.target.value } })}
                                    placeholder="linkedin.com/in/username"
                                    className="w-full bg-navy-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400">GitHub Profile</label>
                                <input
                                    type="text"
                                    value={profileData.links.github}
                                    onChange={(e) => setProfileData({ ...profileData, links: { ...profileData.links, github: e.target.value } })}
                                    placeholder="github.com/username"
                                    className="w-full bg-navy-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400">Contact Number</label>
                                <input
                                    type="text"
                                    value={profileData.phoneNumber}
                                    onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                                    className="w-full bg-navy-900/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MentorSettings;
