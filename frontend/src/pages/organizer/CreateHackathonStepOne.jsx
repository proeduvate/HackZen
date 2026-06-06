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

        if (!formData.startDate) {
            nextErrors.startDate = 'Start date is required.';
        }

        if (!formData.endDate) {
            nextErrors.endDate = 'End date is required.';
        }

        if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
            nextErrors.endDate = 'End date must be after start date.';
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
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Describe your hackathon challenge and objectives"
                            rows={4}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-colors text-white placeholder-gray-600 text-sm resize-none"
                        />
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