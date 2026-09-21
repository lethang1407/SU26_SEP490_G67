import { createContext, useState, useEffect, useCallback } from 'react';
import auth from '@/features/auth/api';
import { getProfile } from '@/features/profile/api';
import { useCacheWarmup } from '@/hooks/useCacheWarmup';

export const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));
    const [authenticated, setAuthenticated] = useState(() => !!localStorage.getItem('accessToken'));
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    // Warm up offline cache when user is authenticated
    useCacheWarmup(authenticated);

    const fetchUserProfile = useCallback(async () => {
        if (!localStorage.getItem('accessToken')) {
            setUser(null);
            setLoadingUser(false);
            return null;
        }
        try {
            setLoadingUser(true);
            const profile = await getProfile();
            setUser(profile);
            return profile;
        } catch (error) {
            console.error('Failed to load user profile:', error);
            setUser(null);
            return null;
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

    const login = async (authResult) => {
        if (!authResult || !authResult.token || !authResult.authenticated) {
            logout();
            throw new Error('Authentication failed: Invalid response from server.');
        }

        const { token } = authResult;

        setAccessToken(token);
        setAuthenticated(true);
        localStorage.setItem('accessToken', token);
        return await fetchUserProfile();
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

        const userRoles = Array.isArray(user.roles) ? user.roles : [];
        const isManager = userRoles.some(r => {
            const clean = String(r).replace(/^ROLE_/, '').toUpperCase();
            return clean === 'MANAGER' || clean === 'ADMIN';
        });
        if (isManager) return true;

        const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
        if (Array.isArray(perm)) {
            return perm.some(p => userPerms.includes(p));
        }
        return userPerms.includes(perm);
    }, [user]);

    const hasRole = useCallback((role) => {
        if (!role) return true;
        if (!user) return false;

        const userRoles = Array.isArray(user.roles) ? user.roles : [];
        const normalizedUserRoles = userRoles.map(r => String(r).replace(/^ROLE_/, '').toUpperCase());

        if (Array.isArray(role)) {
            return role.some(r => {
                const clean = String(r).replace(/^ROLE_/, '').toUpperCase();
                return normalizedUserRoles.includes(clean);
            });
        }
        const clean = String(role).replace(/^ROLE_/, '').toUpperCase();
        return normalizedUserRoles.includes(clean);
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
