import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    fetchMyTeams,
    fetchTeamWorkspace,
    fetchTeamsMeta,
    createTeam,
    joinTeamByCode,
    sendMessage,
    updateTaskStatus
} from '../services/student/teamsApi';
import { fetchAssignedTeams } from '../services/mentor/assignedTeamsApi';

/**
 * My Teams Component
 * A role-aware, real-time workspace for project collaboration.
 * Supports: Students, Mentors, Organizers, and Admins.
 */
const MyTeams = () => {
    // --- AUTH & ROLE ---
    const [user, setUser] = useState(() => {
        try {
            const stored = sessionStorage.getItem('user');
            if (!stored) return { name: 'Guest', role: 'student' };
            const parsed = JSON.parse(stored);
            return parsed && typeof parsed === 'object' ? { name: 'Guest', ...parsed } : { name: 'Guest', role: 'student' };
        } catch (e) {
            return { name: 'Guest', role: 'student' };
        }
    });
    const role = (user?.role || 'student').toLowerCase();

    // --- STATE MANAGEMENT ---
    const { teamId: urlTeamId } = useParams();
    const [viewMode, setViewMode] = useState(urlTeamId ? 'workspace' : 'overview'); // 'overview' | 'workspace'
    const [selectedTeamId, setSelectedTeamId] = useState(urlTeamId || null);
    const [activeTab, setActiveTab] = useState('Chat');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [messageInput, setMessageInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [modal, setModal] = useState({ type: null, data: null }); // { type: 'create' | 'join' | 'task' | 'delete', data: any }
    const [newTeamData, setNewTeamData] = useState({ name: '', hackathon: '', domain: '' });
    const [inviteCode, setInviteCode] = useState('');
    const [newTaskData, setNewTaskData] = useState({ title: '', priority: 'Medium', assignedTo: '' });

    // --- REFS ---
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const socketRef = useRef(null);

    // --- MOCK DATA ---
    const [teams, setTeams] = useState([]);
    const [messages, setMessages] = useState({});
    const [tasks, setTasks] = useState({});
    const [files, setFiles] = useState({});
    const [alerts, setAlerts] = useState([]);
    const [registeredHackathons, setRegisteredHackathons] = useState([]);

    // --- EFFECTS ---
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                let teamsData;
                let metaData;
                
                if (role === 'mentor') {
                    const mentorData = await fetchAssignedTeams();
                    // Map mentor team fields to match TeamsPage expectations
                    teamsData = [...mentorData.activeTeams, ...mentorData.pastTeams].map(t => ({
                        ...t,
                        gradient: t.logoColor || 'from-blue-600 to-indigo-600',
                        roleInTeam: mentorData.activeTeams.find(at => at.id === t.id) ? 'Mentor' : 'Alumni Mentor',
                        lastMessage: 'Viewing as Mentor', // Default for workspace
                        time: 'Active'
                    }));
                    metaData = { alerts: [], registrations: [] }; // Mentors might not have these student-specific metas
                } else {
                    [teamsData, metaData] = await Promise.all([
                        fetchMyTeams(),
                        fetchTeamsMeta()
                    ]);
                }
                
                setTeams(teamsData);
                setAlerts(metaData.alerts);
                setRegisteredHackathons(metaData.registrations);
            } catch (error) {
                console.error("Failed to load teams data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedTeamId) {
            const loadWorkspace = async () => {
                try {
                    const data = await fetchTeamWorkspace(selectedTeamId);
                    setMessages(prev => ({ ...prev, [selectedTeamId]: data.messages }));
                    setTasks(prev => ({ ...prev, [selectedTeamId]: data.tasks }));
                    setFiles(prev => ({ ...prev, [selectedTeamId]: data.files }));
                } catch (error) {
                    console.error("Failed to load workspace:", error);
                }
            };
            loadWorkspace();
        }
    }, [selectedTeamId]);

    useEffect(() => {
        const userId = user?._id || user?.id;
        if (!selectedTeamId || !userId) return;

        // Establish WebSocket connection for real-time chat
        const wsUrl = `ws://${window.location.hostname}:8000/api/chat/ws/${selectedTeamId}/${userId}`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_message') {
                    const msg = data.message;
                    setMessages(prev => {
                        const teamMsgs = prev[selectedTeamId] || [];
                        // Prevent duplicate messages
                        if (teamMsgs.some(m => m.id === msg._id)) return prev;

                        return {
                            ...prev,
                            [selectedTeamId]: [
                                ...teamMsgs,
                                {
                                    id: msg._id || msg.id,
                                    text: msg.content,
                                    sender: msg.senderId === userId ? 'me' : 'them',
                                    user: msg.senderName || 'Teammate',
                                    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    type: msg.messageType || 'text'
                                }
                            ]
                        };
                    });
                }
            } catch (e) {
                console.error("WebSocket message parsing error:", e);
            }
        };

        ws.onclose = () => {
            console.log("WebSocket connection closed for team:", selectedTeamId);
        };

        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        };
    }, [selectedTeamId, user]);

    // --- RBAC PERMISSIONS ---
    const canManageTeam = ['admin', 'organizer', 'mentor'].includes(role);
    const canEditWorkspace = ['admin', 'student', 'mentor'].includes(role);
    const canDeleteFiles = ['admin', 'organizer'].includes(role);

    // --- EFFECTS ---
    useEffect(() => {
        if (viewMode === 'workspace') {
            scrollToBottom();
        }
    }, [messages, selectedTeamId, activeTab, viewMode]);

    useEffect(() => {
        if (viewMode === 'workspace') {
            scrollToBottom();
        }
    }, [messages, selectedTeamId, activeTab, viewMode]);

    // --- HANDLERS ---
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageInput.trim()) return;

        const messageData = {
            content: messageInput,
            type: 'text'
        };

        try {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                // Send via WebSocket
                socketRef.current.send(JSON.stringify(messageData));
                
                // Add to local state immediately
                setMessages(prev => ({
                    ...prev,
                    [selectedTeamId]: [
                        ...(prev[selectedTeamId] || []),
                        {
                            id: `local-${Date.now()}`,
                            text: messageInput,
                            sender: 'me',
                            user: user.name || 'Me',
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            type: 'text'
                        }
                    ]
                }));
                setMessageInput('');
            } else {
                // Fallback to HTTP API
                const response = await sendMessage(selectedTeamId, { text: messageInput, sender: 'me', user: user.name });
                if (response.success) {
                    setMessages(prev => ({
                        ...prev,
                        [selectedTeamId]: [...(prev[selectedTeamId] || []), response.message]
                    }));
                    setMessageInput('');
                }
            }
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const toggleTask = async (teamId, taskId) => {
        if (!canEditWorkspace) return;
        const teamTasks = tasks[teamId] || [];
        const task = teamTasks.find(t => t.id === taskId);
        if (!task) return;

        const isCompleted = task.status !== 'Done';
        const newStatus = isCompleted ? 'Done' : 'In Progress';

        try {
            await updateTaskStatus(task.progressId, task.title, isCompleted);
            setTasks(prev => {
                const currentTasks = prev[teamId] || [];
                return {
                    ...prev,
                    [teamId]: currentTasks.map(t =>
                        t.id === taskId ? { ...t, status: newStatus } : t
                    )
                };
            });
        } catch (error) {
            console.error("Failed to update task status:", error);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !canEditWorkspace) return;

        const newFile = {
            id: Date.now(),
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
            type: file.name.split('.').pop().toUpperCase(),
            uploader: user.name,
            time: 'Just now'
        };

        setFiles(prev => ({
            ...prev,
            [selectedTeamId]: [newFile, ...(prev[selectedTeamId] || [])]
        }));

        // Log to activity
        setTeams(prev => prev.map(t =>
            t.id === selectedTeamId
                ? { ...t, activity: [{ id: Date.now(), user: user.name, action: 'uploaded', item: file.name, time: 'Just now' }, ...t.activity] }
                : t
        ));
    };

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        try {
            const response = await createTeam(newTeamData);
            if (response.success) {
                setTeams([response.team, ...teams]);
                setMessages(prev => ({ ...prev, [response.team.id]: [] }));
                setTasks(prev => ({ ...prev, [response.team.id]: [] }));
                setFiles(prev => ({ ...prev, [response.team.id]: [] }));
                setModal({ type: null });
                setNewTeamData({ name: '', hackathon: '', domain: '' });
                setAlerts([{ id: Date.now(), type: 'success', message: `Team "${response.team.name}" created successfully!` }, ...alerts]);
            }
        } catch (error) {
            console.error("Failed to create team:", error);
        }
    };

    const handleJoinTeam = async (e) => {
        e.preventDefault();
        try {
            const response = await joinTeamByCode(inviteCode);
            if (response.success) {
                setAlerts([{ id: Date.now(), type: 'success', message: response.message }, ...alerts]);
                setModal({ type: null });
                setInviteCode('');
                // Note: In a real app, we would re-fetch teams here
                const updatedTeams = await fetchMyTeams();
                setTeams(updatedTeams);
            }
        } catch (error) {
            setAlerts([{ id: Date.now(), type: 'error', message: error.message }, ...alerts]);
        }
    };

    const handleAddTask = (e) => {
        e.preventDefault();
        const newTask = {
            id: Date.now(),
            ...newTaskData,
            status: 'Todo'
        };
        setTasks(prev => ({
            ...prev,
            [selectedTeamId]: [...(prev[selectedTeamId] || []), newTask]
        }));

        setTeams(prev => prev.map(t =>
            t.id === selectedTeamId
                ? { ...t, activity: [{ id: Date.now(), user: user.name, action: 'added task', item: newTaskData.title, time: 'Just now' }, ...t.activity] }
                : t
        ));

        setModal({ type: null });
        setNewTaskData({ title: '', priority: 'Medium', assignedTo: '' });
    };

    const handleDeleteTeam = (teamId) => {
        if (!canManageTeam) return;
        setTeams(prev => prev.filter(t => t.id !== teamId));
        setModal({ type: null });
    };

    const handleDeleteFile = (teamId, fileId) => {
        if (!canDeleteFiles) return;
        setFiles(prev => ({
            ...prev,
            [teamId]: prev[teamId].filter(f => f.id !== fileId)
        }));
    };

    // --- DERIVED DATA ---
    const [sortBy, setSortBy] = useState('Recent Activity');

    // --- DERIVED DATA ---
    const filteredTeams = useMemo(() => {
        let result = teams.filter(team => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch =
                team.name.toLowerCase().includes(searchLower) ||
                team.hackathon.toLowerCase().includes(searchLower) ||
                team.lastMessage.toLowerCase().includes(searchLower) ||
                team.activity.some(act => act.item.toLowerCase().includes(searchLower));
            const matchesStatus = statusFilter === 'All' || team.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        if (sortBy === 'Progress') {
            result.sort((a, b) => b.progress - a.progress);
        } else if (sortBy === 'Name') {
            result.sort((a, b) => a.name.localeCompare(b.name));
        }
        // Default (Recently Active) is already mock-ordered or could be based on 'time'
        return result;
    }, [teams, searchQuery, statusFilter, sortBy]);

    // Ensure numeric vs string ID comparison works
    const currentTeam = teams.find(t => String(t.id) === String(selectedTeamId));

    // --- UI COMPONENTS (MINI) ---
    const SkeletonCard = () => (
        <div className="glass rounded-2xl p-4 h-[220px] animate-pulse">
            <div className="flex justify-between mb-4">
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-white/10 rounded-lg"></div>
                    <div className="h-2.5 w-24 bg-white/5 rounded-lg"></div>
                </div>
                <div className="h-5 w-16 bg-white/10 rounded-full"></div>
            </div>
            <div className="space-y-3">
                <div className="h-1.5 w-full bg-white/5 rounded-full"></div>
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-white/10 border-2 border-navy-900"></div>)}
                </div>
                <div className="h-8 w-full bg-white/5 rounded-lg"></div>
            </div>
        </div>
    );

    // --- RENDER VIEWS ---
    const renderOverview = () => (
        <div className="h-full flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {alerts.length > 0 && (
                <div className="space-y-2 flex-none mb-3">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="glass rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 flex items-center justify-between gap-3 shadow-sm">
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300 mb-0.5">Team Alert</p>
                                <p className="text-xs text-orange-100 leading-snug">{alert.message}</p>
                            </div>
                            <button
                                onClick={() => setAlerts((prev) => prev.filter((item) => item.id !== alert.id))}
                                className="text-orange-300 hover:text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mb-4 flex-none">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    My <span className="gradient-text">Teams</span>
                </h1>
                <p className="text-[10px] text-gray-400">Manage active teams and registered hackathon squads in the same card-first layout as your upcoming hackathons page.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 flex-none">
                <div className="glass rounded-xl border border-white/5 p-3 sm:p-4 shadow-sm bg-navy-950/20">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Active Teams</p>
                    <p className="text-lg font-bold text-white">{teams.length.toString().padStart(2, '0')}</p>
                </div>
                <div className="glass rounded-xl border border-white/5 p-3 sm:p-4 shadow-sm bg-navy-950/20">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Average Progress</p>
                    <p className="text-lg font-bold text-blue-400">{teams.length ? Math.round(teams.reduce((sum, team) => sum + team.progress, 0) / teams.length) : 0}%</p>
                </div>
                <div className="glass rounded-xl border border-white/5 p-3 sm:p-4 shadow-sm bg-navy-950/20">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Registered Events</p>
                    <p className="text-lg font-bold text-cyan-400">{registeredHackathons.length.toString().padStart(2, '0')}</p>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-3 items-start xl:items-center xl:justify-between mb-4 flex-none">
                <div className="flex-1 w-full">
                    <input
                        type="text"
                        placeholder="Search team, hackathon, or domain"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-navy-900/50 border border-white/10 text-white px-3 py-2 text-xs rounded-lg focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-gray-550"
                    />
                </div>

                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-navy-900/50 border border-white/10 text-gray-300 px-3 py-2 text-xs rounded-lg focus:outline-none"
                    >
                        {['All', 'In Progress', 'Building', 'Ideating', 'Done'].map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-navy-900/50 border border-white/10 text-gray-300 px-3 py-2 text-xs rounded-lg focus:outline-none"
                    >
                        <option value="Recent Activity">Recent Activity</option>
                        <option value="Progress">Progress</option>
                        <option value="Name">Name</option>
                    </select>
                    {role === 'student' && (
                        <>
                            <button
                                onClick={() => setModal({ type: 'join' })}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg border border-white/10 transition-colors"
                            >
                                Join Team
                            </button>
                            <button
                                onClick={() => setModal({ type: 'create' })}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                                Create Team
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4 space-y-6">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1 content-start">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="glass rounded-xl border border-white/5 h-[220px] animate-pulse bg-navy-900/40" />
                        ))}
                    </div>
                ) : filteredTeams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1 content-start">
                        {filteredTeams.map((team) => (
                            <div
                                key={team.id}
                                onClick={() => { setSelectedTeamId(team.id); setViewMode('workspace'); }}
                                className="glass rounded-xl border border-white/5 hover:border-blue-500/30 transition-all duration-300 group cursor-pointer flex flex-col overflow-hidden shadow-sm"
                            >
                                <div className={`h-24 bg-gradient-to-br ${team.gradient || 'from-blue-600 to-blue-600'} p-3 relative`}>
                                    <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 text-[8px] font-bold text-white uppercase">
                                        {team.status}
                                    </div>
                                    <div className="absolute bottom-2 left-3 right-3">
                                        <p className="text-white/80 text-[8px] font-bold uppercase tracking-widest truncate">{team.hackathon}</p>
                                    </div>
                                </div>

                                <div className="p-3 sm:p-4 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                        <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">{team.name}</h3>
                                        <span className="text-[8px] text-cyan-300 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 whitespace-nowrap">{team.roleInTeam}</span>
                                    </div>
                                    <p className="text-gray-400 text-[10px] line-clamp-2 mb-3 leading-snug">{team.domain} • {team.lastMessage}</p>

                                    <div className="space-y-2.5 mt-auto">
                                        <div>
                                            <div className="flex items-center justify-between text-[10px] mb-1">
                                                <span className="text-gray-400">Progress</span>
                                                <span className="text-white font-semibold">{team.progress}%</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full" style={{ width: `${team.progress}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /></svg>
                                                <span className="text-[10px] text-gray-300">{team.members} members</span>
                                            </div>
                                            <button className="flex items-center gap-1 text-[10px] text-blue-400 font-bold hover:text-blue-300 transition-colors">
                                                Open Workspace
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass rounded-xl border border-white/5 p-8 text-center bg-navy-950/20">
                        <h3 className="text-sm font-bold text-white mb-1">No teams found</h3>
                        <p className="text-[10px] text-gray-400">Try a different filter or create a new team to get started.</p>
                    </div>
                )}

                {role === 'student' && registeredHackathons.length > 0 && (
                    <div className="space-y-4 pt-2">
                        <div>
                            <h2 className="text-sm font-bold text-white mb-1">Registered Hackathons</h2>
                            <p className="text-[10px] text-gray-400">These events are ready for team formation and workspace coordination.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1 content-start">
                            {registeredHackathons.map((hack) => (
                                <div key={hack.id} className="glass rounded-xl border border-white/5 hover:border-blue-500/30 transition-all duration-300 flex flex-col overflow-hidden shadow-sm bg-navy-950/20">
                                    <div className="h-24 bg-gradient-to-br from-indigo-600 to-blue-600 p-3 relative">
                                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 text-[8px] font-bold text-white uppercase">
                                            {hack.status}
                                        </div>
                                        <div className="absolute bottom-2 left-3 right-3">
                                            <p className="text-white/80 text-[8px] font-bold uppercase tracking-widest">{hack.date}</p>
                                        </div>
                                    </div>
                                    <div className="p-3 sm:p-4 flex-1 flex flex-col">
                                        <h3 className="text-sm font-bold text-white mb-2 truncate">{hack.name}</h3>
                                        <p className="text-[10px] text-gray-400 mb-3 leading-snug">Set up or join a team before the event begins.</p>
                                        <div className="mt-auto flex gap-2">
                                            <button className="flex-1 py-2 text-xs bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/5 transition-colors">View Event</button>
                                            <button className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors">Form Team</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
    const renderWorkspace = () => {
        if (!currentTeam) {
            setTimeout(() => setViewMode('overview'), 0);
            return null;
        }

        return (
            <div className="h-full flex gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 relative">
                {/* Tactical Sidebar */}
                <div className="hidden xl:flex w-72 flex-none flex-col gap-4 h-full pb-4">
                    <button
                        onClick={() => setViewMode('overview')}
                        className="flex items-center gap-3 text-gray-600 hover:text-white transition-all group px-4 py-2 hover:bg-white/5 rounded-2xl w-fit "
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        <span className="text-xs font-bold uppercase tracking-[0.3em]">Exit Sector</span>
                    </button>
                    
                    <div className="glass h-full rounded-2xl border border-white/5 overflow-hidden flex flex-col p-4 shadow-2xl bg-black/10">
                        <div className="flex items-center gap-2 mb-5 px-1">
                             <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(147,51,234,1)]"></div>
                             <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Sessions</h4>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                            {teams.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTeamId(t.id)}
                                    className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-500 relative group overflow-hidden ${String(selectedTeamId) === String(t.id) ? 'bg-black/20 border border-blue-500/30 shadow-xl' : 'hover:bg-white/5 opacity-40 hover:opacity-100 grayscale hover:grayscale-0'}`}
                                >
                                    {String(selectedTeamId) === String(t.id) && <div className="absolute left-0 top-0 h-full w-1.5 bg-blue-600 shadow-[0_0_15px_rgba(147,51,234,1)]"></div>}
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient || 'from-navy-800 to-navy-950'} flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-black/40 group-hover:scale-110 transition-transform duration-500 border border-white/10 shrink-0`}>
                                        {t.name.charAt(0)}
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <p className="text-xs font-bold text-white truncate tracking-tight uppercase group-hover:text-blue-400 transition-colors">{t.name}</p>
                                        <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-0.5  truncate opacity-70">{t.domain || 'Field Ops'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Secure Tactical Environment */}
                <div className="flex-1 glass border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative bg-black/10 group/env">
                    {/* Header Protocol */}
                    <div className="px-6 py-4 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-navy-950/40 relative z-20">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${currentTeam.gradient || 'from-blue-600 to-blue-700'} flex items-center justify-center text-white text-xl font-bold shadow-2xl relative overflow-hidden group-hover/env:scale-105 transition-transform duration-700`}>
                                <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>
                                <span className="relative z-10 ">{currentTeam.name.charAt(0)}</span>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-white leading-none">{currentTeam.name}</h2>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${currentTeam.isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_#10b981]' : 'bg-gray-700'}`}></span>
                                        <span className="text-[10px] text-gray-500 font-semibold text-gray-400">{currentTeam.isOnline ? 'Real-time Link established' : 'Node Dormant'}</span>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-white/10"></div>
                                    <span className="text-[10px] text-indigo-400 font-bold tracking-[0.2em] uppercase ">Sector: {currentTeam.domain || 'Tactical'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Matrix */}
                        <div className="flex p-1.5 bg-black/20 rounded-xl border border-white/5 shadow-inner backdrop-blur-3xl overflow-x-auto max-w-full custom-scrollbar">
                            {['Chat', 'Tasks', 'Files', 'Activity'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-[0.2em] transition-all  whitespace-nowrap ${activeTab === tab ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30 translate-y-[-1px]' : 'text-gray-650 hover:text-white hover:bg-white/5'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Matrix */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 bg-navy-900/10">
                        {activeTab === 'Chat' && (
                            <div className="h-full flex flex-col">
                                <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pb-6 pr-2">
                                    <div className="text-center opacity-20 select-none pb-2">
                                        <span className="px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-[0.4em] ">Encrypted History Stream Initiated</span>
                                    </div>

                                    {(messages[currentTeam.id] || []).map((msg, i) => (
                                        <div key={msg.id} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ${msg.sender === 'me' ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-xl border border-white/10 shrink-0 relative overflow-hidden transition-transform hover:scale-110 ${msg.sender === 'system' ? 'bg-navy-950 border-white/5' : msg.sender === 'me' ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-900/40' : 'bg-navy-800'}`}>
                                                <div className="absolute inset-0 bg-white/5 opacity-[0.2]"></div>
                                                <span className="relative z-10">{msg.user.charAt(0)}</span>
                                            </div>
                                            <div className={`max-w-[75%] space-y-1.5 ${msg.sender === 'me' ? 'items-end' : 'items-start'} flex flex-col`}>
                                                <div className={`flex items-center gap-3 px-1 ${msg.sender === 'me' ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ">{msg.user}</span>
                                                    <span className="text-[9px] text-gray-700 font-bold font-mono tracking-tighter">{msg.time}</span>
                                                </div>
                                                <div className={`p-3 px-4 rounded-xl text-xs font-medium leading-relaxed shadow-2xl relative ${msg.sender === 'system' ? 'bg-navy-950/40 text-gray-400 border border-white/5 ' : msg.sender === 'me' ? 'bg-black/20 text-white border border-blue-500/20 rounded-tr-none' : 'bg-navy-950/60 text-gray-200 border border-white/5 rounded-tl-none'}`}>
                                                    <div className={`absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full opacity-0 group-hover:opacity-10 pointer-events-none`}></div>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {isTyping && (
                                        <div className="flex gap-4 animate-pulse px-1">
                                            <div className="w-10 h-10 rounded-xl bg-navy-950 flex items-center justify-center border border-white/5 shrink-0">
                                                <div className="flex gap-1"><div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"></div><div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></div></div>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-semibold self-center">Personnel communicating...</span>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>
                                
                                {/* Console Input */}
                                <form onSubmit={handleSendMessage} className="mt-4 relative">
                                    <div className="absolute inset-x-0 bottom-full mb-3 px-4 opacity-20">
                                         <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="TRANSMIT COMMUNIQUE TO SECTOR..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        className="w-full pl-4 pr-16 py-3.5 bg-navy-950/90 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-[0.2em] text-white focus:outline-none focus:border-blue-500/40 transition-all placeholder:text-gray-800 shadow-inner "
                                    />
                                    <button
                                        type="submit"
                                        disabled={!messageInput.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-700 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] text-white rounded-lg flex items-center justify-center transition-all disabled:opacity-20 disabled:grayscale group/send"
                                    >
                                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'Files' && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-white leading-none">Intelligence Dossier</h3>
                                        <p className="text-[10px] text-gray-500 font-medium opacity-70">Shared Sector Assets // READ/WRITE</p>
                                    </div>
                                    {canEditWorkspace && (
                                        <>
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                            <button
                                                onClick={() => fileInputRef.current.click()}
                                                className="px-6 h-12 bg-navy-950/60 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/5 hover:border-blue-500/20 transition-all flex items-center gap-3 text-xs font-semibold text-gray-400 active:scale-95 shadow-xl"
                                            >
                                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                Inject Asset
                                            </button>
                                        </>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {(files[currentTeam.id] || []).map(file => (
                                        <div key={file.id} className="glass p-4 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all duration-700 group relative flex flex-col bg-navy-950/20 hover:shadow-2xl">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg shadow-2xl relative overflow-hidden ${file.type === 'PDF' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                    <div className="absolute inset-0 bg-white/5 opacity-20"></div>
                                                    <span className="relative z-10">{file.type === 'PDF' ? '📄' : '📦'}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteFile(currentTeam.id, file.id)}
                                                    className="p-1 text-gray-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:hidden"
                                                    disabled={!canDeleteFiles}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                            <div className="flex-1 space-y-1 mb-4">
                                                <p className="font-bold text-white text-xs truncate uppercase tracking-tight " title={file.name}>{file.name}</p>
                                                <p className="text-[10px] text-gray-500 font-medium">{file.size} // {file.type}</p>
                                            </div>
                                            <div className="flex flex-col gap-1.5 pt-3 border-t border-white/5">
                                                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-gray-500 ">
                                                    <span>Origin: {file.uploader}</span>
                                                    <span>{file.time}</span>
                                                </div>
                                                <button className="w-full py-2 mt-2 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-gray-400 hover:text-white transition-all border border-white/5">Retrieve</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Tasks' && (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-white leading-none">Operational Directives</h3>
                                        <p className="text-[10px] text-gray-500 font-medium opacity-70">Sector Milestone Tracking</p>
                                    </div>
                                    {canEditWorkspace && (
                                        <button
                                            onClick={() => setModal({ type: 'task' })}
                                            className="px-6 h-12 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xl shadow-blue-500/20 transition-all hover:scale-105 hover:shadow-blue-500/40 active:scale-95 flex items-center justify-center gap-3"
                                        >
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4" /></svg>
                                            Push Objective
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {(tasks[currentTeam.id] || []).map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => toggleTask(currentTeam.id, task.id)}
                                            className={`group relative p-4 rounded-xl glass border transition-all duration-700 flex items-center justify-between cursor-pointer overflow-hidden ${task.status === 'Done' ? 'border-emerald-500/20 bg-emerald-500/5 opacity-50' : 'border-white/5 hover:bg-navy-950/60 hover:border-blue-500/30'}`}
                                        >
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${task.status === 'Done' ? 'bg-emerald-500 border-emerald-400/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-navy-950 border-white/10 group-hover:border-blue-500/40'}`}>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <p className={`text-base font-bold transition-all leading-none ${task.status === 'Done' ? 'text-gray-500 line-through' : 'text-white'}`}>{task.title}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${task.priority === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' : task.priority === 'Medium' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>{task.priority} INTENSITY</span>
                                                        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-white/5 text-gray-600 border border-white/5 ">ASGN: {task.assignedTo.toUpperCase()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 relative z-10">
                                                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border backdrop-blur-md ${task.status === 'Done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                    {task.status}
                                                </span>
                                            </div>
                                            <div className={`absolute inset-0 bg-gradient-to-r ${task.status === 'Done' ? 'from-emerald-500/5 to-transparent' : 'from-blue-500/5 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'Activity' && (
                            <div className="space-y-6">
                                <div className="space-y-1 px-1">
                                    <h3 className="text-xl font-bold text-white leading-none">Sector Audit Log</h3>
                                    <p className="text-[10px] text-gray-500 font-medium opacity-70">Historical Transaction Stream</p>
                                </div>
                                <div className="space-y-4 max-w-4xl">
                                    {(currentTeam.activity || []).map(act => (
                                        <div key={act.id} className="flex gap-4 p-4 rounded-xl bg-navy-950/40 border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
                                            <div className="w-10 h-10 rounded-xl bg-navy-950 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0 group-hover:text-blue-400 group-hover:bg-navy-900 border border-white/5 transition-all duration-500 ">
                                                {act.user.charAt(0)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-xs font-medium text-gray-400 leading-relaxed">
                                                    <span className="font-bold text-white uppercase tracking-widest drop-shadow-sm">{act.user}</span> 
                                                    <span className="mx-2 opacity-50 uppercase text-[10px] tracking-tight">{act.action}</span> 
                                                    <span className="font-bold text-blue-400 ">"{act.item.toUpperCase()}"</span>
                                                </p>
                                                <div className="flex items-center gap-3">
                                                     <div className="w-1 h-1 rounded-full bg-navy-800"></div>
                                                     <span className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.2em] font-mono">{act.time}</span>
                                                </div>
                                            </div>
                                            <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-white/[0.02] to-transparent pointer-events-none"></div>
                                        </div>
                                    ))}
                                    {(!currentTeam.activity || currentTeam.activity.length === 0) && (
                                        <div className="py-16 text-center glass rounded-xl border border-dashed border-white/10">
                                             <p className="text-xs font-bold text-gray-800 uppercase tracking-[0.4em] ">No recent sequence transactions recorded in this sector.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col font-sans text-white">
            <div className="flex-1 flex flex-col min-h-0">
                {viewMode === 'overview' ? renderOverview() : renderWorkspace()}
            </div>

            {/* Tactical Modals */}
            {modal.type && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute inset-0 cursor-crosshair" onClick={() => setModal({ type: null })}></div>
                    <div className="glass border border-white/10 rounded-xl w-full max-w-sm p-5 relative animate-in zoom-in-95 duration-500 shadow-[0_0_50px_rgba(59,130,246,0.2)] bg-navy-900 max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-2xl -mr-16 -mt-16"></div>
                        
                        <div className="relative z-10 flex flex-col flex-1 min-h-0">
                            <div className="mb-4 flex-none">
                                <h3 className="text-sm font-bold text-white leading-none">
                                    {modal.type === 'create' && 'Unit Initialization'}
                                    {modal.type === 'join' && 'Sector Entry'}
                                    {modal.type === 'task' && 'Push Directive'}
                                    {modal.type === 'delete' && 'Neutralize Unit'}
                                </h3>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1.5">
                                    {modal.type === 'create' && 'Command Interface // NEW-UNIT-ALPHA'}
                                    {modal.type === 'join' && 'Authorize Signature // ENCRYPTION-REQ'}
                                    {modal.type === 'task' && 'Assign Objective // SECTOR-GOAL'}
                                    {modal.type === 'delete' && `Warning: Destructive Action // TARGET: ${modal.data?.name.toUpperCase()}`}
                                </p>
                            </div>

                            <form onSubmit={
                                modal.type === 'create' ? handleCreateTeam :
                                    modal.type === 'join' ? handleJoinTeam :
                                        modal.type === 'task' ? handleAddTask :
                                            (e) => { e.preventDefault(); handleDeleteTeam(modal.data.id); }
                            } className="flex-1 flex flex-col min-h-0">
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3 mb-4">
                                    {modal.type === 'create' && (
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider ml-1">Team Designation</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="ENTER UNIT NAME..."
                                                    value={newTeamData.name}
                                                    onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
                                                    className="w-full bg-navy-950/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/40 transition-all uppercase tracking-widest placeholder:text-gray-800 shadow-inner"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider ml-1">Assigned Hackathon</label>
                                                <select
                                                    required
                                                    value={newTeamData.hackathon}
                                                    onChange={(e) => setNewTeamData({ ...newTeamData, hackathon: e.target.value })}
                                                    className="w-full bg-navy-950/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/40 transition-all uppercase tracking-widest shadow-inner appearance-none cursor-pointer"
                                                >
                                                    <option value="" className="bg-navy-900">SELECT DEPLOYMENT SECTOR...</option>
                                                    {registeredHackathons.map(h => (
                                                        <option key={h.id} value={h.hackathonId} className="bg-navy-900">{h.name.toUpperCase()}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider ml-1">Mission Domain</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="E.G., CYBERSECURITY, AI, WEB3..."
                                                    value={newTeamData.domain}
                                                    onChange={(e) => setNewTeamData({ ...newTeamData, domain: e.target.value })}
                                                    className="w-full bg-navy-950/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/40 transition-all uppercase tracking-widest placeholder:text-gray-800 shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {modal.type === 'join' && (
                                        <div className="space-y-4">
                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider text-center block w-full">Authentication Signature Needed</label>
                                            <input
                                                type="text"
                                                required
                                                id="inviteCode"
                                                placeholder="X X X X X X"
                                                value={inviteCode}
                                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                                maxLength={6}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-4 text-3xl font-bold text-center text-blue-400 focus:outline-none focus:border-blue-500 shadow-2xl tracking-[0.3em] transition-all placeholder:text-gray-900"
                                            />
                                            <p className="text-[9px] text-gray-700 font-bold uppercase tracking-wider text-center">Verify invite key from unit lead before transmission.</p>
                                        </div>
                                    )}

                                    {modal.type === 'task' && (
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider ml-1">Objective Title</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="DECODE PARAMETERS..."
                                                    value={newTaskData.title}
                                                    onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                                                    className="w-full bg-navy-950/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/40 transition-all uppercase tracking-widest placeholder:text-gray-800"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider ml-1">Intensity</label>
                                                    <select
                                                        value={newTaskData.priority}
                                                        onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value })}
                                                        className="w-full bg-navy-950/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/40 appearance-none uppercase tracking-widest"
                                                    >
                                                        <option value="Low" className="bg-navy-900">LOW SIGNAL</option>
                                                        <option value="Medium" className="bg-navy-900">STEADY STATUS</option>
                                                        <option value="High" className="bg-navy-900">CRITICAL NODE</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider ml-1">Personnel Tag</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="ALPHA-01..."
                                                        value={newTaskData.assignedTo}
                                                        onChange={(e) => setNewTaskData({ ...newTaskData, assignedTo: e.target.value })}
                                                        className="w-full bg-navy-950/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500/40 transition-all uppercase tracking-widest placeholder:text-gray-800"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {modal.type === 'delete' && (
                                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-center space-y-2">
                                            <p className="text-xs font-bold text-red-200 uppercase tracking-wider">This will permanently dissociate all personnel and archive sector data.</p>
                                            <p className="text-[8px] text-red-500/50 font-bold uppercase tracking-widest">ADMIN-AUTH-7 REQUIRED</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-3 border-t border-white/5 flex-none">
                                    <button
                                        type="button"
                                        onClick={() => setModal({ type: null })}
                                        className="flex-1 py-2 rounded-lg bg-white/5 text-gray-500 hover:text-white font-bold uppercase tracking-wider text-xs transition-all border border-white/5 hover:bg-white/10"
                                    >
                                        Abort
                                    </button>
                                    <button
                                        type="submit"
                                        className={`flex-1 py-2 rounded-lg font-bold uppercase tracking-wider text-xs transition-all shadow-md transform hover:scale-105 active:scale-95 ${modal.type === 'delete' ? 'bg-red-600/20 border border-red-500/40 text-red-500 hover:bg-red-600 hover:text-white' : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-blue-500/20 hover:shadow-blue-500/40'}`}
                                    >
                                        {modal.type === 'delete' ? 'Confirm Neutralization' : 'Execute Protocol'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTeams;


