import React, { useState, useEffect } from 'react';
import { fetchUsers, updateUserStatus } from '../../services/admin/usersManagementApi';

const UsersManagement = () => {
    const [activeTab, setActiveTab] = useState('All Users');
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        const loadUsers = async () => {
            setIsLoading(true);
            try {
                const data = await fetchUsers();
                setUsers(data);
            } catch (error) {
                console.error("Failed to load users:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadUsers();
    }, []);

    const toggleStatus = async (userId, currentStatus) => {
        setActionLoading(userId);
        try {
            const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
            const response = await updateUserStatus(userId, newStatus);
            if (response.success) {
                setUsers(response.updatedData);
            }
        } catch (error) {
            console.error("Failed to update status:", error);
        } finally {
            setActionLoading(null);
        }
    };

    const tabs = ['All Users', 'Students', 'Mentors', 'Organizers', 'Suspended'];

    const getRoleBadge = (role) => {
        switch (role) {
            case 'Student': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'Organizer': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'Mentor': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Users Management</h1>
                <p className="text-gray-400">View, search, and manage all platform participants and permissions.</p>
            </div>

            {/* Tab Filters */}
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 flex-1">
                    <div className="relative group flex-1 max-w-sm">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <input
                            type="text"
                            placeholder="Filter by name or email..."
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                        <option value="">Role</option>
                        <option value="student">Student</option>
                        <option value="mentor">Mentor</option>
                        <option value="organizer">Organizer</option>
                    </select>

                    <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                        <option value="">Joined Date</option>
                        <option value="recent">Recently Joined</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                </div>

                <button className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl border border-white/10 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Export CSV
                </button>
            </div>

            {/* Users Table Card */}
            <div className="glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.03]">
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">User</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Role</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Joined Date</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 text-sm">Loading user registry...</td>
                                </tr>
                            ) : users.map((user) => (
                                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                                    {/* User Identity */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar} alt="" className="w-10 h-10 rounded-full border border-white/10 shadow-lg group-hover:scale-110 transition-transform" />
                                            <div>
                                                <p className="text-sm font-bold text-white uppercase tracking-tight">{user.name}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Role Pill */}
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getRoleBadge(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>

                                    {/* Status Indicator */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-500'}`}></div>
                                            <span className={`text-xs font-semibold ${user.status === 'Active' ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                {user.status}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Joined Date */}
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-400 font-medium">{user.joinedDate}</p>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => toggleStatus(user.id, user.status)}
                                            disabled={actionLoading === user.id}
                                            className={`disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${user.status === 'Active'
                                                ? 'text-red-400 border-red-500/20 hover:bg-red-500/10'
                                                : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                                            }`}>
                                            {actionLoading === user.id ? 'Updating...' : (user.status === 'Active' ? 'Suspend' : 'Reactivate')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-6 border-t border-white/10 bg-white/[0.01] flex items-center justify-between">
                    <p className="text-xs text-gray-500 font-medium tracking-wide">Showing 1 to 5 of 248 users</p>
                    <div className="flex gap-2">
                        <button className="w-9 h-9 rounded-xl flex items-center justify-center glass border-white/10 text-gray-400 disabled:opacity-30" disabled>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <button className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25">1</button>
                        <button className="w-9 h-9 rounded-xl flex items-center justify-center glass border-white/10 text-gray-400 text-xs hover:border-white/20 transition-all">2</button>
                        <button className="w-9 h-9 rounded-xl flex items-center justify-center glass border-white/10 text-gray-400 hover:border-white/20 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsersManagement;
