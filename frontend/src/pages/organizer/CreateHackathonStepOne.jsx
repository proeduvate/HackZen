import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getStepOneConfig, saveStepOneData } from '../../services/organizer/createHackathonStepOneApi';

const CreateHackathonStepOne = () => {
    const navigate = useNavigate();
    const { draft, setDraft, handleStepChange } = useOutletContext();
    const [formData, setFormData] = useState({
        title: draft.title,
        tagline: draft.tagline,
        startDate: draft.startDate,
        endDate: draft.endDate,
        description: draft.description,
        location: draft.location,
        posterFile: draft.posterFile || null,
        posterPreview: draft.posterPreview || '',
    });
    const [config, setConfig] = useState(null);
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const storedUser = JSON.parse(
            sessionStorage.getItem('user') || '{"name":"Organizer","email":"organizer@proeduvate.com"}'
        );

        getStepOneConfig(storedUser).then(setConfig);
    }, []);

    const handleContinue = async () => {
        const nextErrors = {};

        if (!formData.title.trim()) {
            nextErrors.title = 'Hackathon title is required.';
        }

        if (!formData.description.trim()) {
            nextErrors.description = 'Description is required.';
        } else if (formData.description.trim().length < 20) {
            nextErrors.description = 'Description must be at least 20 characters.';
        }

        if (!formData.location.trim()) {
            nextErrors.location = 'Location or mode is required.';
        }

        if (!formData.startDate) {
            nextErrors.startDate = 'Start date is required.';
        }

        if (!formData.endDate) {
            nextErrors.endDate = 'End date is required.';
        }

        if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
            nextErrors.endDate = 'End date must be after start date.';
        }

        if (!formData.posterFile && !formData.posterPreview) {
            nextErrors.poster = 'Poster or banner image is required.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setIsSaving(true);
        try {
            const updatedDraft = { ...draft, ...formData };
            await saveStepOneData(draft, formData);
            setDraft(updatedDraft);
            handleStepChange(2);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePosterChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = 10 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            setErrors((prev) => ({ ...prev, poster: 'Poster must be a JPG, PNG, or WEBP image.' }));
            event.target.value = '';
            return;
        }

        if (file.size > maxSize) {
            setErrors((prev) => ({ ...prev, poster: 'Poster must be 10MB or smaller.' }));
            event.target.value = '';
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setFormData((prev) => ({
            ...prev,
            posterFile: file,
            posterPreview: previewUrl,
        }));
        setErrors((prev) => ({ ...prev, poster: '' }));
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Basic Details</h2>
                <p className="text-sm text-gray-400">Configure the fundamental information for your hackathon</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6 items-start">
                <div className="glass p-6 rounded-xl border border-white/5 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Hackathon Title</label>
                        <input
                            value={formData.title}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, title: e.target.value }));
                                setErrors((prev) => ({ ...prev, title: '' }));
                            }}
                            placeholder="e.g. Innovation Sprint 2025"
                            className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-colors text-white placeholder-gray-600 text-sm ${
                                errors.title ? 'border-red-500/50' : 'border-white/10'
                            }`}
                        />
                        {errors.title ? <p className="text-xs text-red-400">{errors.title}</p> : null}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Tagline</label>
                        <input
                            value={formData.tagline}
                            onChange={(e) => setFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                            placeholder="Build the future, today"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-colors text-white placeholder-gray-600 text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Location / Mode</label>
                        <input
                            value={formData.location}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, location: e.target.value }));
                                setErrors((prev) => ({ ...prev, location: '' }));
                            }}
                            placeholder="e.g. Online, Chennai, or Hybrid"
                            className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-colors text-white placeholder-gray-600 text-sm ${
                                errors.location ? 'border-red-500/50' : 'border-white/10'
                            }`}
                        />
                        {errors.location ? <p className="text-xs text-red-400">{errors.location}</p> : null}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Poster / Banner Image</label>
                        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4 items-center">
                            <div className="h-28 rounded-lg overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                                {formData.posterPreview ? (
                                    <img src={formData.posterPreview} alt="Poster preview" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs text-gray-500 text-center px-4">No poster selected</span>
                                )}
                            </div>
                            <div>
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp"
                                    onChange={handlePosterChange}
                                    className={`w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-white hover:file:bg-cyan-500 ${
                                        errors.poster ? 'rounded-lg border border-red-500/50 p-2' : ''
                                    }`}
                                />
                                <p className="text-xs text-gray-500 mt-2">Accepted: JPG, PNG, WEBP. Max size: 10MB.</p>
                                {errors.poster ? <p className="text-xs text-red-400 mt-1">{errors.poster}</p> : null}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase">Start Date</label>
                            <input
                                type="datetime-local"
                                value={formData.startDate}
                                onChange={(e) => {
                                    setFormData((prev) => ({ ...prev, startDate: e.target.value }));
                                    setErrors((prev) => ({ ...prev, startDate: '' }));
                                }}
                                className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-colors text-white text-sm ${
                                    errors.startDate ? 'border-red-500/50' : 'border-white/10'
                                }`}
                            />
                            {errors.startDate ? <p className="text-xs text-red-400">{errors.startDate}</p> : null}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 uppercase">End Date</label>
                            <input
                                type="datetime-local"
                                value={formData.endDate}
                                onChange={(e) => {
                                    setFormData((prev) => ({ ...prev, endDate: e.target.value }));
                                    setErrors((prev) => ({ ...prev, endDate: '' }));
                                }}
                                className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-colors text-white text-sm ${
                                    errors.endDate ? 'border-red-500/50' : 'border-white/10'
                                }`}
                            />
                            {errors.endDate ? <p className="text-xs text-red-400">{errors.endDate}</p> : null}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, description: e.target.value }));
                                setErrors((prev) => ({ ...prev, description: '' }));
                            }}
                            placeholder="Describe your hackathon challenge and objectives"
                            rows={4}
                            className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-colors text-white placeholder-gray-600 text-sm resize-none ${
                                errors.description ? 'border-red-500/50' : 'border-white/10'
                            }`}
                        />
                        {errors.description ? <p className="text-xs text-red-400">{errors.description}</p> : null}
                    </div>
                </div>

                <div className="glass p-6 rounded-xl border border-white/5 space-y-4">
                    <h3 className="text-lg font-bold text-white">Summary</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Title</span>
                            <span className="text-white font-semibold text-right">{formData.title || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Tagline</span>
                            <span className="text-white font-semibold text-right">{formData.tagline || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Duration</span>
                            <span className="text-white font-semibold text-right">
                                {formData.startDate && formData.endDate ?
                                    `${new Date(formData.startDate).toLocaleDateString()} - ${new Date(formData.endDate).toLocaleDateString()}` :
                                    'Not set'
                                }
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Location</span>
                            <span className="text-white font-semibold text-right">{formData.location || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Poster</span>
                            <span className="text-white font-semibold text-right">
                                {formData.posterFile?.name || (formData.posterPreview ? 'Selected' : 'Not set')}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Description</span>
                            <span className="text-white font-semibold text-right">
                                {formData.description ? `${formData.description.length} chars` : 'Not set'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button
                    onClick={handleContinue}
                    disabled={isSaving}
                    className="w-full md:w-auto px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Continue to Step 2'}
                </button>
            </div>
        </div>
    );
};

export default CreateHackathonStepOne;
