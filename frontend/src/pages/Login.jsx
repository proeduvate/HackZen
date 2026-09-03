import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/userApi';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import { usePlatformSettings } from '../context/PlatformSettingsContext';

const Login = () => {
    const navigate = useNavigate();
    const { isMaintenanceMode, platformName } = usePlatformSettings();
    const [formData, setFormData] = useState({
        email: localStorage.getItem('rememberedEmail') || '',
        password: ''
    });
    const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('rememberedEmail'));
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Handle Remember Me logic
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', formData.email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            const response = await login({
                email: formData.email,
                password: formData.password
            });

            const { token, user } = response;
            const role = user.role;

            // Fast-sync storage
            const storageData = {
                isLoggedIn: 'true',
                userRole: role,
                user: JSON.stringify(user),
                token: token
            };

            Object.entries(storageData).forEach(([key, val]) => {
                sessionStorage.setItem(key, val);
                localStorage.setItem(key, val);
            });

            console.log(`[Auth] Login successful. Role: ${role}. Redirecting...`);

            // Immediate Redirect
            const targetPath = role === 'admin' ? '/admin/dashboard' : 
                               role === 'organizer' ? '/organizer/dashboard' : 
                               role === 'mentor' ? '/mentor/dashboard' : '/student/dashboard';
            
            navigate(targetPath, { replace: true });
            
            setTimeout(() => window.dispatchEvent(new Event('user-update')), 0);
        } catch (err) {
            setError(err.detail || err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen px-4 py-8 bg-navy-900 bg-radial">
            <div className="w-full max-w-md">
                {/* Top Navigation Row */}
                <div className="flex items-center justify-between mb-6">
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-gray-300 transition hover:text-white group"
                    >
                        <svg
                            className="w-4 h-4 transition transform group-hover:-translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm">Back</span>
                    </Link>
                    <ThemeToggle />
                </div>

                {/* Logo & Title */}
                <div className="mb-8 text-center">
                    <img src="/proeduvatee-removebg-preview.png" alt={platformName || "ProEduvate"} className="h-20 mx-auto mb-4" />
                    <h2 className="mb-2 text-3xl font-bold sm:text-4xl gradient-text">Welcome Back</h2>
                    <p className="text-gray-400">Sign in to continue to {platformName || 'ProEduvate'}</p>
                </div>

                {/* Maintenance Notice Card */}
                {isMaintenanceMode && (
                    <div className="p-4 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg shadow-amber-500/5">
                        <div className="flex items-start gap-2.5">
                            <span className="text-base shrink-0">⚠️</span>
                            <div>
                                <p className="font-bold text-amber-300">Platform Maintenance Active</p>
                                <p className="text-gray-300 mt-1 leading-relaxed">
                                    {platformName || 'ProEduvate'} is undergoing scheduled maintenance. Regular participant features may be restricted. Authorized administrators and staff can sign in below.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Login Form - Glass Effect */}
                <div className="p-6 glass-strong rounded-xl sm:p-8 glow-purple-hover">
                    {error && (
                        <div className="p-3 mb-4 text-sm text-center text-red-400 border border-red-500/30 rounded-lg bg-red-500/10">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Email Field */}
                                <div>
                                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-300">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 text-white placeholder-gray-500 transition border border-gray-600 rounded-lg bg-navy-900/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                                        placeholder="you@example.com"
                                    />
                                </div>

                                {/* Password Field */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                                            Password
                                        </label>
                                        <Link to="/forgot-password" className="text-sm text-purple-400 transition hover:text-purple-300">
                                            Forgot?
                                        </Link>
                                    </div>
                                    <div className="relative group/pass">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 pr-12 text-white placeholder-gray-500 transition border border-gray-600 rounded-lg bg-navy-900/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                                                    <line x1="2" x2="22" y1="2" y2="22" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Remember Me */}
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="remember"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 border-gray-600 rounded bg-navy-900 focus:ring-purple-500"
                                    />
                                    <label htmlFor="remember" className="ml-2 text-sm text-gray-400">
                                        Remember me
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full py-3 font-semibold text-white rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 btn-hover animate-gradient flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? (
                                        <>
                                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>Signing In...</span>
                                        </>
                                    ) : (
                                        'Sign In'
                                    )}
                                </button>
                    </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 text-gray-400 bg-transparent">Or continue with</span>
                            </div>
                        </div>

                        {/* Social Login */}
                        <div className="grid grid-cols-3 gap-3">
                            <button className="flex items-center justify-center px-4 py-3 transition rounded-lg glass hover:border-purple-500 card-hover">
                                <span className="text-xl">🐙</span>
                            </button>
                            <button className="flex items-center justify-center px-4 py-3 transition rounded-lg glass hover:border-purple-500 card-hover">
                                <span className="text-xl">G</span>
                            </button>
                            <button className="flex items-center justify-center px-4 py-3 transition rounded-lg glass hover:border-purple-500 card-hover">
                                <span className="text-xl">in</span>
                            </button>
                        </div>
                    </div>

                {/* Sign Up Link */}
                <p className="mt-6 text-center text-gray-400">
                    Don't have an account?{' '}
                    <Link to="/signup" className="font-semibold text-purple-400 transition hover:text-purple-300">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
