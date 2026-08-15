import ProfilePage from '../../features/profile/pages/ProfilePage';
import EditProfilePage from '../../features/profile/pages/EditProfilePage';
import ChangePasswordPage from '../../features/profile/pages/ChangePasswordPage';
import ProtectedRoute from './ProtectedRoute';

const profileRoutes = [
	{
		path: '/profile',
		element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
	},
	{
		path: '/profile/edit',
		element: <ProtectedRoute><EditProfilePage /></ProtectedRoute>,
	},
	{
		path: '/profile/change-password',
		element: <ProtectedRoute><ChangePasswordPage /></ProtectedRoute>,
	},
];

export default profileRoutes;
