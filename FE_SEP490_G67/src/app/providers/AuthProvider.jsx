import { createContext, useState, useEffect, useCallback } from 'react';
import auth from '@/features/auth/api';
import { getProfile } from '@/features/profile/api';

export const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));
    const [authenticated, setAuthenticated] = useState(() => !!localStorage.getItem('accessToken'));
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    const fetchUserProfile = useCallback(async () => {
        if (!localStorage.getItem('accessToken')) {
            setUser(null);
            setLoadingUser(false);
            return;
        }
        try {
            setLoadingUser(true);
            const profile = await getProfile();
            setUser(profile);
        } catch (error) {
            console.error('Failed to load user profile:', error);
            setUser(null);
        } finally {
            setLoadingUser(false);
        }
    }, []);

    useEffect(() => {
        if (authenticated) {
            fetchUserProfile();
        } else {
            setUser(null);
            setLoadingUser(false);
        }
    }, [authenticated, fetchUserProfile]);

    const login = (authResult) => {
        if (!authResult || !authResult.token || !authResult.authenticated) {
            logout();
            throw new Error('Authentication failed: Invalid response from server.');
        }

        const { token } = authResult;

        setAccessToken(token);
        setAuthenticated(true);
        localStorage.setItem('accessToken', token);
        fetchUserProfile();
    };

    const logout = async () => {
        try {
            await auth.logout();
        } catch (error) {
            console.error('Logout API error:', error);
        } finally {
            setAccessToken(null);
            setAuthenticated(false);
            setUser(null);
            localStorage.removeItem('accessToken');
        }
    };

    const hasPermission = useCallback((perm) => {
        if (!perm) return true;
        if (!user) return false;
        if (user.roles?.includes('ADMIN') || user.roles?.includes('ROLE_ADMIN')) return true;
        if (Array.isArray(perm)) {
            return perm.some(p => user.permissions?.includes(p));
        }
        return user.permissions?.includes(perm);
    }, [user]);

    const hasRole = useCallback((role) => {
        if (!role) return true;
        if (!user) return false;
        if (Array.isArray(role)) {
            return role.some(r => user.roles?.includes(r));
        }
        return user.roles?.includes(role);
    }, [user]);

    const contextValue = {
        accessToken,
        authenticated,
        user,
        loadingUser,
        login,
        logout,
        hasPermission,
        hasRole,
        refreshProfile: fetchUserProfile
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
