
import Login from '../../features/auth/login'
import PublicLayout from '../../components/layouts/PublicLayout'
import PublicHome from './PublicHome'
import NotFound from './NotFound'

const publicRoutes = [
	{
		element: <PublicLayout />,
		children: [
			{ path: '/', element: <PublicHome /> },
			{ path: '/login', element: <Login /> },
			{ path: '*', element: <NotFound /> },
		],
	},
]

export default publicRoutes
