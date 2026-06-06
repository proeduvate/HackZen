import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCriteria, saveCriteria, resetCriteria } from '../../services/organizer/evaluationApi';

const EvaluationCriteria = () => {
    const navigate = useNavigate();
    const [criteria, setCriteria] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        const loadCriteria = async () => {
            setIsLoading(true);
            try {
                const data = await fetchCriteria();
                setCriteria(data);
            } catch (error) {
                console.error("Failed to load criteria:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadCriteria();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveCriteria(criteria);
            // Show success (perhaps a toast or simple alert in this case)
            alert("Evaluation criteria saved successfully!");
        } catch (error) {
            console.error("Failed to save criteria:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm("Are you sure you want to reset all criteria to defaults? This will erase your custom settings.")) return;
        
        setIsResetting(true);
        try {
            const data = await resetCriteria();
            setCriteria(data);
        } catch (error) {
            console.error("Failed to reset criteria:", error);
        } finally {
            setIsResetting(false);
        }
    };

    const handleUpdate = (id, field, value) => {
        setCriteria(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleRemove = (id) => {
        setCriteria(prev => prev.filter(c => c.id !== id));
    };

    const handleAdd = () => {
        const newId = `criteria_${Date.now()}`;
        setCriteria(prev => [
            ...prev,
            {
                id: newId,
                label: 'New Criterion',
                description: 'Description of what judges should look for.',
                weight: 10,
                minScore: 0,
                maxScore: 10
            }
        ]);
    };

    // --- Icons Component ---
    const Icon = ({ name, className }) => {
        const icons = {
            ArrowLeft: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />,
            Plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
            Trash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
            Save: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />,
            Refresh: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
            Info: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        };
        return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                {icons[name]}
            </svg>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-full flex flex-col pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => navigate('/organizer/evaluation')}
                        className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all active:scale-95 group"
                    >
                        <Icon name="ArrowLeft" className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
                    </button>
                    <div>
                        <h1 className="title-primary">Criteria Settings</h1>
                        <p className="description-primary">Fine-tune the scoring matrix for your hackathon judges.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleReset}
                        disabled={isResetting || isLoading}
                        className="flex items-center gap-2 px-5 py-3 glass-strong border border-white/10 hover:bg-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Icon name="Refresh" className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
                        Restore Defaults
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : <Icon name="Save" className="w-4 h-4" />}
                        Commit Changes
                    </button>
                </div>
            </div>

            {/* Matrix Management Section */}
            <div className="flex-1 max-w-5xl mx-auto w-full">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Synchronizing Matrix...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-2">
                            <h2 className="section-header-panel border-blue-500">
                                Scoring Components
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20 tracking-normal font-black">
                                    {criteria.length}
                                </span>
                            </h2>
                            <button 
                                onClick={handleAdd}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-emerald-500/5"
                            >
                                <Icon name="Plus" className="w-3.5 h-3.5" />
                                Increment Matrix
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {criteria.map((c, index) => (
                                <div 
                                    key={c.id} 
                                    className="glass-strong border border-white/5 rounded-[2.5rem] p-8 group hover:border-blue-500/30 transition-all duration-500 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    <div className="flex flex-col md:flex-row gap-8">
                                        {/* Left Side: Inputs */}
                                        <div className="flex-1 space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Criterion Label</label>
                                                <input 
                                                    type="text" 
                                                    value={c.label} 
                                                    onChange={(e) => handleUpdate(c.id, 'label', e.target.value)}
                                                    className="w-full bg-navy-900/50 border border-white/10 rounded-2xl px-5 py-3 text-white font-bold placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all text-lg tracking-tight"
                                                    placeholder="e.g., Technical Depth"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Evaluation Guidance (Description)</label>
                                                <textarea 
                                                    value={c.description} 
                                                    onChange={(e) => handleUpdate(c.id, 'description', e.target.value)}
                                                    className="w-full bg-navy-900/50 border border-white/10 rounded-2xl px-5 py-4 text-gray-400 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all resize-none h-24 font-medium"
                                                    placeholder="What should judges focus on for this point?"
                                                />
                                            </div>
                                        </div>

                                        {/* Right Side: Parameters & Actions */}
                                        <div className="w-full md:w-64 space-y-6 pt-1">
                                            <div className="flex flex-col gap-6 p-6 rounded-3xl bg-white/[0.02] border border-white/5 shadow-inner">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Max Score</label>
                                                        <span className="text-xl font-black text-white italic">{c.maxScore} pts</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="1" 
                                                        max="100" 
                                                        value={c.maxScore} 
                                                        onChange={(e) => handleUpdate(c.id, 'maxScore', parseInt(e.target.value))}
                                                        className="w-full h-1.5 bg-navy-950 rounded-full appearance-none cursor-pointer accent-blue-500"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Weight (%)</label>
                                                        <span className="text-lg font-black text-white">{c.weight}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="0" 
                                                        max="100" 
                                                        value={c.weight} 
                                                        onChange={(e) => handleUpdate(c.id, 'weight', parseInt(e.target.value))}
                                                        className="w-full h-1.5 bg-navy-950 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-3 mt-4">
                                                <button 
                                                    onClick={() => handleRemove(c.id)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                                >
                                                    <Icon name="Trash" className="w-3.5 h-3.5" />
                                                    Eradicate
                                                </button>
                                                <div className="flex items-center justify-center p-3 bg-white/5 border border-white/5 rounded-2xl text-gray-500">
                                                    <Icon name="Info" className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Number Badge */}
                                    <div className="absolute -bottom-4 right-10 text-8xl font-black text-white/5 select-none pointer-events-none italic">
                                        #{index + 1}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {criteria.length === 0 && (
                            <div className="text-center py-20 glass rounded-[3rem] border border-dashed border-white/10">
                                <Icon name="Plus" className="w-16 h-16 text-gray-700 mx-auto mb-6 opacity-20" />
                                <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-2">Matrix Empty</h3>
                                <p className="text-gray-500 text-sm font-medium uppercase tracking-tighter max-w-xs mx-auto mb-8">You haven't defined any evaluation criteria yet. Judges won't be able to score anything.</p>
                                <button 
                                    onClick={handleAdd}
                                    className="px-10 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                                >
                                    Initialize Matrix
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Action Bar (Sticky relative to page) */}
            <div className="sticky bottom-4 mx-auto w-full max-w-lg glass-strong border border-white/10 rounded-full p-2 flex items-center justify-between gap-4 shadow-2xl backdrop-blur-2xl z-50">
                <div className="px-6">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Weight</span>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-black ${criteria.reduce((a, b) => a + b.weight, 0) === 100 ? 'text-emerald-400' : 'text-amber-500'}`}>
                            {criteria.reduce((a, b) => a + b.weight, 0)}%
                        </span>
                        <span className="text-[9px] text-gray-600 font-bold">/ 100%</span>
                    </div>
                </div>
                <button 
                   onClick={handleSave}
                   className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap"
                >
                    Save Matrix
                </button>
            </div>
        </div>
    );
};

export default EvaluationCriteria;
