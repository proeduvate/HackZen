import React, { useState, useEffect } from 'react';
import { getPlatformSettings, updatePlatformSettings, getAdmins, removeAdmin } from '../../services/admin/adminSettingsApi';

const AdminSettings = () => {
    const [platformSettings, setPlatformSettings] = useState({
        platformName: '',
        supportEmail: '',
        publicRegistrations: false,
        maintenanceMode: false
    });
    const [admins, setAdmins] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [settings, adminsData] = await Promise.all([
                    getPlatformSettings(),
                    getAdmins()
                ]);
                setPlatformSettings(settings);
                setAdmins(adminsData);
            } catch (error) {
                console.error("Failed to load settings:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const handlePlatformChange = (e) => {
        const { name, value } = e.target;
        setPlatformSettings(prev => ({ ...prev, [name]: value }));
    };

    const toggleSetting = (setting) => {
        setPlatformSettings(prev => ({ ...prev, [setting]: !prev[setting] }));
    };

    const handleSaveChanges = async () => {
        setSaving(true);
        try {
            await updatePlatformSettings(platformSettings);
            alert("Settings saved successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAdmin = async (id) => {
        if (!window.confirm("Remove this admin component access?")) return;
        setRemoving(id);
        try {
            const data = await removeAdmin(id);
            setAdmins(data.admins);
        } catch (error) {
            console.error(error);
        } finally {
            setRemoving(null);
        }
    };

    if (isLoading) {
        return <div className="max-w-6xl mx-auto space-y-10 p-10 text-center text-gray-500 animate-pulse">Loading core settings matrix...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        Platform Settings
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg">Manage your platform configuration and administrative access.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all border border-white/10">
                        Discard
                    </button>
                    <button 
                        onClick={handleSaveChanges}
                        disabled={saving}
                        className="disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2">
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                        )}
                        {saving ? 'Saving Config...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* General Customization Card */}
            <div className="glass-strong border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        General Customization
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Basic platform information and global controls</p>
                </div>

                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Left Side - Inputs */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Platform Name</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        name="platformName"
                                        value={platformSettings.platformName}
                                        onChange={handlePlatformChange}
                                        className="w-full bg-navy-900/50 border border-white/10 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none"
                                        placeholder="Enter platform name"
                                    />
                                    <div className="absolute inset-y-0 right-3 flex items-center text-gray-500 group-hover:text-blue-400 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Support Contact Email</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        name="supportEmail"
                                        value={platformSettings.supportEmail}
                                        onChange={handlePlatformChange}
                                        className="w-full bg-navy-900/50 border border-white/10 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none"
                                        placeholder="support@example.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Side - Logo & Toggles */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/5">
                                <div className="w-24 h-24 bg-navy-900 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center gap-2 group cursor-pointer hover:border-blue-500/50 transition-all">
                                    <svg className="w-6 h-6 text-gray-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-[10px] text-gray-500 uppercase font-bold group-hover:text-white transition-colors">Upload</span>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-white">Platform Logo</h3>
                                    <p className="text-xs text-gray-400 max-w-[200px]">Recommended: 512x512px SVG or transparent PNG.</p>
                                    <button className="text-xs text-blue-400 font-bold mt-2 hover:text-blue-300 transition-colors">Change Image</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => toggleSetting('publicRegistrations')}
                                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${platformSettings.publicRegistrations ? 'bg-blue-600/10 border-blue-500/30' : 'bg-white/5 border-white/10'}`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${platformSettings.publicRegistrations ? 'text-blue-400' : 'text-gray-500'}`}>Public Reg</span>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${platformSettings.publicRegistrations ? 'bg-blue-500' : 'bg-gray-600'}`}>
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${platformSettings.publicRegistrations ? 'left-6' : 'left-1'}`} />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center">Allow new users to join without invite</p>
                                </button>

                                <button
                                    onClick={() => toggleSetting('maintenanceMode')}
                                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${platformSettings.maintenanceMode ? 'bg-amber-600/10 border-amber-500/30' : 'bg-white/5 border-white/10'}`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${platformSettings.maintenanceMode ? 'text-amber-400' : 'text-gray-500'}`}>Maintenance</span>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${platformSettings.maintenanceMode ? 'bg-amber-500' : 'bg-gray-600'}`}>
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${platformSettings.maintenanceMode ? 'left-6' : 'left-1'}`} />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center">Restrict access to admins only</p>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin Permissions Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Admin Permissions
                        </h2>
                        <p className="text-gray-400 mt-1">Control who has access to this dashboard</p>
                    </div>
                    <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Add Admin
                    </button>
                </div>

                <div className="glass-strong border border-white/10 rounded-3xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                    <th className="px-8 py-5 text-sm font-bold text-gray-300 uppercase tracking-wider">User</th>
                                    <th className="px-8 py-5 text-sm font-bold text-gray-300 uppercase tracking-wider">Email Address</th>
                                    <th className="px-8 py-5 text-sm font-bold text-gray-300 uppercase tracking-wider text-center">Role</th>
                                    <th className="px-8 py-5 text-sm font-bold text-gray-300 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {admins.map((admin) => (
                                    <tr key={admin.id} className="group hover:bg-white/5 transition-colors cursor-default">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20 ring-2 ring-white/10 group-hover:ring-blue-500/50 transition-all">
                                                    {admin.avatar}
                                                </div>
                                                <span className="font-semibold text-white group-hover:text-blue-400 transition-colors uppercase tracking-wide">{admin.user}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-gray-400 text-sm font-medium">{admin.email}</span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${admin.role === 'Super Admin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                                    admin.role === 'Moderator' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                                        'bg-gray-500/10 text-gray-400 border-gray-500/30'
                                                }`}>
                                                {admin.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button title="Edit User" className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteAdmin(admin.id)}
                                                    disabled={removing === admin.id}
                                                    title="Delete User" 
                                                    className="disabled:opacity-50 p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-all">
                                                    {removing === admin.id ? '...' : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    )}
                                                </button>
                                                <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
