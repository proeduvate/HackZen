import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/api';

const EditAdminProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileData, setProfileData] = useState({
        name: '',
        institution: '',
        bio: '',
        contactEmail: '',
        role: 'admin'
    });

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const { data } = await apiClient.get('/profile/me');
                setProfileData({
                    ...data,
                    name: data.name || '',
                    institution: data.institution || 'System Operations',
                    bio: data.bio || '',
                    contactEmail: data.email || ''
                });
            } catch (err) {
                console.error("Failed to load admin profile:", err);
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiClient.put('/profile/me', profileData);

            // Sync all storage layers with fresh data
            const userUpdate = {
                name: profileData.name,
                role: 'admin'
            };
            
            // Merge with existing to preserve email
            const existingUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            const mergedUser = { ...existingUser, ...userUpdate };
            
            localStorage.setItem('user', JSON.stringify(mergedUser));
            sessionStorage.setItem('user', JSON.stringify(mergedUser));

            window.dispatchEvent(new Event('user-update'));
            navigate('/admin/profile');

        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to synchronize administrative intelligence.");
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
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
                        System Authority Profile
                    </h1>
                    <p className="text-slate-600 dark:text-gray-400 font-medium italic">Define your administrative presence and operational credentials.</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2.5 bg-white dark:bg-navy-950/50 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-white/5 shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-8 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {saving ? 'Syncing...' : 'Save Changes'}
                    </button>
                </div>

            </div>

            {/* Form Sections */}
            <div className="bg-white dark:bg-navy-900/40 border border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-md">
                <div className="p-8 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                        Admin Identity
                    </h2>
                </div>

                <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-gray-400 ml-1">Full Name</label>

                        <input
                            type="text"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white px-5 py-4 rounded-2xl focus:border-blue-600 outline-none transition-all font-medium italic shadow-sm"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 dark:text-gray-400 ml-1">Assigned Department</label>

                        <input
                            type="text"
                            value={profileData.institution}
                            onChange={(e) => setProfileData({ ...profileData, institution: e.target.value })}
                            className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white px-5 py-4 rounded-2xl focus:border-blue-600 outline-none transition-all font-medium italic shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-navy-900/40 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-md">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-6">Operational Summary</h2>

                <div className="space-y-3">
                    <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        rows="5"
                        className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white p-6 rounded-[2rem] focus:border-blue-600 outline-none transition-all resize-none font-medium italic shadow-sm"
                    />
                </div>
            </div>
        </div>
    );
};

export default EditAdminProfile;
