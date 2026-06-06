import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getStepTwoConfig, saveStepTwoData } from '../../services/organizer/createHackathonStepTwoApi';

const CreateHackathonStepTwo = () => {
    const { draft, setDraft, handleStepChange } = useOutletContext();
    const [tracks, setTracks] = useState(draft.tracks);
    const [formData, setFormData] = useState({
        minTeamSize: draft.minTeamSize,
        maxTeamSize: draft.maxTeamSize,
        isPublic: draft.isPublic,
        autoApprove: draft.autoApprove,
    });
    const [config, setConfig] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [newTrack, setNewTrack] = useState({ title: '', description: '' });

    useEffect(() => {
        getStepTwoConfig(draft).then(setConfig);
    }, [draft]);

    const handleAddTrack = () => {
        if (newTrack.title.trim() && newTrack.description.trim()) {
            setTracks(prev => [...prev, { ...newTrack, id: Date.now() }]);
            setNewTrack({ title: '', description: '' });
        }
    };

    const handleRemoveTrack = (trackId) => {
        setTracks(prev => prev.filter(track => track.id !== trackId));
    };

    const handleContinue = async () => {
        setIsSaving(true);
        try {
            const updatedDraft = { ...draft, ...formData, tracks };
            await saveStepTwoData(draft, { ...formData, tracks });
            setDraft(updatedDraft);
            handleStepChange(3);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        handleStepChange(1);
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Tracks & Rules</h2>
                <p className="text-sm text-gray-400">Define challenge categories and participation settings</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6 items-start">
                <div className="space-y-6">
                    {/* Tracks Section */}
                    <div className="glass p-6 rounded-xl border border-white/5 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-white">Challenge Tracks</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Define the categories for participant projects</p>
                            </div>
                            <button
                                onClick={handleAddTrack}
                                className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 font-semibold rounded-lg border border-cyan-500/20 transition-colors text-sm"
                            >
                                + Add
                            </button>
                        </div>

                        {/* Add New Track Form */}
                        <div className="space-y-2 p-4 rounded-lg bg-white/5 border border-white/10">
                            <input
                                value={newTrack.title}
                                onChange={(e) => setNewTrack(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Track title"
                                className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-colors text-sm"
                            />
                            <textarea
                                value={newTrack.description}
                                onChange={(e) => setNewTrack(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Track description"
                                rows={2}
                                className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-colors text-sm resize-none"
                            />
                        </div>

                        {/* Existing Tracks */}
                        <div className="space-y-3">
                            {tracks.map(track => (
                                <div key={track.id} className="p-3 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-white text-sm">{track.title}</h4>
                                        <button
                                            onClick={() => handleRemoveTrack(track.id)}
                                            className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                            </svg>
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400">{track.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rules Section */}
                    <div className="glass p-6 rounded-xl border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white">Participation Rules</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase block mb-2">Team Size</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500">Min</label>
                                        <input
                                            type="number"
                                            value={formData.minTeamSize}
                                            onChange={(e) => setFormData(prev => ({ ...prev, minTeamSize: Number(e.target.value) }))}
                                            min="1"
                                            className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-colors text-center text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-500">Max</label>
                                        <input
                                            type="number"
                                            value={formData.maxTeamSize}
                                            onChange={(e) => setFormData(prev => ({ ...prev, maxTeamSize: Number(e.target.value) }))}
                                            min="2"
                                            className="w-full bg-white/5 border border-white/10 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-colors text-center text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-white/5">
                                <span className="text-sm font-medium text-gray-300">Public Event</span>
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                                    className={`w-11 h-6 rounded-full relative transition-colors ${formData.isPublic ? 'bg-cyan-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isPublic ? 'right-1' : 'left-1'}`}></div>
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-white/5">
                                <span className="text-sm font-medium text-gray-300">Auto-Approve Teams</span>
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, autoApprove: !prev.autoApprove }))}
                                    className={`w-11 h-6 rounded-full relative transition-colors ${formData.autoApprove ? 'bg-cyan-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.autoApprove ? 'right-1' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass p-6 rounded-xl border border-white/5 space-y-4">
                    <h3 className="text-lg font-bold text-white">Summary</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Tracks</span>
                            <span className="text-white font-semibold text-right">{tracks.length}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Team Size</span>
                            <span className="text-white font-semibold text-right">{formData.minTeamSize}-{formData.maxTeamSize}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Visibility</span>
                            <span className="text-white font-semibold text-right">{formData.isPublic ? 'Public' : 'Private'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Auto-Approval</span>
                            <span className="text-white font-semibold text-right">{formData.autoApprove ? 'Enabled' : 'Disabled'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between gap-3 pt-2">
                <button
                    onClick={handleBack}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-lg border border-white/5 transition-colors text-sm"
                >
                    Back
                </button>
                <button
                    onClick={handleContinue}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50 text-sm"
                >
                    {isSaving ? 'Saving...' : 'Continue to Step 3'}
                </button>
            </div>
        </div>
    );
};

export default CreateHackathonStepTwo;