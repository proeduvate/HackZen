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
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500 min-h-[calc(100vh-14rem)] max-w-6xl mx-auto px-4 md:px-0 py-8">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-white md:text-4xl">
                        AI Assistant <span className="gradient-text">Workspace</span>
                    </h1>
                    <p className="max-w-2xl mt-3 text-gray-400">
                        Use the assistant to generate hackathon ideas, sharpen your pitch, coordinate your team, and finalize your submission faster.
                    </p>
                </div>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-stretch h-full">
                <div className="flex flex-col h-full gap-8">
                    <div className="glass rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-lg font-bold text-white">Operational Context</h2>
                            <span className="text-xs tracking-widest uppercase text-slate-400">Config</span>
                        </div>
                        <div className="mt-6 space-y-6 overflow-y-auto max-h-[32vh] custom-scrollbar">
                            <div className="space-y-3">
                                <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Event Repository</label>
                                <select
                                    className="w-full px-5 py-4 text-xs font-semibold text-white border shadow-xl outline-none rounded-2xl border-white/10 bg-navy-950/80 focus:ring-1 focus:ring-purple-500/50"
                                    value={selectedContext}
                                    onChange={(e) => setSelectedContext(e.target.value)}
                                >
                                    <option value="Global Connect 2025">Global Connect 2025</option>
                                    <option value="CyberSecurity Sprint">CyberSecurity Sprint</option>
                                    <option value="Green Tech Challenge">Green Tech Challenge</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Logic Objective</label>
                                <select
                                    className="w-full px-5 py-4 text-xs font-semibold text-white border shadow-xl outline-none rounded-2xl border-white/10 bg-navy-950/80 focus:ring-1 focus:ring-purple-500/50"
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

                        <div className="glass flex min-h-0 flex-col rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl max-h-[35vh]">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-lg font-bold text-white">Macro Triggers</h2>
                            <span className="text-xs tracking-widest uppercase text-slate-400">Quick start</span>
                        </div>
                        <div className="flex-1 min-h-0 mt-6 space-y-3 overflow-y-auto custom-scrollbar">
                            {quickStarters.map(starter => (
                                <button
                                    key={starter.id}
                                    onClick={() => setInputValue(starter.text)}
                                    className="w-full px-6 py-5 text-left transition border rounded-3xl border-white/10 bg-white/5 hover:border-purple-500/30 hover:bg-white/10"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="text-sm leading-relaxed text-slate-300">"{starter.text}"</p>
                                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="glass flex flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 shadow-2xl max-h-[70vh]">
                    <div className="flex-1 min-h-0 p-8 space-y-8 overflow-y-auto custom-scrollbar bg-navy-900/40">
                        <div className="flex items-center gap-4 px-4 py-3 text-xs text-gray-400 border rounded-2xl border-white/10 bg-white/5">
                            <span className="text-xl">ℹ️</span>
                            Heuristic analysis active. Suggestions are non-binding.
                        </div>

                        {messages.length === 0 && !isLoading ? (
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center text-gray-400">
                                Start the conversation by asking the assistant a question.
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-${msg.sender === 'user' ? 'right' : 'left'}-4 duration-500`}>
                                    <div className={`max-w-[85%] lg:max-w-[70%] rounded-[2rem] p-8 ${msg.sender === 'user'
                                        ? 'bg-purple-600 text-white rounded-tr-none shadow-2xl shadow-purple-900/30 font-medium'
                                        : 'bg-white/[0.03] text-gray-200 rounded-tl-none border border-white/5 shadow-xl leading-relaxed text-sm'
                                    }`}>
                                        <div className="whitespace-pre-wrap">{msg.text}</div>
                                        <div className={`mt-6 text-[10px] font-bold uppercase tracking-wider ${msg.sender === 'user' ? 'text-purple-200' : 'text-gray-400'} pt-4 border-t border-white/5`}>
                                            {msg.sender === 'user' ? 'User' : 'AI Assistant'} • {msg.timestamp}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {isAITyping && (
                            <div className="flex justify-start animate-pulse">
                                <div className="rounded-[2rem] rounded-tl-none border border-white/5 bg-white/[0.03] p-6 text-xs font-bold uppercase tracking-widest italic text-gray-500">
                                    Analyzing cognitive stream...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-white/10 bg-navy-950/70">
                        <div className="relative flex items-end gap-4">
                            <div className="flex-1 overflow-hidden transition-all border rounded-2xl border-white/10 bg-slate-950/80 focus-within:ring-1 focus-within:ring-sky-500/40">
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
                                    className="w-full px-6 py-5 text-sm text-white placeholder-gray-500 bg-transparent resize-none focus:outline-none"
                                    rows="1"
                                />
                            </div>
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim()}
                                className="px-5 py-4 text-white transition-all bg-purple-600 shadow-2xl rounded-2xl shadow-purple-900/40 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                            </button>
                        </div>
                        <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                            Shift + Enter to add a new line
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentAIAssistant;
