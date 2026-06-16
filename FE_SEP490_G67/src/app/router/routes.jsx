import { createBrowserRouter } from "react-router-dom";
import publicRoutes from "./public.routes";
import adminRoutes from "./admin.routes";
import profileRoutes from "./profile.routes";

const routes = createBrowserRouter([
  ...publicRoutes,
  ...adminRoutes,
  ...profileRoutes,
]);

export default routes;
