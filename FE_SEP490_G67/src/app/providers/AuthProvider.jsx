import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
    const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));
    const [authenticated, setAuthenticated] = useState(() => !!localStorage.getItem('accessToken'));

    const login = (authResult) => {
        if (!authResult || !authResult.token || !authResult.authenticated) {
            logout();
            throw new Error('Authentication failed: Invalid response from server.');
        }

        const { token } = authResult;

        setAccessToken(token);
        setAuthenticated(true);
        localStorage.setItem('accessToken', token);
    };

    const logout = () => {
        setAccessToken(null);
        setAuthenticated(false);
        localStorage.removeItem('accessToken');
    };

    const contextValue = {
        accessToken,
        authenticated,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
