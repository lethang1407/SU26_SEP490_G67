import { Navigate } from "react-router-dom";
import LoginPage from "../../features/auth/LoginPage";
import NotFound from "../../components/ui/not-found/NotFound";

const publicRoutes = [
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "*", element: <NotFound /> },
];

export default publicRoutes;