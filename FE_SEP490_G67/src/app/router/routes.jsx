import { createBrowserRouter } from "react-router-dom";
import publicRoutes from "./public.routes";
import adminRoutes, { posRoutes } from "./admin.routes";
import profileRoutes from "./profile.routes";
import AdminLayout from "../../components/layouts/AdminLayout";

const routes = createBrowserRouter([
  ...publicRoutes,
  ...posRoutes,
  {
    element: <AdminLayout />,
    children: [...adminRoutes, ...profileRoutes],
  },
]);

export default routes;
