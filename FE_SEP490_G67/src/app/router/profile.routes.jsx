import ProfilePage from '../../features/profile/pages/ProfilePage';
import EditProfilePage from '../../features/profile/pages/EditProfilePage';

const profileRoutes = [
	{
		path: '/profile',
		element: <ProfilePage />,
	},
	{
		path: '/profile/edit',
		element: <EditProfilePage />,
	},
];

export default profileRoutes;
