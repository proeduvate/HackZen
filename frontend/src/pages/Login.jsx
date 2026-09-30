import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/userApi';
import ThemeToggle from '../components/ThemeToggle';

const getLoginErrorMessage = (error) => {
    if (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        return 'Unable to connect to the server. Please try again.';
    }

    if (error.response.status === 401) {
        return 'Invalid email or password.';
    }

    if (error.response.status >= 500) {
        return 'Something went wrong. Please try again later.';
    }

    return error.response?.data?.error?.message || error.response?.data?.detail || 'Unable to sign in. Please check your details and try again.';
};

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: localStorage.getItem('rememberedEmail') || '',
        password: ''
    });
    const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('rememberedEmail'));

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [socialLoading, setSocialLoading] = useState('');

    const completeLogin = (response) => {
        const { token, user } = response;
        const storageData = { isLoggedIn: 'true', userRole: user.role, user: JSON.stringify(user), token };
        Object.entries(storageData).forEach(([key, value]) => {
            sessionStorage.setItem(key, value);
            localStorage.setItem(key, value);
        });
        const targetPath = user.role === 'admin' ? '/admin/dashboard' :
            user.role === 'organizer' ? '/organizer/dashboard' :
            user.role === 'mentor' ? '/mentor/dashboard' : '/student/dashboard';
        navigate(targetPath, { replace: true });
        setTimeout(() => window.dispatchEvent(new Event('user-update')), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
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
                email: formData.email.trim().toLowerCase(),
                password: formData.password
            });

            completeLogin(response);
        } catch (err) {
            setError(getLoginErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider) => {
        if (socialLoading || loading) return;
        setError('');
        setSocialLoading(provider);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
        const backendOrigin = new URL(apiUrl).origin;
        const popup = window.open(`${apiUrl}/auth/oauth/${provider}/start`, 'proeduvate-oauth', 'width=520,height=700,noopener=no');
        if (!popup) {
            setSocialLoading('');
            setError('Please allow pop-ups to sign in with a social account.');
            return;
        }
        const receiveOAuthResult = (event) => {
            if (event.origin !== backendOrigin) return;
            if (event.data?.type === 'proeduvate-oauth-success') {
                window.removeEventListener('message', receiveOAuthResult);
                setSocialLoading('');
                completeLogin(event.data);
            } else if (event.data?.type === 'proeduvate-oauth-error') {
                window.removeEventListener('message', receiveOAuthResult);
                setSocialLoading('');
                setError(event.data.message || 'Unable to sign in with this provider.');
            }
        };
        window.addEventListener('message', receiveOAuthResult);
    };

    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative flex items-center justify-center min-h-screen px-4 py-8 bg-slate-50 dark:bg-navy-900 bg-radial transition-colors duration-200">
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

                {/* Logo & Title */}
                <div className="mb-8 text-center">
                    <img src="/proeduvate-dark-text.png" alt="ProEduvate" className="h-20 mx-auto mb-4 dark:hidden" />
                    <img src="/proeduvatee-removebg-preview.png" alt="" aria-hidden="true" className="hidden h-20 mx-auto mb-4 dark:block" />
                    <h2 className="mb-2 text-3xl font-extrabold sm:text-4xl gradient-text">Welcome Back</h2>
                    <p className="text-slate-600 dark:text-gray-400 text-sm">Sign in to continue to ProEduvate</p>
                </div>

                {/* Login Form Card */}
                <div className="p-6 sm:p-8 bg-white/90 dark:bg-navy-900/80 glass-strong rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl glow-purple-hover transition-all duration-300">
                    {error && (
                        <div className="p-3 mb-4 text-sm text-center text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-xl bg-red-50 dark:bg-red-500/10">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
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

                        {/* Password Field */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-gray-300">
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-sm font-semibold text-purple-600 dark:text-purple-400 transition hover:underline">
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
                                    className="w-full px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition border border-slate-300 dark:border-gray-600 rounded-xl bg-white dark:bg-navy-900/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 pr-12 shadow-sm"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 px-4 flex items-center text-slate-400 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
                                className="w-4 h-4 text-purple-600 border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-navy-900 focus:ring-purple-500"
                            />
                            <label htmlFor="remember" className="ml-2 text-sm text-slate-600 dark:text-gray-400">
                                Remember me
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 font-bold text-white rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 btn-hover animate-gradient flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
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

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 text-slate-500 dark:text-gray-400 bg-white dark:bg-navy-900/90 text-xs uppercase tracking-wider font-semibold">Or continue with</span>
                            </div>
                        </div>

                        {/* Social Login */}
                        <div className="grid grid-cols-3 gap-3">
                            <button type="button" onClick={() => handleSocialLogin('github')} disabled={!!socialLoading} aria-label="Continue with GitHub" className="flex items-center justify-center px-4 py-3 transition rounded-xl bg-slate-50 dark:bg-navy-900/40 border border-slate-200 dark:border-white/10 hover:border-purple-500 shadow-sm card-hover disabled:opacity-60">
                                <span className="text-xl">🐙</span>
                            </button>
                            <button type="button" onClick={() => handleSocialLogin('google')} disabled={!!socialLoading} aria-label="Continue with Google" className="flex items-center justify-center px-4 py-3 transition rounded-xl bg-slate-50 dark:bg-navy-900/40 border border-slate-200 dark:border-white/10 hover:border-purple-500 shadow-sm card-hover disabled:opacity-60">
                                <span className="text-xl">G</span>
                            </button>
                            <button type="button" onClick={() => handleSocialLogin('linkedin')} disabled={!!socialLoading} aria-label="Continue with LinkedIn" className="flex items-center justify-center px-4 py-3 transition rounded-xl bg-slate-50 dark:bg-navy-900/40 border border-slate-200 dark:border-white/10 hover:border-purple-500 shadow-sm card-hover disabled:opacity-60">
                                <span className="text-xl">in</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sign Up Link */}
                <p className="mt-6 text-center text-slate-600 dark:text-gray-400 text-sm">
                    Don't have an account?{' '}
                    <Link to="/signup" className="font-bold text-purple-600 dark:text-purple-400 transition hover:underline">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
