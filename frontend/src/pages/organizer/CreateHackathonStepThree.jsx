import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getStepThreeReview, submitStepThreeHackathon } from '../../services/organizer/createHackathonStepThreeApi';

const getSubmitErrorMessage = (error) => {
    const responseData = error?.response?.data;

    if (typeof responseData?.detail === 'string') return responseData.detail;
    if (Array.isArray(responseData?.detail)) {
        return responseData.detail
            .map((item) => item?.msg || item?.message)
            .filter(Boolean)
            .join(', ') || 'Invalid hackathon details.';
    }
    if (responseData?.error?.detail) return responseData.error.detail;
    if (responseData?.error?.message) return responseData.error.message;
    if (error?.message) return error.message;

    return 'Hackathon creation failed. Please try again.';
};

const validateDraft = (draft) => {
    const errors = [];

    if (!draft.title?.trim()) errors.push('Hackathon title is required.');
    if (!draft.description?.trim()) errors.push('Description is required.');
    if (!draft.location?.trim()) errors.push('Location or mode is required.');
    if (!draft.startDate) errors.push('Start date is required.');
    if (!draft.endDate) errors.push('End date is required.');
    if (draft.startDate && draft.endDate && new Date(draft.startDate) >= new Date(draft.endDate)) {
        errors.push('End date must be after start date.');
    }
    if (!draft.posterFile) errors.push('Poster or banner image is required. Go back to Step 1 and select it again.');
    if (!draft.tracks?.length) errors.push('At least one challenge track is required.');
    if (draft.minTeamSize > draft.maxTeamSize) errors.push('Minimum team size cannot be greater than maximum team size.');

    return errors;
};

const CreateHackathonStepThree = () => {
    const navigate = useNavigate();
    const { draft } = useOutletContext();
    const [review, setReview] = useState(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getStepThreeReview(draft).then(setReview);
    }, [draft]);

    const handleSubmit = async () => {
        const validationErrors = validateDraft(draft);
        if (validationErrors.length > 0) {
            setError(validationErrors.join(' '));
            return;
        }

        if (!acceptedTerms) {
            setError('Please accept the publication terms before submitting.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await submitStepThreeHackathon(draft);
            navigate('/organizer/dashboard', {
                state: {
                    hackathonCreated: true,
                    hackathonTitle: draft.title,
                },
            });
        } catch (submitError) {
            console.error('Failed to create hackathon:', submitError);
            setError(getSubmitErrorMessage(submitError));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        // Navigate back to step 2
        navigate('/organizer/create-hackathon/step-2');
    };

    if (!review) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-cyan-600/30 border-t-cyan-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading review...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Review & Publish</h2>
                <p className="text-sm text-gray-400">Confirm all details before publishing your hackathon.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6 items-start">
                <div className="space-y-6">
                    {/* Event Overview */}
                    <div className="glass p-6 rounded-xl border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white">Event Overview</h3>
                        {draft.posterPreview && (
                            <div className="h-48 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                                <img src={draft.posterPreview} alt="Hackathon poster preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-sm text-gray-400">Title</span>
                                <span className="text-white font-semibold">{draft.title}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-sm text-gray-400">Tagline</span>
                                <span className="text-white font-semibold">{draft.tagline || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-sm text-gray-400">Duration</span>
                                <span className="text-white font-semibold">
                                    {draft.startDate && draft.endDate ?
                                        `${new Date(draft.startDate).toLocaleDateString()} - ${new Date(draft.endDate).toLocaleDateString()}` :
                                        'Not set'
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-sm text-gray-400">Location / Mode</span>
                                <span className="text-white font-semibold text-right">{draft.location || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-sm text-gray-400">Poster</span>
                                <span className="text-white font-semibold text-right">{draft.posterFile?.name || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-gray-400">Description</span>
                                <span className="text-white font-semibold text-right max-w-[200px] truncate">
                                    {draft.description || 'Not set'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tracks & Rules */}
                    <div className="glass p-6 rounded-xl border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white">Tracks & Rules</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-sm text-gray-400">Challenge Tracks</span>
                                <span className="text-white font-semibold">{draft.tracks?.length || 0} tracks</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-sm text-gray-400">Team Size</span>
                                <span className="text-white font-semibold">{draft.minTeamSize}-{draft.maxTeamSize} members</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-sm text-gray-400">Visibility</span>
                                <span className="text-white font-semibold">{draft.isPublic ? 'Public' : 'Private'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-gray-400">Auto-Approval</span>
                                <span className="text-white font-semibold">{draft.autoApprove ? 'Enabled' : 'Disabled'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Terms & Conditions */}
                    <div className="glass p-6 rounded-xl border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white">Publication Terms</h3>
                        <div className="space-y-4">
                            <div className="text-sm text-gray-400 space-y-2">
                                <p>By publishing this hackathon, you agree to:</p>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>Provide fair evaluation and timely feedback to all participants</li>
                                    <li>Maintain the integrity of the competition rules</li>
                                    <li>Handle all submissions and data responsibly</li>
                                    <li>Comply with platform terms of service</li>
                                </ul>
                            </div>

                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="acceptTerms"
                                    checked={acceptedTerms}
                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                    className="mt-1 w-4 h-4 bg-white/5 border border-white/10 rounded focus:outline-none focus:border-cyan-500/50"
                                />
                                <label htmlFor="acceptTerms" className="text-sm text-gray-300 cursor-pointer">
                                    I accept the publication terms and confirm all information is accurate
                                </label>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <p className="text-sm text-red-400">{error}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="glass p-6 rounded-xl border border-white/5 space-y-4">
                    <h3 className="text-lg font-bold text-white">Publication Summary</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-400">Status</span>
                            <span className="text-green-400 font-semibold">Ready to Publish</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-400">Tracks</span>
                            <span className="text-white font-semibold">{draft.tracks?.length || 0}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-400">Team Limits</span>
                            <span className="text-white font-semibold">{draft.minTeamSize}-{draft.maxTeamSize}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-400">Visibility</span>
                            <span className="text-white font-semibold">{draft.isPublic ? 'Public' : 'Private'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-400">Poster</span>
                            <span className="text-white font-semibold text-right">{draft.posterFile?.name || 'Missing'}</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <div className="text-xs text-gray-500 text-center">
                            Once published, your hackathon will be visible to participants and cannot be edited.
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between gap-3 pt-2">
                <button
                    onClick={handleBack}
                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-lg border border-white/5 transition-colors"
                >
                    Back to Step 2
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !acceptedTerms}
                    className="w-full md:w-auto px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2"></div>
                            Publishing...
                        </>
                    ) : (
                        'Publish Hackathon'
                    )}
                </button>
            </div>
        </div>
    );
};

export default CreateHackathonStepThree;
