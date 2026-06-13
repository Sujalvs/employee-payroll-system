import API from "../api.js";
import { useEffect, useState } from "react";
import axios from "axios";
import { Users, UserCheck, UserX, BadgeIndianRupee, Wallet, Clock3, CreditCard, X, Phone, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import DatePicker from "../components/DatePicker";

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "12px", padding: "10px 16px", fontSize: "13px" }}>
        <p style={{ color: "#86868b", marginBottom: "4px" }}>{label}</p>
        <p style={{ color: "#0a84ff", fontWeight: "700" }}>₹{payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
}

function AttendanceModal({ type, employees, date, onClose, onDateChange }) {
  const isPresent = type === "present";
  const isNotMarked = type === "notmarked";

  const color = isPresent ? "var(--green)" : isNotMarked ? "var(--amber)" : "var(--red)";
  const badgeClass = isPresent ? "badge-green" : isNotMarked ? "badge-amber" : "badge-red";
  const title = isPresent ? "Present" : isNotMarked ? "Not Marked Yet" : "Absent";

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(8px)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#111111", border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "24px", padding: "32px", width: "100%", maxWidth: "500px",
        maxHeight: "75vh", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "4px" }}>{title} Employees</h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              {isNotMarked ? "Active employees with no attendance entry for this date" : "Select any date to check"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "var(--bg-hover)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <DatePicker value={date} onChange={onDateChange} placeholder="Select date" />
        </div>

        <div style={{ marginBottom: "12px" }}>
          <span className={`badge ${badgeClass}`} style={{ fontSize: "13px", padding: "5px 14px" }}>
            {employees.length} employee{employees.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {employees.length === 0 ? (
            <p style={{ color: "var(--text-tertiary)", fontSize: "14px", textAlign: "center", padding: "32px 0" }}>
              {isNotMarked ? "All employees have been marked for this date ✓" : "No attendance marked for this date"}
            </p>
          ) : employees.map((emp, i) => (
            <div key={emp.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 0",
              borderBottom: i < employees.length - 1 ? "1px solid var(--border-subtle)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: isPresent ? "rgba(48,209,88,0.12)" : isNotMarked ? "rgba(255,214,10,0.12)" : "rgba(255,69,58,0.12)",
                  border: `1px solid ${color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "14px", fontWeight: "700", color, flexShrink: 0,
                }}>
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <p style={{ fontWeight: "600", fontSize: "14px", marginBottom: "2px" }}>{emp.name}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{emp.department}</p>
                </div>
              </div>
              {emp.phone && (
                <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--text-secondary)" }}>
                  <Phone size={12} />{emp.phone}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0, presentToday: 0, absentToday: 0, notMarkedToday: 0,
    totalPayroll: 0, totalAdvances: 0, totalOvertime: 0, totalPayments: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [modal, setModal] = useState(null);
  const [modalEmployees, setModalEmployees] = useState([]);
  const [modalDate, setModalDate] = useState(new Date().toISOString().split(`T`)[0]);

  useEffect(() => { fetchDashboard(); fetchChartData(); }, []);

  async function fetchDashboard() {
    try { const r = await axios.get(`${API}/api/dashboard`); setStats(r.data); }
    catch (e) { console.log(e); }
  }

  async function fetchChartData() {
    try { const r = await axios.get(`${API}/api/dashboard/chart`); setChartData(r.data); }
    catch (e) { console.log(e); }
  }

  async function openModal(type) {
    const today = new Date().toISOString().split(`T")[0];
    setModalDate(today);
    await loadModalData(type, today);
    setModal(type);
  }

  async function loadModalData(type, date) {
    try {
      let endpoint;
      if (type === "present") endpoint = `present-on/${date}`;
      else if (type === `absent`) endpoint = `absent-on/${date}`;
      else endpoint = `not-marked-on/${date}`;
      const r = await axios.get(`${API}/api/employees/${endpoint}`);
      setModalEmployees(r.data);
    } catch (e) { console.log(e); }
  }

  async function handleModalDateChange(newDate) {
    setModalDate(newDate);
    await loadModalData(modal, newDate);
  }

  const currentMonth = new Date().toLocaleString(`default`, { month: "long", year: "numeric" });

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">Overview of your workforce and payroll activity</p>
      </div>

      <p className="section-label" style={{ marginTop: 0 }}>Workforce</p>
      <div className="dashboard-cards">
        <div className="card">
          <Users size={20} /><h2>Active Employees</h2><h1>{stats.totalEmployees}</h1>
        </div>
        <div className="card" onClick={() => openModal("present")} style={{ cursor: "pointer" }}>
          <UserCheck size={20} /><h2>Present Today</h2>
          <h1 style={{ color: "var(--green)" }}>{stats.presentToday}</h1>
          <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "8px" }}>Click to view list →</p>
        </div>
        <div className="card" onClick={() => openModal("absent")} style={{ cursor: "pointer" }}>
          <UserX size={20} /><h2>Absent Today</h2>
          <h1 style={{ color: "var(--red)" }}>{stats.absentToday}</h1>
          <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "8px" }}>Click to view list →</p>
        </div>
        {/* Not marked yet — only shows when there are unmarked active employees */}
        <div
          className="card"
          onClick={() => openModal("notmarked")}
          style={{ cursor: "pointer", borderColor: stats.notMarkedToday > 0 ? "rgba(255,214,10,0.3)" : "var(--border-subtle)" }}
        >
          <AlertCircle size={20} style={{ color: stats.notMarkedToday > 0 ? "var(--amber)" : "var(--text-tertiary)" }} />
          <h2>Not Marked Yet</h2>
          <h1 style={{ color: stats.notMarkedToday > 0 ? "var(--amber)" : "var(--text-tertiary)" }}>
            {stats.notMarkedToday}
          </h1>
          <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "8px" }}>
            {stats.notMarkedToday > 0 ? "Click to see who →" : "All marked ✓"}
          </p>
        </div>
        <div className="card">
          <BadgeIndianRupee size={20} /><h2>Daily Payroll</h2><h1>₹{stats.totalPayroll?.toLocaleString()}</h1>
        </div>
      </div>

      <p className="section-label">{currentMonth}</p>
      <div className="dashboard-cards">
        <div className="card"><Wallet size={20} /><h2>Total Advances</h2><h1 style={{ color: "var(--amber)" }}>₹{stats.totalAdvances?.toLocaleString()}</h1></div>
        <div className="card"><Clock3 size={20} /><h2>Total Overtime</h2><h1 style={{ color: "var(--accent)" }}>₹{stats.totalOvertime?.toLocaleString()}</h1></div>
        <div className="card"><CreditCard size={20} /><h2>Total Payments</h2><h1 style={{ color: "var(--green)" }}>₹{stats.totalPayments?.toLocaleString()}</h1></div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 style={{ marginBottom: "24px" }}>Payroll Trend — Last 6 Months</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" stroke="transparent" tick={{ fill: "#86868b", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis stroke="transparent" tick={{ fill: "#86868b", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
            <Line type="monotone" dataKey="payroll" stroke="#0a84ff" strokeWidth={2.5}
              dot={{ fill: "#0a84ff", r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#0a84ff", strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {modal && (
        <AttendanceModal
          type={modal}
          employees={modalEmployees}
          date={modalDate}
          onDateChange={handleModalDateChange}
          onClose={() => { setModal(null); setModalEmployees([]); }}
        />
      )}
    </>
  );
}

export default Dashboard;
