import { createBrowserRouter } from "react-router-dom";
import publicRoutes from "./public.routes";
import adminRoutes from "./admin.routes";
const routes = createBrowserRouter([
  ...publicRoutes,
  ...adminRoutes,
]);

export default routes;
