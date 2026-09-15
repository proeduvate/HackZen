import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    buildUserMessage,
    clearConversationMemory,
    extractErrorMessage,
    fetchAvailableDatasets,
    fetchConversationHistory,
    fetchQuickStarters,
    loadOrCreateSessionId,
    saveSessionId,
    sendChatMessage,
} from '../../services/student/aiAssistantApi';

const getDefaultObjective = () => 'Ideation';

const StudentAIAssistant = () => {
    const [datasets, setDatasets] = useState([]);
    const [selectedHackathonId, setSelectedHackathonId] = useState('hackathon_1');
    const [selectedObjective, setSelectedObjective] = useState(getDefaultObjective());
    const [messages, setMessages] = useState([]);
    const [quickStarters, setQuickStarters] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAITyping, setIsAITyping] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [lastUpdated, setLastUpdated] = useState('');
    const bottomRef = useRef(null);

    const selectedDataset = useMemo(
        () => datasets.find((dataset) => dataset.hackathon_id === selectedHackathonId) || datasets[0] || null,
        [datasets, selectedHackathonId]
    );

    useEffect(() => {
        const loadBootstrapData = async () => {
            setIsLoading(true);
            try {
                const [datasetList, starters] = await Promise.all([
                    fetchAvailableDatasets(),
                    fetchQuickStarters(),
                ]);
                setDatasets(datasetList);
                setQuickStarters(starters);
                const persistedHackathonId =
                    localStorage.getItem('hackathon-ai-selected-hackathon') || datasetList[0]?.hackathon_id || 'hackathon_1';
                setSelectedHackathonId(persistedHackathonId);
            } catch (error) {
                console.error('Failed to load AI bootstrap data:', error);
                setErrorMessage('Unable to load assistant resources right now.');
                setDatasets([]);
                setQuickStarters(await fetchQuickStarters());
                setSelectedHackathonId('hackathon_1');
            } finally {
                setIsLoading(false);
            }
        };

        loadBootstrapData();
    }, []);

    useEffect(() => {
        if (!selectedHackathonId) {
            return;
        }

        let active = true;

        const loadSessionHistory = async () => {
            setIsLoading(true);
            setErrorMessage('');
            const storedSessionId = loadOrCreateSessionId(selectedHackathonId);
            setSessionId(storedSessionId);
            saveSessionId(selectedHackathonId, storedSessionId);
            localStorage.setItem('hackathon-ai-selected-hackathon', selectedHackathonId);

            try {
                const history = await fetchConversationHistory(storedSessionId);
                if (!active) {
                    return;
                }
                setMessages(history);
            } catch (error) {
                if (!active) {
                    return;
                }
                console.error('Failed to load conversation history:', error);
                setMessages([]);
                setErrorMessage('Conversation history could not be loaded.');
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };

        loadSessionHistory();

        return () => {
            active = false;
        };
    }, [selectedHackathonId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, isAITyping]);

    const handleSendMessage = async () => {
        const trimmed = inputValue.trim();
        if (!trimmed || isAITyping || !selectedHackathonId) {
            return;
        }

        const currentSessionId = sessionId || loadOrCreateSessionId(selectedHackathonId);
        if (!sessionId) {
            setSessionId(currentSessionId);
        }

        const userMessage = buildUserMessage(trimmed);
        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsAITyping(true);
        setErrorMessage('');

        try {
            const aiMessage = await sendChatMessage({
                sessionId: currentSessionId,
                hackathonId: selectedHackathonId,
                message: trimmed,
                objective: selectedObjective,
            });

            setMessages((prev) => [...prev, aiMessage]);
            setLastUpdated(aiMessage.timestamp);
            saveSessionId(selectedHackathonId, currentSessionId);
        } catch (error) {
            console.error('AI Assistant error:', error);
            const friendlyError = extractErrorMessage(error);
            setErrorMessage(friendlyError);
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    sender: 'ai',
                    text: `I couldn’t reach the assistant just now. ${friendlyError}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    sources: [],
                    isError: true,
                },
            ]);
        } finally {
            setIsAITyping(false);
        }
    };

    const handleClearMemory = async () => {
        if (!selectedHackathonId || !sessionId) {
            return;
        }

        setIsLoading(true);
        try {
            await clearConversationMemory(sessionId);
            setMessages([]);
            setErrorMessage('');
            const freshSessionId = loadOrCreateSessionId(selectedHackathonId);
            setSessionId(freshSessionId);
            saveSessionId(selectedHackathonId, freshSessionId);
        } catch (error) {
            console.error('Failed to clear memory:', error);
            setErrorMessage(extractErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    const handleHackathonChange = (event) => {
        const nextHackathonId = event.target.value;
        setSelectedHackathonId(nextHackathonId);
        setMessages([]);
        setErrorMessage('');
        setLastUpdated('');
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500 min-h-[calc(100vh-14rem)] max-w-6xl mx-auto px-4 md:px-0 py-8">
            <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white md:text-4xl">
                            AI Assistant <span className="gradient-text">Workspace</span>
                        </h1>
                        <p className="max-w-2xl mt-3 text-gray-400">
                            Ask for guidance, not shortcuts. The assistant uses your selected hackathon context and responds with hints, questions, and reasoning.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wider text-slate-300">
                        <span className="px-4 py-2 border rounded-full border-white/10 bg-white/5">
                            Session: {sessionId ? sessionId.slice(0, 8) : 'loading'}
                        </span>
                        <span className="px-4 py-2 border rounded-full border-white/10 bg-white/5">
                            Memory: {messages.length} turns
                        </span>
                        {lastUpdated ? (
                            <span className="px-4 py-2 border rounded-full border-white/10 bg-white/5">
                                Updated: {lastUpdated}
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-stretch h-full">
                <div className="flex flex-col h-full gap-8">
                    <div className="glass rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-lg font-bold text-white">Operational Context</h2>
                            <span className="text-xs tracking-widest uppercase text-slate-400">Live</span>
                        </div>
                        <div className="mt-6 space-y-6 overflow-y-auto max-h-[32vh] custom-scrollbar">
                            <div className="space-y-3">
                                <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Hackathon Dataset</label>
                                <select
                                    className="w-full px-5 py-4 text-xs font-semibold text-white border shadow-xl outline-none rounded-2xl border-white/10 bg-navy-950/80 focus:ring-1 focus:ring-purple-500/50"
                                    value={selectedHackathonId}
                                    onChange={handleHackathonChange}
                                >
                                    {datasets.map((dataset) => (
                                        <option key={dataset.hackathon_id} value={dataset.hackathon_id}>
                                            {dataset.label || dataset.file_name || dataset.hackathon_id}
                                        </option>
                                    ))}
                                    {datasets.length === 0 ? (
                                        <option value="hackathon_1">hackathon_1</option>
                                    ) : null}
                                </select>
                                <p className="text-xs text-slate-400">
                                    {selectedDataset
                                        ? `${selectedDataset.file_name} · ${selectedDataset.chunk_count} chunks`
                                        : 'No dataset loaded yet.'}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Conversation Mode</label>
                                <select
                                    className="w-full px-5 py-4 text-xs font-semibold text-white border shadow-xl outline-none rounded-2xl border-white/10 bg-navy-950/80 focus:ring-1 focus:ring-purple-500/50"
                                    value={selectedObjective}
                                    onChange={(e) => setSelectedObjective(e.target.value)}
                                >
                                    <option value="Ideation">Ideation</option>
                                    <option value="Planning">Planning</option>
                                    <option value="Coding">Coding</option>
                                    <option value="Pitching">Pitching</option>
                                    <option value="Debugging">Debugging</option>
                                </select>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleClearMemory}
                                    disabled={!sessionId || isAITyping}
                                    className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-white transition border rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Clear Memory
                                </button>
                                <button
                                    onClick={async () => {
                                        const refreshed = await fetchAvailableDatasets();
                                        setDatasets(refreshed);
                                    }}
                                    className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-white transition border rounded-2xl border-white/10 bg-white/5 hover:bg-white/10"
                                >
                                    Refresh Datasets
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="glass flex min-h-0 flex-col rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl max-h-[35vh]">
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-lg font-bold text-white">Macro Triggers</h2>
                            <span className="text-xs tracking-widest uppercase text-slate-400">Quick start</span>
                        </div>
                        <div className="flex-1 min-h-0 mt-6 space-y-3 overflow-y-auto custom-scrollbar">
                            {quickStarters.map((starter) => (
                                <button
                                    key={starter.id}
                                    onClick={() => setInputValue(starter.text)}
                                    className="w-full px-6 py-5 text-left transition border rounded-3xl border-white/10 bg-white/5 hover:border-purple-500/30 hover:bg-white/10"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="text-sm leading-relaxed text-slate-300">"{starter.text}"</p>
                                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path>
                                        </svg>
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
                            Socratic mode is active. The assistant will guide you with questions, reasoning, and hints.
                        </div>

                        {errorMessage ? (
                            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                                {errorMessage}
                            </div>
                        ) : null}

                        {isLoading && messages.length === 0 ? (
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center text-gray-400">
                                Loading your hackathon context and session history...
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center text-gray-400">
                                Start the conversation by asking a question about your hackathon idea, architecture, pitch, or implementation plan.
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-${msg.sender === 'user' ? 'right' : 'left'}-4 duration-500`}
                                >
                                    <div
                                        className={`max-w-[85%] lg:max-w-[70%] rounded-[2rem] p-8 ${
                                            msg.sender === 'user'
                                                ? 'bg-purple-600 text-white rounded-tr-none shadow-2xl shadow-purple-900/30 font-medium'
                                                : msg.isError
                                                    ? 'bg-red-500/10 text-red-100 rounded-tl-none border border-red-500/20 shadow-xl leading-relaxed text-sm'
                                                    : 'bg-white/[0.03] text-gray-200 rounded-tl-none border border-white/5 shadow-xl leading-relaxed text-sm'
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap">{msg.text}</div>
                                        {msg.sender === 'ai' && Array.isArray(msg.sources) && msg.sources.length > 0 ? (
                                            <div className="mt-6 space-y-2">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sources</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {msg.sources.map((source) => (
                                                        <span
                                                            key={`${source.file_name}-${source.chunk_id}`}
                                                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-300"
                                                        >
                                                            {source.file_name} · {source.chunk_id}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                        <div
                                            className={`mt-6 text-[10px] font-bold uppercase tracking-wider ${
                                                msg.sender === 'user' ? 'text-purple-200' : 'text-gray-400'
                                            } pt-4 border-t border-white/5`}
                                        >
                                            {msg.sender === 'user' ? 'User' : 'AI Assistant'} • {msg.timestamp}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {isAITyping && (
                            <div className="flex justify-start animate-pulse">
                                <div className="rounded-[2rem] rounded-tl-none border border-white/5 bg-white/[0.03] p-6 text-xs font-bold uppercase tracking-widest italic text-gray-500">
                                    Thinking through the next Socratic step...
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
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
                                    placeholder="Ask about your hackathon idea, architecture, or next step..."
                                    className="w-full px-6 py-5 text-sm text-white placeholder-gray-500 bg-transparent resize-none focus:outline-none"
                                    rows="1"
                                />
                            </div>
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isAITyping}
                                className="px-5 py-4 text-white transition-all bg-purple-600 shadow-2xl rounded-2xl shadow-purple-900/40 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                </svg>
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

