import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Reset password for:', email);
        setIsSubmitted(true);
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen px-4 py-8 bg-slate-50 dark:bg-navy-900 bg-radial transition-colors duration-200">
            {/* Top Right Theme Toggle */}
            <div className="absolute top-6 right-6">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md">
                {/* Back Button */}
                <Link
                    to="/login"
                    className="flex items-center gap-2 mb-6 text-slate-600 dark:text-gray-300 transition hover:text-purple-600 dark:hover:text-white group"
                >
                    <svg
                        className="w-4 h-4 transition transform group-hover:-translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-sm font-semibold">Back to Login</span>
                </Link>

                {/* Logo & Title */}
                <div className="mb-8 text-center">
                    <img src="/proeduvate-dark-text.png" alt="ProEduvate" className="h-16 mx-auto mb-4 dark:hidden" />
                    <img src="/proeduvatee-removebg-preview.png" alt="" aria-hidden="true" className="hidden h-16 mx-auto mb-4 dark:block" />
                    <h2 className="mb-2 text-3xl font-extrabold sm:text-4xl gradient-text">Reset Password</h2>
                    <p className="text-slate-600 dark:text-gray-400 text-sm">
                        {isSubmitted
                            ? "Check your email for reset instructions"
                            : "Enter your email to receive a reset link"}
                    </p>
                </div>

                {/* Form Card */}
                <div className="p-6 sm:p-8 bg-white/90 dark:bg-navy-900/80 glass-strong rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl glow-purple-hover transition-all duration-300">
                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email Field */}
                            <div>
                                <label htmlFor="email" className="block mb-2 text-sm font-semibold text-slate-700 dark:text-gray-300">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition border border-slate-300 dark:border-gray-600 rounded-xl bg-white dark:bg-navy-900/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-sm"
                                    placeholder="you@example.com"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="w-full py-3 font-bold text-white rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 btn-hover animate-gradient shadow-md shadow-purple-500/20"
                            >
                                Send Reset Link
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200 dark:border-green-500/30">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-slate-800 dark:text-gray-300 mb-6 font-semibold">Reset link has been sent to your email!</p>
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="text-sm font-bold text-purple-600 dark:text-purple-400 hover:underline"
                            >
                                Didn't receive it? Try again
                            </button>
                        </div>
                    )}
                </div>

                {/* Additional Info */}
                <p className="mt-8 text-center text-sm text-slate-500 dark:text-gray-500">
                    If you still have trouble logging in, please contact our{' '}
                    <Link to="/" className="text-purple-600 dark:text-gray-400 hover:underline font-medium">
                        Support Team
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
