import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { ArrowLeft } from "lucide-react";

function EmployeeProfile() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchEmployee(); fetchAttendance(); fetchAdvances(); fetchOvertime(); fetchPayments();
  }, []);

  async function fetchEmployee() {
    try { const r = await axios.get(`https://employee-payroll-system-production-9563.up.railway.app/api/employees/${id}`); setEmployee(r.data); }
    catch (e) { console.log(e); }
  }
  async function fetchAttendance() {
    try { const r = await axios.get(`https://employee-payroll-system-production-9563.up.railway.app/api/attendance/employee/${id}`); setAttendance(r.data); }
    catch (e) { console.log(e); }
  }
  async function fetchAdvances() {
    try { const r = await axios.get(`https://employee-payroll-system-production-9563.up.railway.app/api/advances/employee/${id}`); setAdvances(r.data); }
    catch (e) { console.log(e); }
  }
  async function fetchOvertime() {
    try { const r = await axios.get(`https://employee-payroll-system-production-9563.up.railway.app/api/overtime/employee/${id}`); setOvertime(r.data); }
    catch (e) { console.log(e); }
  }
  async function fetchPayments() {
    try { const r = await axios.get(`https://employee-payroll-system-production-9563.up.railway.app/api/payments/employee/${id}`); setPayments(r.data); }
    catch (e) { console.log(e); }
  }

  if (!employee) return <p style={{ color: "var(--text-secondary)", padding: "40px" }}>Loading...</p>;

  const presentDays = attendance.filter((a) => a.status === "Present").length;
  const grossSalary = presentDays * employee.wage;
  const totalAdvances = advances.reduce((s, a) => s + a.amount, 0);
  const totalOvertime = overtime.reduce((s, o) => s + o.hours * o.rate, 0);
  const netSalary = grossSalary + totalOvertime - totalAdvances;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = netSalary > totalPaid ? netSalary - totalPaid : 0;
  const excess = totalPaid > netSalary ? totalPaid - netSalary : 0;

  // Monthly attendance summary — group by YYYY-MM
  const MONTH_NAMES = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthlyAttendance = (() => {
    const map = {};
    attendance.forEach((r) => {
      const key = r.date.slice(0, 7); // YYYY-MM
      if (!map[key]) map[key] = { present: 0, absent: 0 };
      if (r.status === "Present") map[key].present++;
      else map[key].absent++;
    });
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, val]) => {
        const [yyyy, mm] = key.split("-");
        return { label: `${MONTH_NAMES[parseInt(mm)]} ${yyyy}`, ...val };
      });
  })();

  return (
    <>
      {/* Back */}
      <Link to="/employees" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent)", fontSize: "14px", marginBottom: "24px" }}>
        <ArrowLeft size={14} /> Back to Employees
      </Link>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--accent-glow)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "700", color: "var(--accent)" }}>
            {employee.name.charAt(0)}
          </div>
          <div>
            <h1 style={{ marginBottom: "2px" }}>{employee.name}</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{employee.position} · {employee.department}</p>
          </div>
          <span className={`badge ${employee.status === "Active" ? "badge-green" : "badge-red"}`} style={{ marginLeft: "auto" }}>
            {employee.status}
          </span>
        </div>
      </div>

      {/* Info cards */}
      <div className="dashboard-cards" style={{ marginBottom: "24px" }}>
        <div className="card"><h2>Position</h2><h1 style={{ fontSize: "20px" }}>{employee.position}</h1></div>
        <div className="card"><h2>Department</h2><h1 style={{ fontSize: "20px" }}>{employee.department}</h1></div>
        <div className="card"><h2>Daily Wage</h2><h1 style={{ fontSize: "20px" }}>₹{employee.wage}</h1></div>
        <div className="card"><h2>Status</h2><h1 style={{ fontSize: "20px", color: employee.status === "Active" ? "var(--green)" : "var(--red)" }}>{employee.status}</h1></div>
      </div>

      {/* Salary Summary */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <h2 style={{ marginBottom: "20px" }}>Salary Summary — All Time</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "20px" }}>
          {[
            { label: "Present Days", value: presentDays, unit: "days" },
            { label: "Gross Salary", value: `₹${grossSalary.toLocaleString()}`, color: "var(--text-primary)" },
            { label: "Overtime", value: `₹${totalOvertime.toLocaleString()}`, color: "var(--accent)" },
            { label: "Advances", value: `₹${totalAdvances.toLocaleString()}`, color: "var(--amber)" },
            { label: "Net Salary", value: `₹${netSalary.toLocaleString()}`, color: netSalary >= 0 ? "var(--green)" : "var(--red)" },
            { label: "Total Paid", value: `₹${totalPaid.toLocaleString()}`, color: "var(--green)" },
            ...(remaining > 0 ? [{ label: "Remaining", value: `₹${remaining.toLocaleString()}`, color: "var(--amber)" }] : []),
            ...(excess > 0 ? [{ label: "Excess Paid", value: `₹${excess.toLocaleString()}`, color: "var(--purple)" }] : []),
          ].map((item) => (
            <div key={item.label}>
              <p style={{ color: "var(--text-tertiary)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{item.label}</p>
              <p style={{ color: item.color || "var(--text-primary)", fontSize: "20px", fontWeight: "700" }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Attendance Summary */}
      {monthlyAttendance.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ marginBottom: "12px", fontSize: "15px" }}>Monthly Attendance Summary</h2>
          <div className="table-container">
            <table className="employee-table">
              <thead>
                <tr><th>Month</th><th>Present</th><th>Absent</th><th>Total Days Marked</th></tr>
              </thead>
              <tbody>
                {monthlyAttendance.map((m, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: "600" }}>{m.label}</td>
                    <td><span className="badge badge-green">{m.present}</span></td>
                    <td><span className="badge badge-red">{m.absent}</span></td>
                    <td style={{ color: "var(--text-secondary)" }}>{m.present + m.absent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History tables */}
      {[
        {
          title: "Attendance History",
          headers: ["Date", "Status"],
          rows: attendance,
          empty: "No attendance records",
          render: (r, i) => (
            <tr key={i}>
              <td style={{ color: "var(--text-secondary)" }}>{r.date}</td>
              <td><span className={`badge ${r.status === "Present" ? "badge-green" : "badge-red"}`}>{r.status}</span></td>
            </tr>
          ),
        },
        {
          title: "Advance History",
          headers: ["Date", "Amount", "Reason"],
          rows: advances,
          empty: "No advance records",
          render: (r, i) => (
            <tr key={i}>
              <td style={{ color: "var(--text-secondary)" }}>{r.date}</td>
              <td><span className="badge badge-amber">₹{r.amount.toLocaleString()}</span></td>
              <td style={{ color: "var(--text-secondary)" }}>{r.reason || "—"}</td>
            </tr>
          ),
        },
        {
          title: "Overtime History",
          headers: ["Date", "Hours", "Rate/Hr", "Amount"],
          rows: overtime,
          empty: "No overtime records",
          render: (r, i) => (
            <tr key={i}>
              <td style={{ color: "var(--text-secondary)" }}>{r.date}</td>
              <td>{r.hours}</td>
              <td style={{ color: "var(--text-secondary)" }}>₹{r.rate}</td>
              <td><span className="badge badge-blue">₹{(r.hours * r.rate).toLocaleString()}</span></td>
            </tr>
          ),
        },
        {
          title: "Payment History",
          headers: ["Date", "Amount", "Category", "Note"],
          rows: payments,
          empty: "No payment records",
          render: (r, i) => (
            <tr key={i}>
              <td style={{ color: "var(--text-secondary)" }}>{r.date}</td>
              <td><span className="badge badge-green">₹{r.amount.toLocaleString()}</span></td>
              <td>{r.category ? <span className="badge badge-blue">{r.category}</span> : <span style={{ color: "var(--text-tertiary)" }}>—</span>}</td>
              <td style={{ color: "var(--text-secondary)" }}>{r.note || "—"}</td>
            </tr>
          ),
        },
      ].map((section) => (
        <div key={section.title} style={{ marginBottom: "24px" }}>
          <h2 style={{ marginBottom: "12px", fontSize: "15px" }}>{section.title}</h2>
          <div className="table-container">
            <table className="employee-table">
              <thead><tr>{section.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {section.rows.length === 0
                  ? <tr><td colSpan={section.headers.length} className="empty-state">{section.empty}</td></tr>
                  : section.rows.map(section.render)}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}

export default EmployeeProfile;
