import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTimeline, updateTimeline } from '../../services/organizer/timelineApi';

const EditTimeline = () => {
    const { hackathonId } = useParams();
    const navigate = useNavigate();

    // --- State Management ---
    const [hackathon, setHackathon] = useState(null);
    const [phases, setPhases] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    // --- Helper: Format Date for Input ---
    const formatDateForInput = (dateString) => {
        if (!dateString || dateString === 'TBD') return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        // Format to YYYY-MM-DDTHH:MM
        return date.toISOString().slice(0, 16);
    };

    // --- Helper: Calculate Status ---
    const calculateStatus = (startDate, endDate) => {
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Upcoming';

        if (now < start) return 'Upcoming';
        if (now >= start && now <= end) return 'Ongoing';
        return 'Completed';
    };

    // --- Initial Data Fetch ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await fetchTimeline(hackathonId);
                
                setHackathon({
                    id: data.hackathon._id,
                    title: data.hackathon.title,
                    mode: data.hackathon.mode || 'Remote',
                    registrations: data.hackathon.participantCount || 0,
                    status: data.hackathon.status,
                    startDate: data.hackathon.startDate,
                    endDate: data.hackathon.endDate,
                    banner: data.hackathon.bannerImage || "https://images.unsplash.com/photo-1504384308090-c54be3852f33?auto=format&fit=crop&q=80&w=1000"
                });

                // If no timeline exists, auto-generate default phases as fallbacks
                if (!data.phases || data.phases.length === 0) {
                    setPhases([
                        { id: 'p1', name: 'Registration Period', startDate: data.hackathon.startDate, endDate: data.hackathon.endDate, isDefault: true },
                        { id: 'p2', name: 'Submission Period', startDate: data.hackathon.startDate, endDate: data.hackathon.endDate, isDefault: true }
                    ]);
                } else {
                    setPhases(data.phases.map(p => ({ ...p, id: p._id || p.id })));
                }

            } catch (err) {
                console.error("Failed to fetch timeline data", err);
                setError("Failed to load timeline data. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [hackathonId]);

    // --- Validation Logic ---
    const validatePhases = (currentPhases) => {
        const errors = {};
        let hasErrors = false;

        currentPhases.forEach((phase, index) => {
            if (!phase.startDate || !phase.endDate) {
                errors[phase.id] = "Dates are required";
                hasErrors = true;
                return;
            }
            const start = new Date(phase.startDate);
            const end = new Date(phase.endDate);

            // End date must be after start date
            if (start >= end) {
                errors[phase.id] = "End date must be after start date";
                hasErrors = true;
            }

            // Overlap check (optimized)
            for (let i = 0; i < currentPhases.length; i++) {
                if (i === index) continue;
                const otherPhase = currentPhases[i];
                if (!otherPhase.startDate || !otherPhase.endDate) continue;
                const otherStart = new Date(otherPhase.startDate);
                const otherEnd = new Date(otherPhase.endDate);

                if (start < otherEnd && end > otherStart) {
                    errors[phase.id] = (errors[phase.id] ? errors[phase.id] + ". " : "") + "Phase overlaps with '" + otherPhase.name + "'";
                    hasErrors = true;
                }
            }
        });

        setValidationErrors(errors);
        return !hasErrors;
    };

    // --- Action Handlers ---
    const handleAddPhase = () => {
        const newPhase = {
            id: `custom-${Date.now()}`,
            name: 'New Custom Phase',
            startDate: '',
            endDate: '',
            isDefault: false
        };
        setPhases([...phases, newPhase]);
    };

    const handleDeletePhase = (id) => {
        setPhases(phases.filter(p => p.id !== id));
        const newErrors = { ...validationErrors };
        delete newErrors[id];
        setValidationErrors(newErrors);
    };

    const handleUpdatePhase = (id, field, value) => {
        const updatedPhases = phases.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        );
        setPhases(updatedPhases);

        // Clear errors for this phase when updated
        if (validationErrors[id]) {
            const newErrors = { ...validationErrors };
            delete newErrors[id];
            setValidationErrors(newErrors);
        }
    };

    const handleSave = async () => {
        if (!validatePhases(phases)) return;

        setIsSaving(true);
        try {
            await updateTimeline(hackathonId, phases);
            alert("Timeline updated successfully!");
        } catch (err) {
            console.error("Failed to save timeline", err);
            setError("Failed to save timeline. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        navigate('/organizer/my-hackathons');
    };

    // --- Loading State ---
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 animate-pulse">
                <svg className="w-12 h-12 mb-4 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Loading timeline details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center flex flex-col items-center space-y-4">
                <div className="bg-red-500/20 text-red-300 p-4 rounded-xl border border-red-500/30">
                    {error}
                </div>
                <button onClick={handleBack} className="text-cyan-400 hover:text-cyan-300 font-medium">
                    ← Back to My Hackathons
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Back to My Hackathons
                    </button>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Edit Timeline
                    </h1>
                    <p className="text-gray-400">
                        Manage phases, dates, and milestones for this hackathon
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg ${isSaving
                                ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:shadow-cyan-500/30'
                            }`}
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        )}
                        {isSaving ? 'Saving...' : 'Save Timeline'}
                    </button>
                </div>
            </div>

            {/* Hackathon Summary Card */}
            <div className="glass-strong border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-48 h-28 rounded-xl overflow-hidden shadow-inner">
                    <img src={hackathon?.banner} alt="Hackathon banner" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-3 w-full">
                    <div className="flex justify-between items-start">
                        <h2 className="text-xl font-bold text-white">{hackathon?.title}</h2>
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${hackathon?.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                            {hackathon?.status}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-gray-500">Mode</p>
                            <p className="text-sm font-semibold">{hackathon?.mode}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Registrations</p>
                            <p className="text-sm font-semibold">{hackathon?.registrations}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Starts</p>
                            <p className="text-sm font-semibold">{new Date(hackathon?.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Ends</p>
                            <p className="text-sm font-semibold">{new Date(hackathon?.endDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Management Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </span>
                        Hackathon Phases
                    </h3>
                    <button
                        onClick={handleAddPhase}
                        className="px-4 py-2 text-sm font-bold text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all flex items-center gap-2 border border-cyan-500/20"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Add Phase
                    </button>
                </div>

                <div className="space-y-4">
                    {phases.map((phase) => {
                        const status = calculateStatus(phase.startDate, phase.endDate);
                        return (
                            <div key={phase.id} className={`glass p-5 rounded-2xl border transition-all ${validationErrors[phase.id] ? 'border-red-500/30' : 'border-white/10'
                                }`}>
                                <div className="flex flex-col lg:flex-row gap-6 lg:items-end">
                                    {/* Phase Info */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phase Name</label>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${status === 'Ongoing' ? 'bg-cyan-500/20 text-cyan-400' :
                                                        status === 'Completed' ? 'bg-green-500/20 text-green-400' :
                                                            'bg-yellow-500/20 text-yellow-500'
                                                    }`}>
                                                    {status}
                                                </span>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            value={phase.name}
                                            disabled={phase.isDefault}
                                            onChange={(e) => handleUpdatePhase(phase.id, 'name', e.target.value)}
                                            placeholder="e.g. Brainstorming Session"
                                            className={`w-full px-4 py-2.5 bg-navy-900/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all font-medium ${phase.isDefault ? 'opacity-70 cursor-not-allowed bg-white/5' : ''
                                                }`}
                                        />
                                    </div>

                                    {/* Date Range */}
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formatDateForInput(phase.startDate)}
                                                onChange={(e) => handleUpdatePhase(phase.id, 'startDate', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-navy-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 transition-all text-sm [color-scheme:dark]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">End Date</label>
                                            <input
                                                type="datetime-local"
                                                value={formatDateForInput(phase.endDate)}
                                                onChange={(e) => handleUpdatePhase(phase.id, 'endDate', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-navy-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 transition-all text-sm [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pb-1">
                                        {!phase.isDefault && (
                                            <button
                                                onClick={() => handleDeletePhase(phase.id)}
                                                className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                                title="Delete Phase"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSave}
                                            className="p-2.5 text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition-all"
                                            title="Save Phase"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Validation Error Message */}
                                {validationErrors[phase.id] && (
                                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20 animate-in fade-in slide-in-from-top-1">
                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                        {validationErrors[phase.id]}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {phases.length === 0 && (
                    <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-gray-500">No phases defined yet.</p>
                        <button onClick={handleAddPhase} className="mt-4 text-cyan-400 hover:underline">Click here to add the first phase</button>
                    </div>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-8 border-t border-white/10 flex justify-end gap-4">
                <button
                    onClick={handleBack}
                    className="px-6 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold transition-all"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`px-8 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg ${isSaving
                            ? 'bg-gray-600 cursor-not-allowed opacity-70'
                            : 'bg-gradient-to-r from-blue-600 to-blue-600 hover:shadow-blue-500/30'
                        }`}
                >
                    {isSaving ? 'Processing...' : 'Confirm All Changes'}
                </button>
            </div>
        </div>
    );
};

export default EditTimeline;
