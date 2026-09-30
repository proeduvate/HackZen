import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, login } from '../api/userApi';
import ThemeToggle from '../components/ThemeToggle';

const Signup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'mentor'
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match!");
            return;
        }

        setLoading(true);

        try {
            await register({
                name: formData.fullName,
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                role: formData.role
            });

            // After successful registration, log them in directly
            const loginResponse = await login({
                email: formData.email.trim().toLowerCase(),
                password: formData.password
            });

            const role = loginResponse.user.role;

            // Sync session storage
            sessionStorage.setItem('userRole', role);
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('user', JSON.stringify(loginResponse.user));

            // Notify app
            window.dispatchEvent(new Event('user-update'));

            // Redirect
            if (role === 'organizer') {
                navigate('/organizer/dashboard');
            } else if (role === 'mentor') {
                navigate('/mentor/dashboard');
            } else {
                navigate('/student/dashboard');
            }
        } catch (err) {
            const message = err.response?.data?.error?.message || err.response?.data?.detail || err.message;
            setError(message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen px-6 py-12 bg-slate-50 dark:bg-navy-900 bg-radial transition-colors duration-200">
            {/* Top Right Theme Toggle */}
            <div className="absolute top-6 right-6">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md">
                {/* Back Button */}
                <Link
                    to="/"
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
                    <span className="text-sm font-semibold">Back to Home</span>
                </Link>

                <div className="mb-8 text-center">
                    <img src="/proeduvate-dark-text.png" alt="ProEduvate" className="h-20 mx-auto mb-4 dark:hidden" />
                    <img src="/proeduvatee-removebg-preview.png" alt="" aria-hidden="true" className="hidden h-20 mx-auto mb-4 dark:block" />
                    <h2 className="mb-2 text-3xl font-extrabold text-slate-900 dark:text-white">Create Account</h2>
                    <p className="text-slate-600 dark:text-gray-400 text-sm">
                        Join ProEduvate as a <span className="font-bold text-purple-600 dark:text-purple-400 capitalize">{formData.role}</span>
                    </p>
                </div>

                <div className="p-8 border border-slate-200 dark:border-white/10 shadow-xl bg-white/95 dark:bg-navy-900/80 glass-strong rounded-2xl transition-all duration-300">
                    {error && (
                        <div className="p-3 mb-4 text-sm text-center text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-xl bg-red-50 dark:bg-red-500/10">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="fullName" className="block mb-2 text-sm font-semibold text-slate-700 dark:text-gray-300">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition border border-slate-300 dark:border-gray-600 rounded-xl bg-white dark:bg-navy-900/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-sm"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block mb-2 text-sm font-semibold text-slate-700 dark:text-gray-300">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition border border-slate-300 dark:border-gray-600 rounded-xl bg-white dark:bg-navy-900/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-sm"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50 dark:bg-purple-500/10 px-4 py-3 text-sm text-purple-700 dark:text-purple-200">
                            You are creating a <span className="font-bold">Mentor</span> account.
                        </div>

                        <div>
                            <label htmlFor="password" className="block mb-2 text-sm font-semibold text-slate-700 dark:text-gray-300">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition border border-slate-300 dark:border-gray-600 rounded-xl bg-white dark:bg-navy-900/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 pr-12 shadow-sm"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 px-4 flex items-center text-slate-400 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block mb-2 text-sm font-semibold text-slate-700 dark:text-gray-300">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition border border-slate-300 dark:border-gray-600 rounded-xl bg-white dark:bg-navy-900/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 pr-12 shadow-sm"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 px-4 flex items-center text-slate-400 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors"
                                >
                                    {showConfirmPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                id="terms"
                                required
                                className="w-4 h-4 mt-1 text-purple-600 border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-navy-900"
                            />
                            <label htmlFor="terms" className="ml-2 text-sm text-slate-600 dark:text-gray-400">
                                I agree to the{' '}
                                <Link to="/terms" className="text-purple-600 dark:text-purple-400 hover:underline">
                                    Terms of Service
                                </Link>{' '}
                                and{' '}
                                <Link to="/privacy" className="text-purple-600 dark:text-purple-400 hover:underline">
                                    Privacy Policy
                                </Link>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 font-bold text-white transition-all duration-300 rounded-xl shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-purple-500/20 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Creating Account...</span>
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 text-slate-500 dark:text-gray-400 bg-white dark:bg-navy-900/90 text-xs uppercase tracking-wider font-semibold">Or continue with</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <button type="button" className="flex items-center justify-center px-4 py-3 transition border border-slate-200 dark:border-gray-600 rounded-xl bg-slate-50 dark:bg-navy-900 hover:border-purple-500 shadow-sm card-hover">
                            <span className="text-xl">🐙</span>
                        </button>
                        <button type="button" className="flex items-center justify-center px-4 py-3 transition border border-slate-200 dark:border-gray-600 rounded-xl bg-slate-50 dark:bg-navy-900 hover:border-purple-500 shadow-sm card-hover">
                            <span className="text-xl">G</span>
                        </button>
                        <button type="button" className="flex items-center justify-center px-4 py-3 transition border border-slate-200 dark:border-gray-600 rounded-xl bg-slate-50 dark:bg-navy-900 hover:border-purple-500 shadow-sm card-hover">
                            <span className="text-xl">in</span>
                        </button>
                    </div>
                </div>

                <p className="mt-6 text-center text-slate-600 dark:text-gray-400 text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="font-bold text-purple-600 dark:text-purple-400 transition hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
