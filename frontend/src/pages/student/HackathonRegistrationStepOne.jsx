import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { getStepOneConfig, saveStepOneData } from '../../services/student/hackathonRegistrationStepOneApi';

const HackathonRegistrationStepOne = () => {
    const navigate = useNavigate();
    const { hackathonId } = useParams();
    const { hackathon, draft, setDraft } = useOutletContext();
    const [formData, setFormData] = useState({
        teamName: draft.teamName,
        teamSize: draft.teamSize,
        leaderName: draft.leaderName,
        leaderEmail: draft.leaderEmail,
    });
    const [config, setConfig] = useState(null);
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const storedUser = JSON.parse(
            sessionStorage.getItem('user') || '{"name":"Hari","email":"hari@proeduvate.com"}'
        );

        getStepOneConfig(hackathon, storedUser).then(setConfig);
    }, [hackathon]);

    const handleContinue = async () => {
        const nextErrors = {};

        if (!formData.teamName.trim()) {
            nextErrors.teamName = 'Team name is required.';
        }

        if (!formData.leaderEmail.trim()) {
            nextErrors.leaderEmail = 'Leader email is required.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        setIsSaving(true);
        try {
            const nextDraft = await saveStepOneData(hackathonId, draft, formData);
            setDraft(nextDraft);
            navigate(`/student/hackathons/${hackathonId}/register/step-2`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">Team Basics</h3>
                <p className="text-sm text-gray-400 italic">Set up your team identity before inviting members.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6 items-start">
                <div className="glass p-6 rounded-2xl border border-white/5 space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 ml-1">Team Name</label>
                        <input
                            value={formData.teamName}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, teamName: e.target.value }));
                                setErrors((prev) => ({ ...prev, teamName: '' }));
                            }}
                            placeholder="Enter team name"
                            className={`w-full bg-navy-900/50 border ${errors.teamName ? 'border-red-500/50' : 'border-white/10'} text-white p-3 rounded-xl focus:outline-none focus:border-blue-500/50 transition-colors`}
                        />
                        {errors.teamName ? <p className="text-xs text-red-400">{errors.teamName}</p> : null}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 ml-1">Team Size</label>
                            <select
                                value={formData.teamSize}
                                onChange={(e) => setFormData((prev) => ({ ...prev, teamSize: Number(e.target.value) }))}
                                className="w-full bg-navy-900/50 border border-white/10 text-white p-3 rounded-xl focus:outline-none"
                            >
                                {config ? Array.from({ length: config.maxTeamSize - 1 }, (_, index) => index + 2).map((size) => (
                                    <option key={size} value={size}>{size} Members</option>
                                )) : null}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 ml-1">Leader</label>
                            <input
                                value={formData.leaderName}
                                onChange={(e) => setFormData((prev) => ({ ...prev, leaderName: e.target.value }))}
                                className="w-full bg-navy-900/20 border border-white/5 text-gray-300 p-3 rounded-xl focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 ml-1">Leader Email</label>
                        <input
                            type="email"
                            value={formData.leaderEmail}
                            onChange={(e) => {
                                setFormData((prev) => ({ ...prev, leaderEmail: e.target.value }));
                                setErrors((prev) => ({ ...prev, leaderEmail: '' }));
                            }}
                            placeholder="Enter leader email"
                            className={`w-full bg-navy-900/50 border ${errors.leaderEmail ? 'border-red-500/50' : 'border-white/10'} text-white p-3 rounded-xl focus:outline-none focus:border-blue-500/50 transition-colors`}
                        />
                        {errors.leaderEmail ? <p className="text-xs text-red-400">{errors.leaderEmail}</p> : null}
                    </div>
                </div>

                <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="text-lg font-bold text-white">Step Summary</h4>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Hackathon</span>
                            <span className="text-white font-semibold text-right">{hackathon.title}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Organizer</span>
                            <span className="text-white font-semibold text-right">{hackathon.organizer}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Team Limit</span>
                            <span className="text-white font-semibold text-right">{hackathon.teamSizeLimit} Members</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button
                    onClick={handleContinue}
                    disabled={isSaving}
                    className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-600 rounded-xl font-bold text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all"
                >
                    {isSaving ? 'Saving...' : 'Continue to Step 2'}
                </button>
            </div>
        </div>
    );
};

export default HackathonRegistrationStepOne;
