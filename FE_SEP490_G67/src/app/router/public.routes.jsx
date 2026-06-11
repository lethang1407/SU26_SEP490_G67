
import LoginPage from '../../features/auth/LoginPage'
import PublicLayout from '../../components/layouts/PublicLayout'
import PublicHome from './PublicHome'
import NotFound from './NotFound'

const publicRoutes = [
	{
		element: <PublicLayout />,
		children: [
			{ path: '/', element: <PublicHome /> },
			{ path: '/login', element: <LoginPage /> },
			{ path: '*', element: <NotFound /> },
		],
	},
]

export default publicRoutes
