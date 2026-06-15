import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, Wallet,
  Clock3, BadgeIndianRupee, CreditCard, FileText, LogOut, Settings, Trash2, MapPin,
} from "lucide-react";

function Sidebar({ onLogout }) {
  return (
    <div className="sidebar">

      <div style={{ padding: "12px 12px 20px 12px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "20px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ width: "100%", borderRadius: "10px", overflow: "hidden", background: "#f97020" }}>
          <img src="/stc_logo.png" alt="Kshethropasana" style={{ width: "100%", height: "60px", objectFit: "contain", objectPosition: "center", display: "block" }} />
        </div>
        <span style={{ fontSize: "9.5px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-tertiary)", paddingLeft: "2px", whiteSpace: "nowrap" }}>
          Payroll Management System
        </span>
      </div>

      <div className="sidebar-section-label">Main</div>
      <ul>
        <li><NavLink to="/" end><LayoutDashboard size={15} /><span>Dashboard</span></NavLink></li>
        <li><NavLink to="/employees"><Users size={15} /><span>Employees</span></NavLink></li>
      </ul>

      <div className="sidebar-section-label">Records</div>
      <ul>
        <li><NavLink to="/attendance"><Calendar size={15} /><span>Attendance</span></NavLink></li>
        <li><NavLink to="/projects"><MapPin size={15} /><span>Projects</span></NavLink></li>
        <li><NavLink to="/advances"><Wallet size={15} /><span>Advances</span></NavLink></li>
        <li><NavLink to="/overtime"><Clock3 size={15} /><span>Overtime</span></NavLink></li>
        <li><NavLink to="/payments"><CreditCard size={15} /><span>Payments</span></NavLink></li>
      </ul>

      <div className="sidebar-section-label">Finance</div>
      <ul>
        <li><NavLink to="/payroll"><BadgeIndianRupee size={15} /><span>Payroll</span></NavLink></li>
        <li><NavLink to="/reports"><FileText size={15} /><span>Reports</span></NavLink></li>
      </ul>

      <div className="sidebar-section-label">System</div>
      <ul>
        <li><NavLink to="/settings"><Settings size={15} /><span>Settings</span></NavLink></li>
        <li><NavLink to="/trash"><Trash2 size={15} /><span>Trash</span></NavLink></li>
      </ul>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={15} /><span>Sign out</span>
        </button>
        <p style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: "14px", lineHeight: "1.6", paddingLeft: "4px" }}>
          Developed by <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>Sujal VS</span><br />
          © {new Date().getFullYear()} All rights reserved.
        </p>
      </div>

    </div>
  );
}

export default Sidebar;
