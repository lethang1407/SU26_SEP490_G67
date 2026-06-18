
import LoginPage from '../../features/auth/pages/LoginPage'
import PublicLayout from '../../components/layouts/PublicLayout'
import PublicHome from './PublicHome'
import NotFound from './NotFound'
import ForgotPasswordPage from '../../features/auth/pages/ForgotPasswordPage'
import VerifyOtpPage from '../../features/auth/pages/VerifyOtpPage'
import ResetPasswordPage from '../../features/auth/pages/ResetPasswordPage'
const publicRoutes = [
	{
		element: <PublicLayout />,
		children: [
			{ path: '/', element: <PublicHome /> },
			{ path: '/login', element: <LoginPage /> },
			{ path: '/forgot-password', element: <ForgotPasswordPage /> },
			{ path: '/verify-otp', element: <VerifyOtpPage /> },
			{ path: '/reset-password', element: <ResetPasswordPage /> },
			{ path: '*', element: <NotFound /> },
		],
	},
]

export default publicRoutes
