import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/api';
import { getMyTeams } from '../../api/teamApi';
import { usePlatformSettings } from '../../context/PlatformSettingsContext';

const StudentWorkspace = () => {
    const navigate = useNavigate();
    const { 
        allowTeamChanges,
        maxUploadFileSize,
        allowedFileTypes,
        gitHubRepo,
        demoUrl
    } = usePlatformSettings();
    // State management
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [activeTab, setActiveTab] = useState('Chat');
    const [messageInput, setMessageInput] = useState('');
    const [teamFiles, setTeamFiles] = useState([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [fileUploadError, setFileUploadError] = useState('');
    const fileInputRef = useRef(null);
    const [teamMessages, setTeamMessages] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const chatEndRef = useRef(null);
    const socketRef = useRef(null);

    // User data from session/local storage
    const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{"_id": "guest_id", "name": "Hari"}');
    const userId = currentUser._id || currentUser.id || 'guest_id';
    const userName = currentUser.name || 'Hari';

    // 1. Fetch Real Teams
    useEffect(() => {
        const fetchTeams = async () => {
            setIsLoading(true);
            try {
                const data = await getMyTeams();
                const mappedTeams = data.map((team, idx) => ({
                    id: team.id || team._id,
                    name: team.teamName,
                    avatarColor: idx % 2 === 0 ? 'from-blue-500 to-indigo-600' : 'from-purple-500 to-pink-600',
                    isOnline: true, // System status
                    status: 'Active Workspace'
                }));
                setTeams(mappedTeams);
                if (mappedTeams.length > 0) {
                    setSelectedTeam(mappedTeams[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch teams:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTeams();
    }, []);

    // 2. WebSocket Connection Logic
    useEffect(() => {
        if (activeTab !== 'Chat' || !selectedTeam) return;

        let isCleanedUp = false;
        let retryTimeoutId = null;

        const connectWS = () => {
            if (isCleanedUp) return;
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            // Correctly handle the base URL to create the WS URL
            const wsBase = apiBase.replace(/^http/, 'ws').replace(/\/api$/, '');
            const wsUrl = `${wsBase}/api/chat/ws/${selectedTeam}/${userId}`;
            
            console.log(`Connecting to chat: ${wsUrl}`);
            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => console.log("Chat connected");

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'new_message') {
                        const msg = data.message;
                        const newMessage = {
                            id: msg._id || Date.now(),
                            text: msg.content,
                            sender: msg.senderId === userId ? 'me' : 'them',
                            user: msg.senderName || (msg.senderId === userId ? userName : 'Teammate'),
                            time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            type: msg.messageType || 'text'
                        };
                        
                        setTeamMessages(prev => ({
                            ...prev,
                            [selectedTeam]: [...(prev[selectedTeam] || []), newMessage]
                        }));
                    }
                } catch (e) {
                    console.error("Failed to parse websocket message:", e);
                }
            };

            ws.onclose = () => {
                if (!isCleanedUp) {
                    console.log("Chat disconnected. Retrying in 3s...");
                    retryTimeoutId = setTimeout(() => {
                        if (!isCleanedUp && activeTab === 'Chat' && socketRef.current?.readyState !== WebSocket.OPEN) {
                            connectWS();
                        }
                    }, 3000);
                }
            };

            ws.onerror = (err) => console.error("WebSocket Error:", err);
        };

        connectWS();

        return () => {
            isCleanedUp = true;
            if (retryTimeoutId) clearTimeout(retryTimeoutId);
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [selectedTeam, activeTab, userId, userName]);

    // 3. Fetch History on team change
    useEffect(() => {
        if (!selectedTeam || activeTab !== 'Chat') return;

        const fetchHistory = async () => {
            try {
                const { data } = await apiClient.get(`/chat/${selectedTeam}/messages`);
                if (data) {
                    const formatted = data.map(m => ({
                        id: m._id,
                        text: m.content,
                        sender: m.senderId === userId ? 'me' : 'them',
                        user: m.senderName || (m.senderId === userId ? userName : 'Teammate'),
                        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        type: m.messageType
                    }));
                    setTeamMessages(prev => ({ ...prev, [selectedTeam]: formatted }));
                }
            } catch (err) {
                console.error("History fetch failed:", err);
            }
        };

        fetchHistory();
    }, [selectedTeam, activeTab, userId, userName]);

    // 4. Tasks Integration
    const [tasks, setTasks] = useState([]);
    useEffect(() => {
        if (!selectedTeam || activeTab !== 'Tasks') return;
        const fetchTasks = async () => {
            try {
                const { data } = await apiClient.get(`/progress/team/${selectedTeam}`);
                const { data: milestones } = await apiClient.get(`/progress/milestones/${data._id}`);
                setTasks(milestones.map(m => ({
                    id: m._id,
                    title: m.milestoneId,
                    status: m.completed ? 'Done' : 'In Progress',
                    assignee: 'Team Member'
                })));
            } catch (err) {
                console.error("Tasks fetch failed:", err);
            }
        };
        fetchTasks();
    }, [selectedTeam, activeTab]);

    // 5. Team Files Integration
    const fetchTeamFiles = useCallback(async () => {
        if (!selectedTeam) return;
        setIsLoadingFiles(true);
        try {
            const { data } = await apiClient.get(`/chat/${selectedTeam}/files`);
            setTeamFiles(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch team files:", err);
            setTeamFiles([]);
        } finally {
            setIsLoadingFiles(false);
        }
    }, [selectedTeam]);

    useEffect(() => {
        if (activeTab === 'Files' && selectedTeam) {
            fetchTeamFiles();
        }
    }, [activeTab, selectedTeam, fetchTeamFiles]);

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !selectedTeam) return;

        setFileUploadError('');

        // Parse max size limit
        const sizeMatch = String(maxUploadFileSize || '10MB').match(/\d+/);
        const maxBytes = sizeMatch ? parseInt(sizeMatch[0], 10) * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxBytes) {
            setFileUploadError(`File exceeds maximum size limit of ${maxUploadFileSize}.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Validate extension
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        const allowed = allowedFileTypes || ['.pdf', '.zip', '.tar.gz', '.png', '.jpg'];
        const isAllowed = allowed.some(a => a.toLowerCase() === ext || a.toLowerCase() === ext.replace('.', ''));
        if (!isAllowed && allowed.length > 0) {
            setFileUploadError(`Invalid file format. Allowed formats: ${allowed.join(', ')}`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        setUploadProgress(0);

        try {
            await apiClient.post(`/chat/${selectedTeam}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percent = progressEvent.total
                        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        : 0;
                    setUploadProgress(percent);
                }
            });
            await fetchTeamFiles();
        } catch (err) {
            console.error("File upload failed:", err);
            setFileUploadError(err.response?.data?.detail || 'Failed to upload file.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownloadFile = async (file) => {
        try {
            const fileId = file._id || file.id;
            const downloadUrl = file.url?.startsWith('/api') ? file.url : `/chat/${selectedTeam}/files/${fileId}/download`;
            const response = await apiClient.get(downloadUrl, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', file.name || 'download');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("File download failed:", err);
            alert("Could not download file. Please try again.");
        }
    };

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [teamMessages, selectedTeam, activeTab]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const trimmedMessage = messageInput.trim();
        if (!trimmedMessage || !selectedTeam) return;

        try {
            const { data } = await apiClient.post(`/chat/${selectedTeam}/send`, {
                content: trimmedMessage,
                type: 'text'
            });

            const newMessage = {
                id: data?._id || Date.now(),
                text: data?.content || trimmedMessage,
                sender: data?.senderId === userId ? 'me' : 'them',
                user: data?.senderName || userName,
                time: new Date(data?.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: data?.messageType || 'text'
            };

            setTeamMessages(prev => ({
                ...prev,
                [selectedTeam]: [...(prev[selectedTeam] || []), newMessage]
            }));

            setMessageInput('');
        } catch (error) {
            console.error('Failed to send workspace message:', error);
            const backendDetail = error?.response?.data?.detail;
            const message = typeof backendDetail === 'string'
                ? backendDetail
                : backendDetail?.message || 'The message could not be saved. Please try again.';
            alert(message);
        }
    };

    if (isLoading) return (
        <div className="h-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
    );

    const currentTeam = teams.find(t => t.id === selectedTeam) || teams[0];
    const messages = selectedTeam ? (teamMessages[selectedTeam] || []) : [];

    return (
        <div className="h-[calc(100vh-140px)] flex gap-6 animate-fade-in">
            {/* Sidebar: Teams List */}
            <div className="w-80 flex-none glass border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-xl">
                <div className="p-6 border-b border-white/5 bg-white/5">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white">Your Teams</h2>
                        <span className="bg-blue-600/20 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-md border border-blue-500/20">
                            {teams.length} Active
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {teams.map(team => (
                        <button
                            key={team.id}
                            onClick={() => setSelectedTeam(team.id)}
                            className={`w-full group relative p-3 rounded-2xl flex items-center gap-4 transition-all duration-300 ${selectedTeam === team.id
                                    ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/30'
                                    : 'hover:bg-white/5 border border-transparent grayscale hover:grayscale-0'
                                }`}
                        >
                            <div className={`relative shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${team.avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-md transform group-hover:scale-105 transition-transform`}>
                                {team.name.charAt(0)}
                                {team.isOnline && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 text-left">
                                <h3 className={`text-sm font-bold truncate transition-colors ${selectedTeam === team.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                    {team.name}
                                </h3>
                                <p className="text-xs text-gray-500 truncate w-full group-hover:text-gray-400 transition-colors mt-0.5">
                                    {teamMessages[team.id]?.slice(-1)[0]?.text || 'No messages yet'}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 glass border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-xl relative bg-black/10">
                {!selectedTeam ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">
                            🏢
                        </div>
                        <h3 className="text-xl font-bold text-white">No Active Team Workspace</h3>
                        <p className="text-gray-400 text-sm max-w-sm">
                            {teams.length === 0
                                ? "You haven't joined a team yet. Register for a hackathon or create a team to activate your collaboration workspace."
                                : "Select a team from the sidebar to view chat, deliverables, and tasks."}
                        </p>
                        {teams.length === 0 && (
                            <div className="flex flex-wrap gap-3 pt-2">
                                <button
                                    onClick={() => navigate('/student/hackathons')}
                                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 text-white font-semibold text-xs rounded-xl shadow transition"
                                >
                                    Browse Hackathons
                                </button>
                                <button
                                    onClick={() => navigate('/student/teams/create')}
                                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl border border-white/10 transition"
                                >
                                    Create a Team
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Workspace Header */}
                        <div className="h-20 px-8 flex items-center justify-between flex-none bg-white/5 border-b border-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentTeam?.avatarColor} flex items-center justify-center text-white font-bold text-xl shadow-md ring-1 ring-white/10`}>
                                    {currentTeam?.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{currentTeam?.name} Workspace</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`w-2 h-2 rounded-full ${currentTeam?.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                        <span className="text-sm text-gray-400 font-medium">
                                            {currentTeam?.isOnline ? `Online • ${currentTeam?.status}` : 'Offline'}
                                        </span>
                                        {!allowTeamChanges && (
                                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                                                🔒 Team members locked by platform
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:flex p-1 bg-black/20 rounded-xl border border-white/10 shadow-inner">
                                {['Chat', 'Files', 'Tasks'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md ring-1 ring-white/10'
                                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content Area */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {activeTab === 'Chat' && (
                                <>
                                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar scroll-smooth">
                                        {messages.map((msg) => (
                                            <div key={msg.id} className={`flex w-full group ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`flex gap-4 max-w-[75%] ${msg.sender === 'me' ? 'flex-row-reverse' : ''}`}>
                                                    <div className="mt-auto">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-md border border-white/10 ${msg.sender === 'me'
                                                                ? 'bg-gradient-to-br from-blue-700 to-indigo-800 text-white'
                                                                : 'bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400'
                                                            }`}>
                                                            {msg.user.charAt(0)}
                                                        </div>
                                                    </div>

                                                    <div className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                                                        <div className="flex items-center gap-2 mb-1 px-1">
                                                            <span className="text-xs font-medium text-gray-400">{msg.user}</span>
                                                            <span className="text-xs text-gray-500">{msg.time}</span>
                                                        </div>
                                                        <div className={`
                                                            relative p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words
                                                            ${msg.sender === 'me'
                                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none border border-white/10'
                                                                : 'glass bg-white/5 text-gray-200 rounded-tl-none border border-white/5 hover:bg-white/10 transition-colors'}
                                                        `}>
                                                            {msg.text}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Input Bar */}
                                    <div className="p-6 bg-white/5 border-t border-white/5 backdrop-blur-xl">
                                        <div className="max-w-4xl mx-auto">
                                            <form onSubmit={handleSendMessage} className="relative group">
                                                <input
                                                    type="text"
                                                    value={messageInput}
                                                    onChange={(e) => setMessageInput(e.target.value)}
                                                    placeholder="Type your message to the team..."
                                                    className="w-full pl-6 pr-16 py-4 bg-navy-950/80 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-navy-950 transition-all font-medium placeholder-gray-600 shadow-inner"
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                                    <button
                                                        type="submit"
                                                        disabled={!messageInput.trim()}
                                                        className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl shadow-lg transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center"
                                                    >
                                                        <svg className="w-5 h-5 translate-x-0.5 -translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'Tasks' && (
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <div className="max-w-4xl mx-auto space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-bold text-white">Project Milestones</h3>
                                            <button className="px-4 py-2 bg-blue-600/20 text-blue-400 text-sm font-semibold rounded-xl border border-blue-500/20 hover:bg-blue-600/30 transition-colors">
                                                + New Task
                                            </button>
                                        </div>
                                        
                                        <div className="grid gap-4">
                                            {tasks.length > 0 ? tasks.map(task => (
                                                <div key={task.id} className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-3 h-3 rounded-full ${task.status === 'Done' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                        <div>
                                                            <h4 className="text-white font-bold">{task.title}</h4>
                                                            <p className="text-xs text-gray-500 mt-1">Assigned to: {task.assignee}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                            task.status === 'Done' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                            {task.status}
                                                        </span>
                                                        <button className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-white transition-all">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-center py-12">
                                                    <div className="text-4xl mb-4">📋</div>
                                                    <p className="text-gray-500">No milestones tracked for this team yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Files' && (
                                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                                    {/* Header & Upload Controls */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Team File Repository</h3>
                                            <p className="text-xs text-gray-400 mt-1">Shared project assets, documentation, and source archives.</p>
                                        </div>

                                        <div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                disabled={isUploading}
                                            />
                                            <button
                                                disabled={isUploading}
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <span>{isUploading ? 'Uploading...' : '+ Upload File'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Upload Progress Bar */}
                                    {isUploading && (
                                        <div className="glass p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-2">
                                            <div className="flex justify-between text-xs font-semibold text-blue-300">
                                                <span>Uploading file...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {fileUploadError && (
                                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                                            {fileUploadError}
                                        </div>
                                    )}

                                    {/* File List */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Uploaded Files ({teamFiles.length})</h4>
                                        {isLoadingFiles ? (
                                            <div className="glass p-8 text-center rounded-2xl text-xs text-gray-400">Loading files...</div>
                                        ) : teamFiles.length === 0 ? (
                                            <div className="glass p-8 text-center rounded-2xl border border-dashed border-white/10 text-xs text-gray-400">
                                                No files shared in this team yet. Use the upload button above to share attachments with your teammates.
                                            </div>
                                        ) : (
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {teamFiles.map((file) => (
                                                    <div key={file._id || file.id} className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-3 group hover:border-white/10 transition">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
                                                                📄
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-bold text-white">{file.name}</p>
                                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                                    {(Number(file.size || 0) / (1024 * 1024)).toFixed(2)} MB • {file.uploadedByName || 'Teammate'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDownloadFile(file)}
                                                            className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 border border-white/10 transition"
                                                        >
                                                            Download
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Platform Deliverables Baseline Policy Card */}
                                    <div className="w-full glass p-5 rounded-2xl border border-white/10 space-y-3.5 text-xs">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                                            <span className="font-bold text-white uppercase tracking-wider text-[10px]">Platform Deliverable Baseline</span>
                                            <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold">Live Enforced</span>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                                <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">Max Archive Size</span>
                                                <span className="text-sm font-bold text-white">{maxUploadFileSize}</span>
                                            </div>
                                            <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                                <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">GitHub Repository</span>
                                                <span className={`text-xs font-bold ${gitHubRepo ? 'text-sky-400' : 'text-gray-400'}`}>
                                                    {gitHubRepo ? 'Mandatory Link' : 'Optional'}
                                                </span>
                                            </div>
                                            <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                                <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">Live Demo URL</span>
                                                <span className={`text-xs font-bold ${demoUrl ? 'text-sky-400' : 'text-gray-400'}`}>
                                                    {demoUrl ? 'Mandatory Link' : 'Optional'}
                                                </span>
                                            </div>
                                            <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                                <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">Accepted Formats</span>
                                                <span className="text-xs font-bold text-purple-300 truncate block">
                                                    {(allowedFileTypes || []).join(', ')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <button 
                                                onClick={() => navigate('/student/submissions')}
                                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <span>Open Deliverables & Project Submission Portal</span>
                                                <span>→</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StudentWorkspace;
