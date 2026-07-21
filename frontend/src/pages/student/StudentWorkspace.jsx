import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/api';
import { getMyTeams } from '../../api/teamApi';

const StudentWorkspace = () => {
    // State management
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [activeTab, setActiveTab] = useState('Chat');
    const [messageInput, setMessageInput] = useState('');
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
                    avatarColor: idx % 2 === 0 ? 'from-blue-500 to-indigo-600' : 'from-blue-500 to-pink-600',
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

        const connectWS = () => {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
            // Correctly handle the base URL to create the WS URL
            const wsBase = apiBase.replace(/^http/, 'ws').replace(/\/api$/, '');
            const wsUrl = `${wsBase}/api/chat/ws/${selectedTeam}/${userId}`;
            
            console.log(`Connecting to chat: ${wsUrl}`);
            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => console.log("Chat connected");

            ws.onmessage = (event) => {
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
            };

            ws.onclose = () => {
                console.log("Chat disconnected. Retrying in 3s...");
                setTimeout(() => {
                    if (activeTab === 'Chat' && socketRef.current?.readyState !== WebSocket.OPEN) {
                        connectWS();
                    }
                }, 3000);
            };

            ws.onerror = (err) => console.error("WebSocket Error:", err);
        };

        connectWS();

        return () => {
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

    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [teamMessages, selectedTeam, activeTab]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!messageInput.trim()) return;

        // Send via WebSocket if connected
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            const messageData = {
                content: messageInput,
                type: 'text'
            };
            socketRef.current.send(JSON.stringify(messageData));
        }

        // Optimistically update UI
        const newMessage = {
            id: Date.now(),
            text: messageInput,
            sender: 'me',
            user: userName,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text'
        };

        setTeamMessages(prev => ({
            ...prev,
            [selectedTeam]: [...(prev[selectedTeam] || []), newMessage]
        }));
        
        setMessageInput('');
    };

    if (isLoading) return (
        <div className="h-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
    );

    const currentTeam = teams.find(t => t.id === selectedTeam) || teams[0];
    const messages = selectedTeam ? (teamMessages[selectedTeam] || []) : [];

    return (
    return (
        <div className="h-[calc(100vh-140px)] flex gap-3 animate-fade-in">
            {/* Sidebar: Teams List */}
            <div className="w-64 flex-none glass border border-white/5 rounded-xl flex flex-col overflow-hidden shadow-md">
                <div className="p-3 border-b border-white/5 bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-base font-bold text-white">Your Teams</h2>
                        <span className="bg-blue-600/20 text-blue-400 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-blue-500/20">
                            {teams.length} Active
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {teams.map(team => (
                        <button
                            key={team.id}
                            onClick={() => setSelectedTeam(team.id)}
                            className={`w-full group relative p-2 rounded-lg flex items-center gap-2 transition-all duration-300 ${selectedTeam === team.id
                                    ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/30'
                                    : 'hover:bg-white/5 border border-transparent grayscale hover:grayscale-0'
                                }`}
                        >
                            <div className={`relative shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${team.avatarColor} flex items-center justify-center text-white font-bold text-xs shadow-sm transform group-hover:scale-105 transition-transform`}>
                                {team.name.charAt(0)}
                                {team.isOnline && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border border-black rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 text-left">
                                <h3 className={`text-xs font-bold truncate transition-colors ${selectedTeam === team.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                    {team.name}
                                </h3>
                                <p className="text-[9px] text-gray-500 truncate w-full group-hover:text-gray-400 transition-colors">
                                    {teamMessages[team.id]?.slice(-1)[0]?.text || 'No messages yet'}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 glass border border-white/5 rounded-xl flex flex-col overflow-hidden shadow-md relative bg-black/10">
                {!selectedTeam ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-2">
                        <div className="text-4xl">🏢</div>
                        <p className="text-sm font-medium">Select a team to start collaborating</p>
                    </div>
                ) : (
                    <>
                        {/* Workspace Header */}
                        <div className="h-12 px-4 flex items-center justify-between flex-none bg-white/5 border-b border-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentTeam?.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-sm ring-1 ring-white/10`}>
                                    {currentTeam?.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-sm md:text-base font-bold text-white tracking-tight leading-tight">{currentTeam?.name} Workspace</h2>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${currentTeam?.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                        <span className="text-[9px] text-gray-400 font-medium">
                                            {currentTeam?.isOnline ? `Online • ${currentTeam?.status}` : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:flex p-1 bg-black/20 rounded-lg border border-white/10 shadow-inner">
                                {['Chat', 'Files', 'Tasks'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-3 py-1 text-[10px] font-semibold rounded transition-all ${activeTab === tab
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm ring-1 ring-white/10'
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
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar scroll-smooth">
                                        {messages.map((msg) => (
                                            <div key={msg.id} className={`flex w-full group ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`flex gap-2 max-w-[75%] ${msg.sender === 'me' ? 'flex-row-reverse' : ''}`}>
                                                    <div className="mt-auto">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm border border-white/10 ${msg.sender === 'me'
                                                                ? 'bg-gradient-to-br from-blue-700 to-indigo-800 text-white'
                                                                : 'bg-gradient-to-br from-gray-800 to-gray-900 text-gray-400'
                                                            }`}>
                                                            {msg.user.charAt(0)}
                                                        </div>
                                                    </div>

                                                    <div className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                                                        <div className="flex items-center gap-1.5 mb-0.5 px-1">
                                                            <span className="text-[10px] font-medium text-gray-400">{msg.user}</span>
                                                            <span className="text-[9px] text-gray-500">{msg.time}</span>
                                                        </div>
                                                        <div className={`
                                                            relative p-2 rounded-xl text-[10px] leading-relaxed shadow-sm break-words
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
                                    <div className="p-2 bg-white/5 border-t border-white/5 backdrop-blur-xl">
                                        <div className="max-w-4xl mx-auto">
                                            <form onSubmit={handleSendMessage} className="relative group">
                                                <input
                                                    type="text"
                                                    value={messageInput}
                                                    onChange={(e) => setMessageInput(e.target.value)}
                                                    placeholder="Type your message to the team..."
                                                    className="w-full pl-3 pr-10 py-1.5 bg-navy-950/80 border border-white/10 rounded-lg text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-navy-950 transition-all font-medium placeholder-gray-600 shadow-inner"
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center">
                                                    <button
                                                        type="submit"
                                                        disabled={!messageInput.trim()}
                                                        className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded shadow transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center"
                                                    >
                                                        <svg className="w-3.5 h-3.5 translate-x-0.5 -translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    <div className="max-w-4xl mx-auto space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-white">Project Milestones</h3>
                                            <button className="px-3 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-semibold rounded border border-blue-500/20 hover:bg-blue-600/30 transition-colors">
                                                + New Task
                                            </button>
                                        </div>
                                        
                                        <div className="grid gap-2">
                                            {tasks.length > 0 ? tasks.map(task => (
                                                <div key={task.id} className="glass p-3 rounded-lg border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${task.status === 'Done' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                        <div>
                                                            <h4 className="text-xs text-white font-bold">{task.title}</h4>
                                                            <p className="text-[9px] text-gray-500 mt-0.5">Assigned to: {task.assignee}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                                            task.status === 'Done' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                                        }`}>
                                                            {task.status}
                                                        </span>
                                                        <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white transition-all">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-center py-6">
                                                    <div className="text-2xl mb-2">📋</div>
                                                    <p className="text-[10px] text-gray-500">No milestones tracked for this team yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'Files' && (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-2">
                                    <div className="text-4xl">📁</div>
                                    <p className="text-sm font-medium">Team files will appear here</p>
                                    <button className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] rounded border border-white/10 transition-colors">
                                        Upload Document
                                    </button>
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
