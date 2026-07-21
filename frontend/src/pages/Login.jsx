import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/userApi';

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

            // Comprehensive storage sync for session persistence
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userRole', role);
            sessionStorage.setItem('user', JSON.stringify(user));
            sessionStorage.setItem('token', token);

            // Notify app of state change
            window.dispatchEvent(new Event('user-update'));


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
            const msg = err?.response?.data?.error?.message || err?.response?.data?.detail || err?.message || 'Login failed. Please check your credentials.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };


    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full overflow-x-hidden px-4 py-8 bg-navy-900">
            <div className="w-full max-w-sm">
                {/* Back Button */}
                <Link
                    to="/"
                    className="flex items-center gap-2 mb-4 text-gray-300 transition hover:text-white group"
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

                {/* Logo & Title */}
                <div className="mb-5 text-center">
                    <img src="/proeduvatee-removebg-preview.png" alt="ProEduvate" className="h-12 mx-auto mb-2" />
                    <h2 className="mb-1 text-xl font-bold sm:text-2xl text-white">Welcome Back</h2>
                    <p className="text-xs text-gray-400">Sign in to continue to ProEduvate</p>
                </div>

                {/* Login Form - Glass Effect */}
                <div className="p-4 glass-strong rounded-xl sm:p-5 glow-blue-hover">
                    {error && (
                        <div className="p-2 mb-3 text-xs text-center text-red-400 border border-red-500/30 rounded-lg bg-red-500/10">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block mb-1 text-xs font-medium text-gray-300">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 text-sm text-white placeholder-gray-500 transition border border-gray-600 rounded-lg bg-navy-900/50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                placeholder="you@example.com"
                            />
                        </div>

                        {/* Password Field */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label htmlFor="password" className="block text-xs font-medium text-gray-300">
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-xs text-blue-400 transition hover:text-blue-300">
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
                                    className="w-full px-3 py-2 text-sm text-white placeholder-gray-500 transition border border-gray-600 rounded-lg bg-navy-900/50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-10"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-blue-400 transition-colors"
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
                                className="w-4 h-4 text-blue-600 border-gray-600 rounded bg-navy-900 focus:ring-blue-500"
                            />
                            <label htmlFor="remember" className="ml-2 text-xs text-gray-400">
                                Remember me
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-2 text-sm font-semibold text-white rounded-lg bg-blue-600 hover:bg-blue-700 btn-hover flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 text-gray-400 bg-transparent">Or continue with</span>
                            </div>
                        </div>

                        {/* Social Login */}
                        <div className="grid grid-cols-3 gap-2">
                            <button className="flex items-center justify-center px-3 py-1.5 transition rounded-lg glass hover:border-blue-500 card-hover">
                                <span className="text-lg">🐙</span>
                            </button>
                            <button className="flex items-center justify-center px-3 py-1.5 transition rounded-lg glass hover:border-blue-500 card-hover">
                                <span className="text-lg">G</span>
                            </button>
                            <button className="flex items-center justify-center px-3 py-1.5 transition rounded-lg glass hover:border-blue-500 card-hover">
                                <span className="text-lg">in</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sign Up Link */}
                <p className="mt-4 text-xs text-center text-gray-400">
                    Don't have an account?{' '}
                    <Link to="/signup" className="font-semibold text-blue-400 transition hover:text-blue-300">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
