import { Outlet } from "react-router-dom";
import Header from "../ui/header-footer/Header";
import Footer from "../ui/header-footer/Footer";

const PublicLayout = () => {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

export default PublicLayout;
