import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

const RoleSelection = () => {
    const navigate = useNavigate();
    const { isPublicRegistrationAllowed, platformName, isMaintenanceMode } = usePlatformSettings();
    const [selectedRole, setSelectedRole] = useState(null);

    const roles = [
        {
            id: 'student',
            icon: '👥',
            title: 'Student',
            description: 'Join hackathons, form teams, collaborate with mentors, and showcase your skills.',
            path: '/signup?role=student'
        },
        {
            id: 'mentor',
            icon: '🎓',
            title: 'Mentor',
            description: 'Guide teams, provide feedback, and help shape the next generation of innovators.',
            path: '/signup?role=mentor'
        },
        {
            id: 'organizer',
            icon: '🎯',
            title: 'Organizer',
            description: 'Create and manage hackathons, evaluate submissions, and publish results.',
            path: '/signup?role=organizer'
        },
    ];

    const handleContinue = () => {
        if (!selectedRole || !isPublicRegistrationAllowed) return;

        // State Persistence: Store the selected role for RBAC logic downstream
        sessionStorage.setItem('temp_selected_role', selectedRole);

        // Find the target path
        const roleConfig = roles.find(r => r.id === selectedRole);
        if (roleConfig) {
            navigate(roleConfig.path);
        }
    };

    return (
        <div className="min-h-screen px-4 py-8 bg-navy-900 sm:py-12 flex flex-col items-center">
            {/* Top Navigation Bar */}
            <div className="w-full max-w-5xl mb-12 flex items-center justify-between">
                <Link to="/" className="inline-flex items-center gap-2 text-gray-400 transition hover:text-white group">
                    <svg className="w-5 h-5 transition group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="font-medium">Back to Home</span>
                </Link>
                <ThemeToggle />
            </div>

            {/* Header */}
            <div className="max-w-3xl mx-auto mb-12 text-center">
                <h1 className="mb-4 text-3xl font-black text-white sm:text-4xl md:text-5xl tracking-tight">
                    Define Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Identity</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-xl mx-auto">
                    Select a path below to customize your {platformName || 'ProEduvate'} experience.
                </p>

                {!isPublicRegistrationAllowed && (
                    <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm font-semibold max-w-xl mx-auto animate-in fade-in duration-300">
                        ⚠️ New account creation is currently closed by the platform administrator. Existing users can sign in below.
                    </div>
                )}
            </div>

            {/* Role Cards Container */}
            <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 mb-12">
                {roles.map((role) => (
                    <div
                        key={role.id}
                        className={`
                            relative flex-1 p-8 rounded-3xl transition-all duration-500 cursor-pointer group
                            ${selectedRole === role.id
                                ? 'bg-gradient-to-b from-purple-600/20 to-blue-600/20 border-2 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)] scale-[1.02]'
                                : 'bg-navy-800/50 border border-white/10 hover:border-white/20 hover:scale-[1.01] grayscale-[0.5] hover:grayscale-0'
                            }
                        `}
                        onClick={() => setSelectedRole(role.id)}
                    >
                        {/* Selection Indicator */}
                        {selectedRole === role.id && (
                            <div className="absolute top-4 right-4 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center animate-bounce-in">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}

                        {/* Icon Container */}
                        <div className={`
                            w-16 h-16 rounded-2xl mb-6 flex items-center justify-center text-4xl shadow-2xl transition-transform group-hover:scale-110 duration-500
                            ${selectedRole === role.id ? 'bg-purple-500 text-white' : 'bg-navy-900 border border-white/10 text-gray-400'}
                        `}>
                            {role.icon}
                        </div>

                        <h2 className={`mb-3 text-2xl font-bold transition-colors ${selectedRole === role.id ? 'text-white' : 'text-gray-300'}`}>
                            {role.title}
                        </h2>

                        <p className="text-gray-400 leading-relaxed text-sm mb-4">
                            {role.description}
                        </p>

                        <div className={`
                            h-1 w-0 bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500
                            ${selectedRole === role.id ? 'w-full' : 'group-hover:w-1/3'}
                        `}></div>
                    </div>
                ))}
            </div>

            {/* Global CTA with Validation */}
            <div className="w-full max-w-4xl flex flex-col items-center gap-6">
                <button
                    onClick={handleContinue}
                    disabled={!selectedRole || !isPublicRegistrationAllowed}
                    className={`
                        w-full sm:w-80 py-4 px-8 rounded-2xl font-black uppercase tracking-widest transition-all duration-300 transform
                        ${selectedRole && isPublicRegistrationAllowed
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl hover:shadow-purple-500/40 hover:-translate-y-1 active:scale-95'
                            : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5 opacity-50'
                        }
                    `}
                >
                    {!isPublicRegistrationAllowed
                        ? 'Registrations Closed'
                        : selectedRole
                        ? `Continue as ${selectedRole}`
                        : 'Select a Role to Proceed'}
                </button>

                <div className="text-center">
                    <p className="text-gray-500 text-sm">
                        Prefer to jump straight in?{' '}
                        <Link to="/login" className="text-blue-400 font-bold hover:text-blue-300 transition-colors underline-offset-4 hover:underline">
                            Login to existing account
                        </Link>
                    </p>
                </div>
            </div>

            {/* Background Aesthetics */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s]"></div>
            </div>
        </div>
    );
};

export default RoleSelection;
