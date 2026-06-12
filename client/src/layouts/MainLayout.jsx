import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function MainLayout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <Sidebar onLogout={logout} />
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
}

export default MainLayout;
