import { Navigate } from "react-router-dom";
import LoginPage from "../../features/auth/LoginPage";
import PublicLayout from "../../components/layouts/PublicLayout";
import NotFound from "../../components/ui/not-found/NotFound";

const publicRoutes = [
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <Navigate to="/login" replace /> },
      { path: "/login", element: <LoginPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
];

export default publicRoutes;
