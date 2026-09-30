import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const RoleSelection = () => {
    const navigate = useNavigate();
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
        if (!selectedRole) return;
        sessionStorage.setItem('temp_selected_role', selectedRole);
        const roleConfig = roles.find(r => r.id === selectedRole);
        if (roleConfig) {
            navigate(roleConfig.path);
        }
    };

    return (
        <div className="relative min-h-screen px-4 py-8 bg-slate-50 dark:bg-navy-900 bg-radial sm:py-12 flex flex-col items-center transition-colors duration-200">
            {/* Top Right Theme Toggle */}
            <div className="absolute top-6 right-6">
                <ThemeToggle />
            </div>

            {/* Back Button */}
            <div className="w-full max-w-5xl mb-12">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-600 dark:text-gray-400 transition hover:text-purple-600 dark:hover:text-white group">
                    <svg className="w-5 h-5 transition group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="font-semibold text-sm">Back to Home</span>
                </Link>
            </div>

            {/* Header */}
            <div className="max-w-3xl mx-auto mb-12 text-center">
                <h1 className="mb-4 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl md:text-5xl tracking-tight">
                    Define Your <span className="gradient-text">Identity</span>
                </h1>
                <p className="text-slate-600 dark:text-gray-400 text-base sm:text-lg max-w-xl mx-auto">
                    Select a path below to customize your ProEduvate experience. You can't change this later without a new account.
                </p>
            </div>

            {/* Role Cards Container */}
            <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 mb-12">
                {roles.map((role) => (
                    <div
                        key={role.id}
                        className={`
                            relative flex-1 p-8 rounded-3xl transition-all duration-300 cursor-pointer group
                            ${selectedRole === role.id
                                ? 'bg-purple-50 dark:bg-gradient-to-b dark:from-purple-600/20 dark:to-blue-600/20 border-2 border-purple-600 shadow-xl scale-[1.02]'
                                : 'bg-white dark:bg-navy-800/50 border border-slate-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-white/20 hover:scale-[1.01] shadow-sm'
                            }
                        `}
                        onClick={() => setSelectedRole(role.id)}
                    >
                        {/* Selection Indicator */}
                        {selectedRole === role.id && (
                            <div className="absolute top-4 right-4 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center animate-bounce-in shadow-md">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}

                        {/* Icon Container */}
                        <div className={`
                            w-16 h-16 rounded-2xl mb-6 flex items-center justify-center text-4xl shadow-md transition-transform group-hover:scale-110 duration-300
                            ${selectedRole === role.id ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-400'}
                        `}>
                            {role.icon}
                        </div>

                        <h2 className={`mb-3 text-2xl font-bold transition-colors ${selectedRole === role.id ? 'text-purple-700 dark:text-white' : 'text-slate-900 dark:text-gray-300'}`}>
                            {role.title}
                        </h2>

                        <p className="text-slate-600 dark:text-gray-400 leading-relaxed text-sm mb-4">
                            {role.description}
                        </p>

                        <div className={`
                            h-1 w-0 bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 rounded-full
                            ${selectedRole === role.id ? 'w-full' : 'group-hover:w-1/3'}
                        `}></div>
                    </div>
                ))}
            </div>

            {/* Global CTA with Validation */}
            <div className="w-full max-w-4xl flex flex-col items-center gap-6">
                <button
                    onClick={handleContinue}
                    disabled={!selectedRole}
                    className={`
                        w-full sm:w-80 py-4 px-8 rounded-2xl font-black uppercase tracking-widest transition-all duration-300 transform
                        ${selectedRole
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl hover:shadow-purple-500/40 hover:-translate-y-1 active:scale-95'
                            : 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-gray-500 cursor-not-allowed border border-slate-300 dark:border-white/5 opacity-60'
                        }
                    `}
                >
                    {selectedRole ? `Continue as ${selectedRole}` : 'Select a Role to Proceed'}
                </button>

                <div className="text-center">
                    <p className="text-slate-500 dark:text-gray-500 text-sm">
                        Prefer to jump straight in?{' '}
                        <Link to="/login" className="text-purple-600 dark:text-blue-400 font-bold hover:underline">
                            Login to existing account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;
