import { Navigate } from "react-router-dom";
import LoginPage from "../../features/auth/pages/LoginPage";
import ForgotPasswordPage from "../../features/auth/pages/ForgotPasswordPage";
import VerifyOtpPage from "../../features/auth/pages/VerifyOtpPage";
import ResetPasswordPage from "../../features/auth/pages/ResetPasswordPage";
import NotFound from "../../components/ui/not-found/NotFound";
import SupportPage from "../../components/ui/it-help/SupportPage";

const publicRoutes = [
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/logout", element: <LoginPage /> },
  { path: "/help", element: <SupportPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/verify-otp', element: <VerifyOtpPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: "*", element: <NotFound /> },
];

export default publicRoutes;