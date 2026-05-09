import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Reset password for:', email);
        setIsSubmitted(true);
    };

    return (
        <div className="flex items-center justify-center min-h-screen px-4 py-8 bg-navy-900 bg-radial">
            <div className="w-full max-w-md">
                {/* Back Button */}
                <Link
                    to="/login"
                    className="flex items-center gap-2 mb-6 text-gray-300 transition hover:text-white group"
                >
                    <svg
                        className="w-4 h-4 transition transform group-hover:-translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-sm">Back to Login</span>
                </Link>

                {/* Logo & Title */}
                <div className="mb-8 text-center">
                    <h2 className="mb-2 text-3xl font-bold sm:text-4xl gradient-text">Reset Password</h2>
                    <p className="text-gray-400">
                        {isSubmitted
                            ? "Check your email for reset instructions"
                            : "Enter your email to receive a reset link"}
                    </p>
                </div>

                {/* Forgot Password Form - Glass Effect */}
                <div className="p-6 glass-strong rounded-xl sm:p-8 glow-purple-hover">
                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Email Field */}
                            <div>
                                <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-300">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 text-white placeholder-gray-500 transition border border-gray-600 rounded-lg bg-navy-900/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                                    placeholder="you@example.com"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="w-full py-3 font-semibold text-white rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 btn-hover animate-gradient"
                            >
                                Send Reset Link
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-gray-300 mb-6 font-medium">Reset link has been sent to your email!</p>
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-4"
                            >
                                Didn't receive it? Try again
                            </button>
                        </div>
                    )}
                </div>

                {/* Additional Info */}
                <p className="mt-8 text-center text-sm text-gray-500">
                    If you still have trouble logging in, please contact our{' '}
                    <Link to="/support" className="text-gray-400 hover:text-white underline">
                        Support Team
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
