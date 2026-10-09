import React, { useState, useEffect, useRef } from 'react';
import { fetchInitialMessages, fetchQuickStarters, sendChatMessage } from '../../services/student/aiAssistantApi';
import { fetchAllHackathons } from '../../api/hackathonApi';

const CodeBlock = ({ language, code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-black/40 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2 font-mono text-[11px] text-gray-400">
                <span className="uppercase tracking-wider font-semibold text-purple-300">{language || 'code'}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                    {copied ? (
                        <>
                            <span className="text-emerald-400">✓</span>
                            <span className="text-emerald-400 font-semibold">Copied!</span>
                        </>
                    ) : (
                        <>
                            <span>📋</span>
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-200">
                <code>{code}</code>
            </pre>
        </div>
    );
};

const FormattedMessage = ({ content }) => {
    if (!content) return null;

    // Split text by code fence ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                value: content.slice(lastIndex, match.index)
            });
        }
        parts.push({
            type: 'code',
            language: match[1] || 'text',
            value: match[2].trim()
        });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
        parts.push({
            type: 'text',
            value: content.slice(lastIndex)
        });
    }

    return (
        <div className="space-y-2 text-sm leading-relaxed">
            {parts.map((part, index) => {
                if (part.type === 'code') {
                    return <CodeBlock key={index} language={part.language} code={part.value} />;
                }

                // Render paragraphs and formatted inline text
                const lines = part.value.split('\n');
                return (
                    <div key={index} className="space-y-1.5">
                        {lines.map((line, lIdx) => {
                            if (!line.trim()) return <div key={lIdx} className="h-2" />;

                            // Heading
                            if (line.startsWith('### ')) {
                                return (
                                    <h4 key={lIdx} className="font-bold text-white text-base mt-2 mb-1">
                                        {line.replace('### ', '')}
                                    </h4>
                                );
                            }
                            if (line.startsWith('## ')) {
                                return (
                                    <h3 key={lIdx} className="font-bold text-purple-300 text-lg mt-3 mb-1">
                                        {line.replace('## ', '')}
                                    </h3>
                                );
                            }

                            // Bullet point
                            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                                const bulletContent = line.trim().replace(/^[-*]\s+/, '');
                                return (
                                    <div key={lIdx} className="flex items-start gap-2 text-slate-300 pl-2">
                                        <span className="text-purple-400 font-bold">•</span>
                                        <span>{renderInlineStyles(bulletContent)}</span>
                                    </div>
                                );
                            }

                            return (
                                <p key={lIdx} className="text-slate-200">
                                    {renderInlineStyles(line)}
                                </p>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

// Helper for inline bold and code
const renderInlineStyles = (text) => {
    const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
    const segments = text.split(inlineRegex);

    return segments.map((seg, i) => {
        if (seg.startsWith('`') && seg.endsWith('`')) {
            return (
                <code key={i} className="mx-1 rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs text-sky-300 border border-white/10">
                    {seg.slice(1, -1)}
                </code>
            );
        }
        if (seg.startsWith('**') && seg.endsWith('**')) {
            return <strong key={i} className="font-semibold text-white">{seg.slice(2, -2)}</strong>;
        }
        return seg;
    });
};

const StudentAIAssistant = () => {
    const [hackathons, setHackathons] = useState([]);
    const [selectedContext, setSelectedContext] = useState('');
    const [selectedObjective, setSelectedObjective] = useState('Theme understanding');
    const [messages, setMessages] = useState([]);
    const [quickStarters, setQuickStarters] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isAITyping, setIsAITyping] = useState(false);
    const [notice, setNotice] = useState(null);

    const chatScrollRef = useRef(null);

    // Resolve studentId for sessionStorage persistence (STU-29)
    const cachedUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const studentId = cachedUser._id || cachedUser.id || cachedUser.sub || 'student';
    const storageKey = `ai_chat_${studentId}`;

    // Auto-scroll chat on message updates
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [messages, isAITyping]);

    // Load initial data and restore from sessionStorage
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [triggers, events] = await Promise.all([
                    fetchQuickStarters().catch(() => []),
                    fetchAllHackathons().catch(() => []),
                ]);

                setQuickStarters(triggers);
                setHackathons(events);
                if (events.length > 0) {
                    setSelectedContext(events[0].id || events[0]._id || '');
                }

                // Check sessionStorage first (STU-29)
                const savedHistory = sessionStorage.getItem(storageKey);
                if (savedHistory) {
                    try {
                        const parsed = JSON.parse(savedHistory);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setMessages(parsed);
                            setIsLoading(false);
                            return;
                        }
                    } catch (parseErr) {
                        console.warn('Failed to parse saved chat history:', parseErr);
                    }
                }

                // Otherwise fetch from server logs
                const initialMsgs = await fetchInitialMessages().catch(() => []);
                if (initialMsgs.length > 0) {
                    setMessages(initialMsgs);
                } else {
                    setMessages([
                        {
                            id: 'welcome',
                            sender: 'ai',
                            text: "👋 **Welcome to your AI Co-Mentor!**\n\nI can help you:\n- **Understand hackathon themes** and problem statements.\n- **Brainstorm novel ideas** and explore tech stacks.\n- **Architect your project** and plan milestones.\n\nSelect your hackathon and ask me anything!",
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                    ]);
                }
            } catch (error) {
                console.error('Failed to load initial AI assistant state:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, [storageKey]);

    // Persist messages in sessionStorage (max 50 messages)
    useEffect(() => {
        if (messages.length > 0) {
            try {
                sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)));
            } catch (err) {
                console.warn('Could not save to sessionStorage:', err);
            }
        }
    }, [messages, storageKey]);

    const handleClearChat = () => {
        sessionStorage.removeItem(storageKey);
        setMessages([
            {
                id: 'welcome_reset',
                sender: 'ai',
                text: "✨ Conversation cleared. What hackathon topic would you like to explore next?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ]);
        setNotice('Conversation history cleared.');
        setTimeout(() => setNotice(null), 3000);
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isAITyping) return;

        const textToSend = inputValue.trim();
        const userMsg = {
            id: Date.now(),
            sender: 'user',
            text: textToSend,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsAITyping(true);

        try {
            const aiResponse = await sendChatMessage(
                textToSend,
                selectedContext || 'general',
                selectedObjective
            );
            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error('AI Assistant error:', error);
            const fallbackMsg = {
                id: Date.now() + 1,
                sender: 'ai',
                text: `💡 **Mentorship Guidance on: "${textToSend.slice(0, 50)}..."**\n\n1. **Define Core MVP:** Focus strictly on completing the primary user flow before polishing secondary features.\n2. **Tech Stack Advice:** Keep your architecture modular and choose frameworks your team knows well.\n3. **Judge Pitch:** Ensure you have clear metrics on the problem solved.\n\n*(Notice: Live LLM service connection encountered a momentary hiccup. Provided offline architectural heuristic.)*`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, fallbackMsg]);
        } finally {
            setIsAITyping(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500 min-h-[calc(100vh-14rem)] max-w-6xl mx-auto px-4 md:px-0 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white md:text-4xl">
                        AI Assistant <span className="gradient-text">Workspace</span>
                    </h1>
                    <p className="max-w-2xl mt-2 text-gray-400 text-sm">
                        Brainstorm ideas, analyze tracks, explore tech architectures, and plan your project with your AI Co-Mentor.
                    </p>
                </div>
                {messages.length > 1 && (
                    <button
                        onClick={handleClearChat}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-semibold border border-white/10 transition-colors flex items-center gap-2"
                        title="Clear conversation history from sessionStorage"
                    >
                        <span>🗑️</span>
                        <span>Clear Chat</span>
                    </button>
                )}
            </div>

            {notice && (
                <div className="mt-4 p-3 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-200 text-xs font-semibold animate-in fade-in">
                    {notice}
                </div>
            )}

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-stretch h-full">
                {/* Left panel: Context & Triggers */}
                <div className="flex flex-col h-full gap-6">
                    <div className="glass rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl">
                        <div className="flex items-center justify-between gap-4 mb-5">
                            <h2 className="text-base font-bold text-white">Operational Context</h2>
                            <span className="text-[10px] tracking-widest uppercase text-slate-400 font-mono">Config</span>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">Event Context</label>
                                <select
                                    className="w-full px-4 py-3 text-xs font-semibold text-white border shadow-xl outline-none rounded-xl border-white/10 bg-navy-950/80 focus:border-purple-500/50"
                                    value={selectedContext}
                                    onChange={(e) => setSelectedContext(e.target.value)}
                                >
                                    <option value="general">General Mentorship (All Tracks)</option>
                                    {hackathons.map(hackathon => (
                                        <option key={hackathon.id || hackathon._id} value={hackathon.id || hackathon._id}>
                                            {hackathon.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">Focus Objective</label>
                                <select
                                    className="w-full px-4 py-3 text-xs font-semibold text-white border shadow-xl outline-none rounded-xl border-white/10 bg-navy-950/80 focus:border-purple-500/50"
                                    value={selectedObjective}
                                    onChange={(e) => setSelectedObjective(e.target.value)}
                                >
                                    <option value="Theme understanding">Theme Understanding</option>
                                    <option value="Pain-point discovery">Pain-point Discovery</option>
                                    <option value="Idea development">Idea Development</option>
                                    <option value="Project structure and approach">Architecture & Tech Stack</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="glass flex min-h-0 flex-col rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <h2 className="text-base font-bold text-white">Quick Prompts</h2>
                            <span className="text-[10px] tracking-widest uppercase text-slate-400 font-mono">Suggestions</span>
                        </div>
                        <div className="space-y-2.5 overflow-y-auto max-h-[35vh] custom-scrollbar">
                            {quickStarters.map(starter => (
                                <button
                                    key={starter.id}
                                    onClick={() => setInputValue(starter.text)}
                                    className="w-full px-4 py-3 text-left transition border rounded-2xl border-white/10 bg-white/5 hover:border-purple-500/30 hover:bg-white/10 group"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs leading-relaxed text-slate-300 group-hover:text-white">"{starter.text}"</p>
                                        <span className="text-purple-400 text-xs">→</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right panel: Chat messages */}
                <div className="glass flex flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl h-[72vh]">
                    {/* Message stream */}
                    <div ref={chatScrollRef} className="flex-1 min-h-0 p-6 space-y-6 overflow-y-auto custom-scrollbar bg-navy-900/40">
                        <div className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-400 border rounded-xl border-white/10 bg-white/5">
                            <span className="text-base">ℹ️</span>
                            <span>AI guidance is intended to assist your ideation, research, and architecture. Code snippets can be copied directly.</span>
                        </div>

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}
                            >
                                <div
                                    className={`max-w-[90%] lg:max-w-[80%] rounded-2xl p-6 ${
                                        msg.sender === 'user'
                                            ? 'bg-purple-600 text-white rounded-tr-none shadow-xl shadow-purple-900/30 font-medium'
                                            : 'bg-navy-950/90 text-gray-200 rounded-tl-none border border-white/10 shadow-xl'
                                    }`}
                                >
                                    {msg.sender === 'user' ? (
                                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                                    ) : (
                                        <FormattedMessage content={msg.text} />
                                    )}
                                    <div className={`mt-4 text-[10px] font-bold uppercase tracking-wider ${
                                        msg.sender === 'user' ? 'text-purple-200' : 'text-gray-400'
                                    } pt-3 border-t border-white/5 flex justify-between items-center`}>
                                        <span>{msg.sender === 'user' ? 'You' : 'AI Co-Mentor'}</span>
                                        <span>{msg.timestamp}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isAITyping && (
                            <div className="flex justify-start animate-pulse">
                                <div className="rounded-2xl rounded-tl-none border border-white/10 bg-navy-950/80 px-5 py-4 text-xs font-semibold text-purple-300 flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                                    <span>AI Co-Mentor is thinking and formulating guidance...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat input footer */}
                    <div className="p-4 border-t border-white/10 bg-navy-950/80">
                        <div className="relative flex items-end gap-3">
                            <div className="flex-1 overflow-hidden transition-all border rounded-xl border-white/10 bg-slate-950/80 focus-within:border-purple-500/50">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Ask about problem statement, ideas, architecture, or code..."
                                    className="w-full px-4 py-3.5 text-sm text-white placeholder-gray-500 bg-transparent resize-none focus:outline-none"
                                    rows="2"
                                />
                            </div>
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isAITyping}
                                className="px-5 py-3.5 text-white transition-all bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-900/40 rounded-xl hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0 flex items-center gap-2 font-semibold text-xs"
                            >
                                <span>Send</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                            </button>
                        </div>
                        <div className="mt-2.5 flex justify-between items-center text-[10px] text-gray-400">
                            <span>Press <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-gray-300">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-gray-300">Shift + Enter</kbd> for newline</span>
                            <span>Stored locally for this session</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentAIAssistant;
