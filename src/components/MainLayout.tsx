import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import Header from "./Header";

const MainLayout = () => (
  <div className="flex flex-col h-screen">
    <Header />
    <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-white">
        <Outlet />
      </main>
    </div>
  </div>
);

export default MainLayout;