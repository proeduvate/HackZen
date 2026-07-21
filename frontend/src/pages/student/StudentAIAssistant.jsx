import React, { useState, useEffect } from 'react';
import { fetchInitialMessages, fetchQuickStarters, sendChatMessage } from '../../services/student/aiAssistantApi';

const StudentAIAssistant = () => {
    const [selectedContext, setSelectedContext] = useState('Global Connect 2025');
    const [selectedObjective, setSelectedObjective] = useState('Ideation');
    const [messages, setMessages] = useState([]);
    const [quickStarters, setQuickStarters] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAITyping, setIsAITyping] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [initialMsgs, triggers] = await Promise.all([
                    fetchInitialMessages(),
                    fetchQuickStarters()
                ]);
                setMessages(initialMsgs);
                setQuickStarters(triggers);
            } catch (error) {
                console.error('Failed to load AI data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMsg = {
            id: Date.now(),
            sender: 'user',
            text: inputValue,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsAITyping(true);

        try {
            const aiResponse = await sendChatMessage(inputValue, selectedContext, selectedObjective);
            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error('AI Assistant error:', error);
        } finally {
            setIsAITyping(false);
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="mb-4 flex-none">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    AI Assistant <span className="gradient-text">Workspace</span>
                </h1>
                <p className="max-w-2xl text-[10px] text-gray-400">
                    Use the assistant to generate hackathon ideas, sharpen your pitch, coordinate your team, and finalize your submission faster.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_2fr] lg:items-stretch flex-1 min-h-0">
                <div className="flex flex-col gap-4 min-h-0">
                    <div className="glass flex flex-col min-h-0 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <h2 className="text-sm font-bold text-white">Operational Context</h2>
                            <span className="text-[9px] tracking-widest uppercase text-slate-400">Config</span>
                        </div>
                        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-semibold tracking-wider text-gray-500 uppercase">Event Repository</label>
                                <select
                                    className="w-full px-3 py-2 text-[10px] font-semibold text-white border shadow-sm outline-none rounded-lg border-white/10 bg-navy-950/80 focus:ring-1 focus:ring-blue-500/50"
                                    value={selectedContext}
                                    onChange={(e) => setSelectedContext(e.target.value)}
                                >
                                    <option value="Global Connect 2025">Global Connect 2025</option>
                                    <option value="CyberSecurity Sprint">CyberSecurity Sprint</option>
                                    <option value="Green Tech Challenge">Green Tech Challenge</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-semibold tracking-wider text-gray-500 uppercase">Logic Objective</label>
                                <select
                                    className="w-full px-3 py-2 text-[10px] font-semibold text-white border shadow-sm outline-none rounded-lg border-white/10 bg-navy-950/80 focus:ring-1 focus:ring-blue-500/50"
                                    value={selectedObjective}
                                    onChange={(e) => setSelectedObjective(e.target.value)}
                                >
                                    <option value="Ideation">Ideation</option>
                                    <option value="Coding">Coding</option>
                                    <option value="Pitching">Pitching</option>
                                    <option value="Debugging">Debugging</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="glass flex flex-col min-h-0 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <h2 className="text-sm font-bold text-white">Macro Triggers</h2>
                            <span className="text-[9px] tracking-widest uppercase text-slate-400">Quick start</span>
                        </div>
                        <div className="flex-1 min-h-0 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                            {quickStarters.map(starter => (
                                <button
                                    key={starter.id}
                                    onClick={() => setInputValue(starter.text)}
                                    className="w-full px-3 py-2 text-left transition border rounded-lg border-white/10 bg-white/5 hover:border-blue-500/30 hover:bg-white/10"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] leading-relaxed text-slate-300">"{starter.text}"</p>
                                        <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="glass flex flex-col min-h-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-md">
                    <div className="flex-1 min-h-0 p-4 space-y-4 overflow-y-auto custom-scrollbar bg-navy-900/40">
                        <div className="flex items-center gap-2 px-3 py-2 text-[9px] text-gray-400 border rounded-lg border-white/10 bg-white/5">
                            <span className="text-sm">ℹ️</span>
                            Heuristic analysis active. Suggestions are non-binding.
                        </div>

                        {messages.length === 0 && !isLoading ? (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center text-xs text-gray-400">
                                Start the conversation by asking the assistant a question.
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-${msg.sender === 'user' ? 'right' : 'left'}-4 duration-500`}>
                                    <div className={`max-w-[85%] lg:max-w-[75%] rounded-xl p-3 sm:p-4 ${msg.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-900/30 font-medium'
                                        : 'bg-white/[0.03] text-gray-200 rounded-tl-none border border-white/5 shadow-sm leading-relaxed text-xs'
                                    }`}>
                                        <div className="whitespace-pre-wrap text-[10px] sm:text-xs">{msg.text}</div>
                                        <div className={`mt-2 text-[8px] font-bold uppercase tracking-wider ${msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400'} pt-2 border-t border-white/5`}>
                                            {msg.sender === 'user' ? 'User' : 'AI Assistant'} • {msg.timestamp}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {isAITyping && (
                            <div className="flex justify-start animate-pulse">
                                <div className="rounded-xl rounded-tl-none border border-white/5 bg-white/[0.03] p-3 text-[9px] font-bold uppercase tracking-widest italic text-gray-500">
                                    Analyzing cognitive stream...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-3 sm:p-4 border-t border-white/10 bg-navy-950/70">
                        <div className="relative flex items-end gap-2">
                            <div className="flex-1 overflow-hidden transition-all border rounded-lg border-white/10 bg-slate-950/80 focus-within:ring-1 focus-within:ring-sky-500/40">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Type your message..."
                                    className="w-full px-3 py-2 text-[10px] sm:text-xs text-white placeholder-gray-500 bg-transparent resize-none focus:outline-none"
                                    rows="1"
                                />
                            </div>
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim()}
                                className="px-3 py-2 text-white transition-all bg-blue-600 shadow-md rounded-lg shadow-blue-900/40 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                            </button>
                        </div>
                        <p className="mt-2 text-center text-[8px] uppercase tracking-widest text-gray-400 font-semibold">
                            Shift + Enter to add a new line
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentAIAssistant;
