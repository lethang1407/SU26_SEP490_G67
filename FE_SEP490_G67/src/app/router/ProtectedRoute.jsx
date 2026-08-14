import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../providers/AuthProvider';

export default function ProtectedRoute({ children, requiredPermission, requiredRole }) {
    const { authenticated, loadingUser, hasPermission, hasRole } = useContext(AuthContext);

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

    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    if (requiredRole && !hasRole(requiredRole)) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return children;
}
