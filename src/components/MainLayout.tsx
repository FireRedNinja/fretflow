import { Outlet } from "react-router";
import Navbar from "./Navbar";
import Header from "./Header";

const MainLayout = () => (
  <div className="flex flex-col h-screen">
    <Header />
    <Navbar />
    <main className="flex-1 overflow-y-auto bg-white">
      <Outlet />
    </main>
  </div>
);

export default MainLayout;
