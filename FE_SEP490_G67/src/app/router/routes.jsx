import { createBrowserRouter } from "react-router-dom";
import publicRoutes from "./public.routes";
import adminRoutes from "./admin.routes";
import profileRoutes from "./profile.routes";
import AdminLayout from "../../components/layouts/AdminLayout";
import POSScreen from "../../features/pos-screen/pages/POS";

const routes = createBrowserRouter([
  ...publicRoutes,
  {
    element: <AdminLayout />,
    children: [...adminRoutes, ...profileRoutes],
  },
  {
    path: "/admin/pos",
    element: <POSScreen />,
  },
]);

export default routes;
