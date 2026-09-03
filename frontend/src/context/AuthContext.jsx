import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken } from '../api/userApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    const [token, setToken] = useState(() => {
        return sessionStorage.getItem('token') || localStorage.getItem('token') || null;
    });

    const [userRole, setUserRole] = useState(() => {
        return sessionStorage.getItem('userRole') || localStorage.getItem('userRole') || null;
    });

    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const loggedIn = sessionStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('isLoggedIn') === 'true';
        const hasToken = !!(sessionStorage.getItem('token') || localStorage.getItem('token'));
        return loggedIn && hasToken;
    });

    const [isLoading, setIsLoading] = useState(true);

    const hydrateFromStorage = useCallback(() => {
        try {
            const storedToken = sessionStorage.getItem('token') || localStorage.getItem('token');
            const storedUserRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
            const storedRole = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
            const storedLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('isLoggedIn') === 'true';

            if (storedToken && storedUserRaw) {
                const parsedUser = JSON.parse(storedUserRaw);
                const role = storedRole || parsedUser.role;

                // Sync both storages
                sessionStorage.setItem('token', storedToken);
                sessionStorage.setItem('user', JSON.stringify(parsedUser));
                sessionStorage.setItem('userRole', role);
                sessionStorage.setItem('isLoggedIn', 'true');

                localStorage.setItem('token', storedToken);
                localStorage.setItem('user', JSON.stringify(parsedUser));
                localStorage.setItem('userRole', role);
                localStorage.setItem('isLoggedIn', 'true');

                setToken(storedToken);
                setUser(parsedUser);
                setUserRole(role);
                setIsAuthenticated(true);
                setAuthToken(storedToken);
            } else {
                setToken(null);
                setUser(null);
                setUserRole(null);
                setIsAuthenticated(false);
                setAuthToken(null);
            }
        } catch (e) {
            console.error('[AuthContext] Hydration error:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        hydrateFromStorage();

        const handleUserUpdate = () => {
            hydrateFromStorage();
        };

        const handleStorageChange = (e) => {
            if (['token', 'user', 'userRole', 'isLoggedIn'].includes(e.key)) {
                hydrateFromStorage();
            }
        };

        window.addEventListener('user-update', handleUserUpdate);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('user-update', handleUserUpdate);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [hydrateFromStorage]);

    const loginUser = (userData, authToken) => {
        const role = userData.role;
        const userJson = JSON.stringify(userData);

        sessionStorage.setItem('token', authToken);
        sessionStorage.setItem('user', userJson);
        sessionStorage.setItem('userRole', role);
        sessionStorage.setItem('isLoggedIn', 'true');

        localStorage.setItem('token', authToken);
        localStorage.setItem('user', userJson);
        localStorage.setItem('userRole', role);
        localStorage.setItem('isLoggedIn', 'true');

        setToken(authToken);
        setUser(userData);
        setUserRole(role);
        setIsAuthenticated(true);
        setAuthToken(authToken);

        window.dispatchEvent(new Event('user-update'));
    };

    const logoutUser = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('isLoggedIn');

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('rememberedEmail');

        setToken(null);
        setUser(null);
        setUserRole(null);
        setIsAuthenticated(false);
        setAuthToken(null);

        window.dispatchEvent(new Event('user-update'));
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                userRole,
                isAuthenticated,
                isLoading,
                loginUser,
                logoutUser,
                refreshAuth: hydrateFromStorage
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
