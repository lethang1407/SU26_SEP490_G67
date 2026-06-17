import { Navigate } from "react-router-dom";
import LoginPage from "../../features/auth/LoginPage";
import NotFound from "../../components/ui/not-found/NotFound";
import SupportPage from "../../components/ui/it-help/SupportPage";

const publicRoutes = [
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "*", element: <NotFound /> },
  { path: "/help", element: <SupportPage /> },
];

export default publicRoutes;