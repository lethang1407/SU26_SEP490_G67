import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../providers/AuthProvider';
import { getRoutePermissionConfig, getDefaultLandingPath } from '../config/routePermissions';

export default function ProtectedRoute({ children, requiredPermission, requiredRole }) {
    const { authenticated, loadingUser, user, hasPermission, hasRole } = useContext(AuthContext);
    const location = useLocation();

    if (!authenticated) {
        return <Navigate to="/login" replace />;
    }

    if (loadingUser) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div>Đang tải thông tin người dùng...</div>
            </div>
        );
    }

    // Dynamic resolution from routePermissions registry if props are not explicitly provided
    const routeConfig = getRoutePermissionConfig(location.pathname);
    const permToCheck = requiredPermission ?? routeConfig?.permission;
    const roleToCheck = requiredRole ?? routeConfig?.role;

    const isPermAllowed = !permToCheck || hasPermission(permToCheck);
    const isRoleAllowed = !roleToCheck || hasRole(roleToCheck);

    if (!isPermAllowed || !isRoleAllowed) {
        const fallbackPath = getDefaultLandingPath(hasRole, hasPermission, user);
        if (location.pathname === fallbackPath) {
            return <Navigate to="/profile" replace />;
        }
        return <Navigate to={fallbackPath} replace />;
    }

    return children;
}
