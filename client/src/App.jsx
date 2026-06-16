import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import Attendance from "./pages/Attendance";
import Advances from "./pages/Advances";
import Overtime from "./pages/Overtime";
import Payments from "./pages/Payments";
import Payroll from "./pages/Payroll";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Trash from "./pages/Trash";
import Projects from "./pages/Projects";
import Contracts from "./pages/Contracts";
import EarlyLeave from "./pages/EarlyLeave";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/:id" element={<EmployeeProfile />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="advances" element={<Advances />} />
          <Route path="overtime" element={<Overtime />} />
          <Route path="payments" element={<Payments />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="trash" element={<Trash />} />
          <Route path="projects" element={<Projects />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="earlyleave" element={<EarlyLeave />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
