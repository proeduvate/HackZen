import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMentorProfile, updateMentorProfile } from '../../services/mentor/profileApi';

const EditMentorProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileData, setProfileData] = useState({
        name: '',
        companyName: '',
        expertise: '',
        experienceYears: 0,
        bio: '',
        availability: 'Available',
        phoneNumber: '',
        linkedinUrl: ''
    });

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await fetchMentorProfile();
                setProfileData({
                    ...data,
                    companyName: data.companyName || '',
                    expertise: Array.isArray(data.expertiseDomains) ? data.expertiseDomains.join(', ') : (data.expertise || ''),
                    experienceYears: data.experienceYears || 0,
                    phoneNumber: data.phoneNumber || '',
                    linkedinUrl: data.linkedinUrl || ''
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
        console.log("=== SAVE BUTTON CLICKED ===");
        setSaving(true);
        try {
            console.log("Step 1: Building payload...");
            // Synchronize with MentorInDB schema
            const updatedPayload = {
                ...profileData,
                expertiseDomains: profileData.expertise?.split(',').map(s => s.trim()).filter(s => s) || [],
                experienceYears: parseInt(profileData.experienceYears || 0),
                companyName: profileData.companyName,
                linkedinUrl: profileData.linkedinUrl,
                phoneNumber: profileData.phoneNumber,
                bio: profileData.bio,
                availability: profileData.availability
            };
            console.log("Payload:", updatedPayload);

            console.log("Step 2: Calling updateMentorProfile...");
            // Update profile on backend
            await updateMentorProfile(updatedPayload);
            console.log("Step 2: updateMentorProfile completed");

            console.log("Step 3: Fetching fresh profile data from backend...");
            // Refetch fresh profile data from backend to ensure consistency
            const freshData = await fetchMentorProfile();
            console.log("Step 3: Fresh data fetched:", freshData);
            
            console.log("Step 4: Syncing storage layers...");
            // Sync all storage layers with fresh data
            const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
            const mergedUser = { 
                ...existingUser, 
                name: freshData.name || existingUser.name,
                role: 'mentor',
                mentor_profile: {
                    ...freshData,
                    expertiseDomains: freshData.expertiseDomains || [],
                    companyName: freshData.companyName || '',
                    linkedinUrl: freshData.linkedinUrl || '',
                    phoneNumber: freshData.phoneNumber || '',
                    availability: freshData.availability || 'Available',
                    bio: freshData.bio || ''
                }
            };
            
            localStorage.setItem('user', JSON.stringify(mergedUser));
            sessionStorage.setItem('user', JSON.stringify(mergedUser));
            console.log("Step 4: Storage sync complete");

            console.log("Step 5: Dispatching user-update event...");
            // Dispatch event to notify all components of profile update
            window.dispatchEvent(new Event('user-update'));
            console.log("Step 5: Event dispatched");
            
            console.log("Step 6: Navigating to profile...");
            // Small delay to allow event listeners to process
            setTimeout(() => navigate('/mentor/profile'), 300);
            console.log("=== SAVE COMPLETED SUCCESSFULLY ===");

        } catch (err) {
            console.log("=== SAVE FAILED ===");
            console.error("Save failed at:", err);
            const errorMsg = err.response?.data?.detail || err.message || 'Unknown error occurred';
            console.error('Full error object:', err);
            alert(`Failed to synchronize: ${errorMsg}`);
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
        <div className="max-w-5xl mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        Expertise Calibration
                    </h1>
                    <p className="text-gray-400 font-medium italic">Shape your professional mentorship identity and availability.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2.5 bg-navy-950/50 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl font-bold text-sm transition-all border border-white/5 hover:border-white/20"
                    >
                        Abort
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {saving ? 'Syncing...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Form Sections */}
            <div className="glass-strong border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                    <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
                        <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                        Professional Profile
                    </h2>
                </div>
                <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">Legal Name</label>
                        <input
                            type="text"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">Company / Institution</label>
                        <input
                            type="text"
                            value={profileData.companyName}
                            onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
                            className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">Experience (Years)</label>
                        <input
                            type="number"
                            value={profileData.experienceYears}
                            onChange={(e) => setProfileData({ ...profileData, experienceYears: e.target.value })}
                            className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">Availability Status</label>
                        <select
                            value={profileData.availability}
                            onChange={(e) => setProfileData({ ...profileData, availability: e.target.value })}
                            className="w-full bg-black/20 border border-white/10 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        >
                            <option value="Available">Available</option>
                            <option value="Busy">Busy</option>
                            <option value="Offline">Offline</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="glass-strong border border-white/5 rounded-[2.5rem] p-10 shadow-2xl space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">LinkedIn Profile URL</label>
                        <input
                            type="text"
                            value={profileData.linkedinUrl}
                            onChange={(e) => setProfileData({ ...profileData, linkedinUrl: e.target.value })}
                            placeholder="linkedin.com/in/username"
                            className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400 ml-1">Contact Number</label>
                        <input
                            type="text"
                            value={profileData.phoneNumber}
                            onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                            className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                        />
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="text-lg font-bold text-white tracking-tight mb-2 block">Expertise Domains</label>
                    <input
                        type="text"
                        value={profileData.expertise}
                        onChange={(e) => setProfileData({ ...profileData, expertise: e.target.value })}
                        placeholder="e.g. AI, Cloud, Cybersecurity"
                        className="w-full bg-black/20 border border-white/5 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all font-medium italic"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-lg font-bold text-white tracking-tight mb-2 block">Executive Summary / Bio</label>
                    <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        rows="5"
                        maxLength="500"
                        className="w-full bg-black/20 border border-white/5 text-white p-6 rounded-[2rem] focus:ring-2 focus:ring-blue-500/30 outline-none transition-all resize-none font-medium italic"
                    />
                </div>
            </div>
        </div>
    );
};

export default EditMentorProfile;
