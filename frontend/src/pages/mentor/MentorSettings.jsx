import React, { useState, useEffect } from 'react';
import { fetchMentorProfile, updateMentorProfile } from '../../services/mentor/profileApi';

const MentorSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
                alert('Profile Model Synced successfully!');
            }
        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to synchronize with profileModel.py");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-3 flex-none">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                        Protocol Settings
                    </h1>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Configure your professional identity and mentorship availability.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all transform hover:-translate-y-0.5 disabled:opacity-50 ${
                            saving 
                                ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm shadow-blue-500/10'
                        }`}
                    >
                        {saving ? 'Syncing...' : 'Sync Changes'}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-4 space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    {/* Identity and Operational Status */}
                    <div className="lg:col-span-7 space-y-3">
                        <div className="glass-strong border border-white/10 rounded-lg overflow-hidden shadow-md bg-navy-950/20">
                            <div className="p-2 sm:p-3 border-b border-white/5 bg-white/[0.02]">
                                <h2 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5">
                                    <span className="w-1 h-3 bg-blue-500 rounded-full shadow-[0_0_6px_rgba(168,85,247,0.5)]"></span>
                                    Core Identity
                                </h2>
                            </div>
                            <div className="p-2 sm:p-3 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-gray-400 uppercase tracking-wider ml-1">Legal Name</label>
                                    <input
                                        type="text"
                                        value={profileData.name}
                                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                        className="w-full bg-navy-900/50 border border-white/10 rounded-md py-1 px-2.5 text-[10px] text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-gray-400 uppercase tracking-wider ml-1">Company / Institution</label>
                                    <input
                                        type="text"
                                        value={profileData.institution}
                                        onChange={(e) => setProfileData({ ...profileData, institution: e.target.value })}
                                        className="w-full bg-navy-900/50 border border-white/10 rounded-md py-1 px-2.5 text-[10px] text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-gray-400 uppercase tracking-wider ml-1">Experience (Years)</label>
                                    <input
                                        type="number"
                                        value={profileData.experienceYears}
                                        onChange={(e) => setProfileData({ ...profileData, experienceYears: e.target.value })}
                                        className="w-full bg-navy-900/50 border border-white/10 rounded-md py-1 px-2.5 text-[10px] text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-gray-400 uppercase tracking-wider ml-1">Current Status</label>
                                    <select
                                        value={profileData.availability}
                                        onChange={(e) => setProfileData({ ...profileData, availability: e.target.value })}
                                        className="w-full bg-navy-900/50 border border-white/10 rounded-md py-1 px-2.5 text-[10px] text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
                                    >
                                        <option value="Available">Available</option>
                                        <option value="Busy">Busy</option>
                                        <option value="Offline">Offline</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="glass-strong border border-white/10 rounded-lg p-2 sm:p-3 space-y-2 shadow-md bg-navy-950/20">
                            <h2 className="text-xs sm:text-sm font-semibold text-white">Expertise & Summary</h2>
                            <div className="space-y-2">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-gray-400 uppercase tracking-wider ml-1">Expertise Domains (Comma Separated)</label>
                                    <input
                                        type="text"
                                        value={profileData.expertise}
                                        onChange={(e) => setProfileData({ ...profileData, expertise: e.target.value })}
                                        placeholder="e.g. Deep Learning, Architecture, Product Design"
                                        className="w-full bg-navy-900/50 border border-white/10 rounded-md py-1 px-2.5 text-[10px] text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-gray-400 uppercase tracking-wider ml-1">Professional Bio</label>
                                    <textarea
                                        value={profileData.bio}
                                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                        className="w-full h-12 bg-navy-900/50 border border-white/10 rounded-md py-1 px-2.5 text-[10px] text-white focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Digital Channels */}
                    <div className="lg:col-span-5 space-y-3">
                        <div className="glass-strong border border-white/10 rounded-lg p-2 sm:p-3 space-y-2 shadow-md bg-navy-950/20">
                            <div>
                                <h2 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5 mb-0.5">
                                    <span className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]"></span>
                                    Comm-Channels
                                </h2>
                                <p className="text-[9px] text-gray-400">Digital presence synchronization</p>
                            </div>

                            <div className="space-y-2">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-gray-400 uppercase tracking-wider ml-1">LinkedIn URL</label>
                                    <input
                                        type="text"
                                        value={profileData.links.linkedin}
                                        onChange={(e) => setProfileData({ ...profileData, links: { ...profileData.links, linkedin: e.target.value } })}
                                        placeholder="linkedin.com/in/username"
                                        className="w-full bg-navy-900/50 border border-white/10 rounded-md py-1 px-2.5 text-[10px] text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-gray-400 uppercase tracking-wider ml-1">GitHub Profile</label>
                                    <input
                                        type="text"
                                        value={profileData.links.github}
                                        onChange={(e) => setProfileData({ ...profileData, links: { ...profileData.links, github: e.target.value } })}
                                        placeholder="github.com/username"
                                        className="w-full bg-navy-900/50 border border-white/10 rounded-md py-1 px-2.5 text-[10px] text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-gray-400 uppercase tracking-wider ml-1">Contact Number</label>
                                    <input
                                        type="text"
                                        value={profileData.phoneNumber}
                                        onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                                        className="w-full bg-navy-900/50 border border-white/10 rounded-md py-1 px-2.5 text-[10px] text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MentorSettings;
