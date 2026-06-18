import ProfilePage from '../../features/profile/pages/ProfilePage';
import EditProfilePage from '../../features/profile/pages/EditProfilePage';
import ChangePasswordPage from '../../features/profile/pages/ChangePasswordPage';

const profileRoutes = [
	{
		path: '/profile',
		element: <ProfilePage />,
	},
	{
		path: '/profile/edit',
		element: <EditProfilePage />,
	},
	{
		path: '/profile/change-password',
		element: <ChangePasswordPage />,
	},
];

export default profileRoutes;
