import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const CreateHackathon = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentStep, setCurrentStep] = useState(() => {
        // Extract step from current pathname
        const pathParts = location.pathname.split('/');
        const stepPart = pathParts[pathParts.length - 1];
        const stepMatch = stepPart.match(/step-(\d)/);
        return stepMatch ? parseInt(stepMatch[1]) : 1;
    });
    const [draft, setDraft] = useState(() => {
        // Load existing draft from sessionStorage if available
        const saved = sessionStorage.getItem('hackathonDraft');
        return saved ? JSON.parse(saved) : {
            title: '',
            tagline: '',
            startDate: '',
            endDate: '',
            description: '',
            tracks: [],
            minTeamSize: 2,
            maxTeamSize: 4,
            isPublic: true,
            autoApprove: false,
            banner: null
        };
    });

    const steps = [
        { id: 1, title: 'Basic Details', description: 'Event information and timeline' },
        { id: 2, title: 'Tracks & Rules', description: 'Challenge categories and settings' },
        { id: 3, title: 'Review & Publish', description: 'Final review and publication' }
    ];

    const handleStepChange = (step) => {
        setCurrentStep(step);
        navigate(`/organizer/create-hackathon/step-${step}`);
    };

    const contextValue = {
        draft,
        setDraft,
        currentStep,
        setCurrentStep,
        handleStepChange,
        steps
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col font-sans text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 flex-none mb-4 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Create Hackathon</h1>
                    <p className="text-sm text-gray-400">Set up your event in three simple steps</p>
                </div>
            </div>

            {/* Step Progress */}
            <div className="glass p-6 rounded-2xl border border-white/5 flex-none mb-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-6">
                    {steps.map((step, index) => (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={() => handleStepChange(step.id)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                                        currentStep >= step.id
                                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    {step.id}
                                </button>
                                <div className="text-center mt-3">
                                    <p className={`text-sm font-semibold ${currentStep >= step.id ? 'text-white' : 'text-gray-400'}`}>
                                        {step.title}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-4 mt-[-24px] ${
                                    currentStep > step.id ? 'bg-cyan-600' : 'bg-white/10'
                                }`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Outlet context={contextValue} />
            </div>
        </div>
    );
};

export default CreateHackathon;
