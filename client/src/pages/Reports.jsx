import { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Printer } from "lucide-react";

const TABS = ["Payroll", "Attendance", "Advances", "Overtime", "Payments"];
const MONTH_NAMES = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

const selectStyle = {
  background: "var(--bg-surface)", color: "var(--text-primary)",
  border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
  padding: "9px 36px 9px 14px", fontSize: "14px", fontFamily: "inherit",
  appearance: "none",
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
};

function Reports() {
  const [activeTab, setActiveTab] = useState("Payroll");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [filterEmployee, setFilterEmployee] = useState("");

  // Employee filter applies to ALL tabs
  const showEmployeeFilter = true;

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    setFilterEmployee(""); // reset employee filter when tab changes
    fetchReport();
  }, [activeTab, month, year]);

  async function fetchEmployees() {
    try {
      const r = await axios.get("http://localhost:8000/api/employees");
      setEmployees(r.data);
    } catch (e) { console.log(e); }
  }

  async function fetchReport() {
    setLoading(true); setData([]);
    try {
      const r = await axios.get(`http://localhost:8000/api/reports/${activeTab.toLowerCase()}?month=${month}&year=${year}`);
      setData(r.data);
    } catch (e) { console.log(e); }
    setLoading(false);
  }

  // Apply employee filter on the frontend
  // Payroll tab uses r.id and r.name; all other tabs use r.employeeId and r.employeeName
  const filteredData = filterEmployee
    ? data.filter((r) =>
        activeTab === "Payroll"
          ? String(r.id) === filterEmployee
          : String(r.employeeId || "") === filterEmployee
      )
    : data;

  function getExcelRows() {
    const d = filteredData;
    if (activeTab === "Payroll") return d.map((r) => ({ Employee: r.name, Department: r.department, "Daily Wage": r.wage, "Present Days": r.presentDays, "Gross Salary": r.grossSalary, Overtime: r.totalOvertime, Advances: r.totalAdvance, "Net Salary": r.netSalary, "Total Paid": r.totalPaid, Remaining: r.remaining, "Excess Paid": r.excess }));
    if (activeTab === "Attendance") return d.map((r) => ({ Employee: r.employeeName, Department: r.department, Date: r.date, Status: r.status }));
    if (activeTab === "Advances") return d.map((r) => ({ Employee: r.employeeName, Department: r.department, Amount: r.amount, Reason: r.reason || "", Date: r.date }));
    if (activeTab === "Overtime") return d.map((r) => ({ Employee: r.employeeName, Department: r.department, Hours: r.hours, "Rate/Hr": r.rate, Amount: r.amount, Date: r.date }));
    if (activeTab === "Payments") return d.map((r) => ({ Employee: r.employeeName, Department: r.department, Amount: r.amount, Note: r.note || "", Date: r.date }));
    return [];
  }

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(getExcelRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const empName = filterEmployee ? employees.find(e => String(e.id) === filterEmployee)?.name : "";
    const suffix = empName ? `_${empName.replace(/ /g,"_")}` : "";
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `${activeTab}_${MONTH_NAMES[month]}_${year}${suffix}.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    const empName = filterEmployee ? employees.find(e => String(e.id) === filterEmployee)?.name : "";
    const title = `${activeTab} Report — ${MONTH_NAMES[month]} ${year}${empName ? ` — ${empName}` : ""}`;
    doc.setFontSize(13);
    doc.text(title, 14, 15);
    let head = [], body = [];
    const d = filteredData;
    if (activeTab === "Payroll") { head = [["Employee","Dept","Wage","Days","Gross","OT","Adv","Net","Paid","Remaining","Excess"]]; body = d.map((r) => [r.name, r.department, r.wage, r.presentDays, r.grossSalary, r.totalOvertime, r.totalAdvance, r.netSalary, r.totalPaid, r.remaining, r.excess]); }
    else if (activeTab === "Attendance") { head = [["Employee","Department","Date","Status"]]; body = d.map((r) => [r.employeeName, r.department, r.date, r.status]); }
    else if (activeTab === "Advances") { head = [["Employee","Department","Amount","Reason","Date"]]; body = d.map((r) => [r.employeeName, r.department, r.amount, r.reason || "", r.date]); }
    else if (activeTab === "Overtime") { head = [["Employee","Department","Hours","Rate/Hr","Amount","Date"]]; body = d.map((r) => [r.employeeName, r.department, r.hours, r.rate, r.amount, r.date]); }
    else if (activeTab === "Payments") { head = [["Employee","Department","Amount","Note","Date"]]; body = d.map((r) => [r.employeeName, r.department, r.amount, r.note || "", r.date]); }
    autoTable(doc, { startY: 24, head, body, styles: { fontSize: 9 }, headStyles: { fillColor: [10, 132, 255] } });
    doc.save(`${activeTab}_${MONTH_NAMES[month]}_${year}${empName ? `_${empName.replace(/ /g,"_")}` : ""}.pdf`);
  }

  function printReport() {
    const empName = filterEmployee ? employees.find(e => String(e.id) === filterEmployee)?.name : "All Employees";
    const title = `${activeTab} Report — ${MONTH_NAMES[month]} ${year} — ${empName}`;
    const d = filteredData;

    let headers = [], rows = [];
    if (activeTab === "Payroll") {
      headers = ["Employee","Department","Wage","Days","Gross","Overtime","Advances","Net Salary","Total Paid","Remaining","Excess"];
      rows = d.map(r => [r.name, r.department, `₹${r.wage}`, r.presentDays, `₹${r.grossSalary}`, `₹${r.totalOvertime}`, `₹${r.totalAdvance}`, `₹${r.netSalary}`, `₹${r.totalPaid}`, r.remaining > 0 ? `₹${r.remaining}` : "—", r.excess > 0 ? `₹${r.excess}` : "—"]);
    } else if (activeTab === "Attendance") {
      headers = ["Employee","Department","Date","Status"];
      rows = d.map(r => [r.employeeName, r.department, r.date, r.status]);
    } else if (activeTab === "Advances") {
      headers = ["Employee","Department","Amount","Reason","Date"];
      rows = d.map(r => [r.employeeName, r.department, `₹${r.amount}`, r.reason || "—", r.date]);
    } else if (activeTab === "Overtime") {
      headers = ["Employee","Department","Hours","Rate/Hr","Amount","Date"];
      rows = d.map(r => [r.employeeName, r.department, r.hours, `₹${r.rate}`, `₹${r.amount}`, r.date]);
    } else if (activeTab === "Payments") {
      headers = ["Employee","Department","Amount","Note","Date"];
      rows = d.map(r => [r.employeeName, r.department, `₹${r.amount}`, r.note || "—", r.date]);
    }

    const tableRows = rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("");
    const tableHeaders = headers.map(h => `<th>${h}</th>`).join("");

    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html><html><head><title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif; color: #111; padding: 32px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        p { color: #666; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #f4f4f5; padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e4e4e7; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; }
        td { padding: 10px 12px; border-bottom: 1px solid #f4f4f5; }
        tr:last-child td { border-bottom: none; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>${title}</h1>
        <p>Generated on ${new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        <table><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table>
        <script>window.onload = () => { window.print(); }<\/script>
      </body></html>
    `);
    win.document.close();
  }

  function renderSummary() {
    const d = filteredData;
    if (!d.length) return null;
    if (activeTab === "Payroll") {
      const totalNet = d.reduce((s, r) => s + r.netSalary, 0);
      const totalPaid = d.reduce((s, r) => s + r.totalPaid, 0);
      const totalRem = d.reduce((s, r) => s + r.remaining, 0);
      return (
        <div className="dashboard-cards" style={{ marginBottom: "20px" }}>
          <div className="card"><h2>Employees</h2><h1>{d.length}</h1></div>
          <div className="card"><h2>Total Net</h2><h1 style={{ color: "var(--green)", fontSize: "26px" }}>₹{totalNet.toLocaleString()}</h1></div>
          <div className="card"><h2>Total Paid</h2><h1 style={{ color: "var(--accent)", fontSize: "26px" }}>₹{totalPaid.toLocaleString()}</h1></div>
          <div className="card"><h2>Remaining</h2><h1 style={{ color: "var(--amber)", fontSize: "26px" }}>₹{totalRem.toLocaleString()}</h1></div>
        </div>
      );
    }
    if (activeTab === "Attendance") {
      const present = d.filter((r) => r.status === "Present").length;
      return (
        <div className="dashboard-cards" style={{ marginBottom: "20px" }}>
          <div className="card"><h2>Total Records</h2><h1>{d.length}</h1></div>
          <div className="card"><h2>Present</h2><h1 style={{ color: "var(--green)" }}>{present}</h1></div>
          <div className="card"><h2>Absent</h2><h1 style={{ color: "var(--red)" }}>{d.length - present}</h1></div>
        </div>
      );
    }
    if (activeTab === "Advances" || activeTab === "Payments") {
      const total = d.reduce((s, r) => s + r.amount, 0);
      return (
        <div className="dashboard-cards" style={{ marginBottom: "20px" }}>
          <div className="card"><h2>Total Records</h2><h1>{d.length}</h1></div>
          <div className="card"><h2>Total Amount</h2><h1 style={{ color: activeTab === "Payments" ? "var(--green)" : "var(--amber)", fontSize: "26px" }}>₹{total.toLocaleString()}</h1></div>
        </div>
      );
    }
    if (activeTab === "Overtime") {
      const totalHrs = d.reduce((s, r) => s + r.hours, 0);
      const totalAmt = d.reduce((s, r) => s + r.amount, 0);
      return (
        <div className="dashboard-cards" style={{ marginBottom: "20px" }}>
          <div className="card"><h2>Total Records</h2><h1>{d.length}</h1></div>
          <div className="card"><h2>Total Hours</h2><h1 style={{ color: "var(--accent)" }}>{totalHrs}</h1></div>
          <div className="card"><h2>Total Amount</h2><h1 style={{ color: "var(--green)", fontSize: "26px" }}>₹{totalAmt.toLocaleString()}</h1></div>
        </div>
      );
    }
    return null;
  }

  function renderTable() {
    if (loading) return <p style={{ color: "var(--text-secondary)", padding: "40px 0", textAlign: "center" }}>Loading...</p>;
    const d = filteredData;
    if (!d.length) return <div className="table-container"><p className="empty-state">No data found</p></div>;

    let headers = [], rows = null;
    if (activeTab === "Payroll") {
      headers = ["Employee","Dept","Wage","Days","Gross","OT","Advances","Net Salary","Total Paid","Remaining","Excess"];
      rows = d.map((r) => (
        <tr key={r.id}>
          <td style={{ fontWeight: "600" }}>{r.name}</td>
          <td style={{ color: "var(--text-secondary)" }}>{r.department}</td>
          <td>₹{r.wage}</td>
          <td>{r.presentDays}</td>
          <td>₹{r.grossSalary?.toLocaleString()}</td>
          <td style={{ color: "var(--accent)" }}>₹{r.totalOvertime?.toLocaleString()}</td>
          <td style={{ color: "var(--amber)" }}>₹{r.totalAdvance?.toLocaleString()}</td>
          <td><span className={`badge ${r.netSalary >= 0 ? "badge-green" : "badge-red"}`}>₹{r.netSalary?.toLocaleString()}</span></td>
          <td><span className="badge badge-blue">₹{r.totalPaid?.toLocaleString()}</span></td>
          <td>{r.remaining > 0 ? <span className="badge badge-amber">₹{r.remaining?.toLocaleString()}</span> : <span style={{ color: "var(--text-tertiary)" }}>—</span>}</td>
          <td>{r.excess > 0 ? <span className="badge badge-purple">₹{r.excess?.toLocaleString()}</span> : <span style={{ color: "var(--text-tertiary)" }}>—</span>}</td>
        </tr>
      ));
    } else if (activeTab === "Attendance") {
      headers = ["Employee","Department","Date","Status"];
      rows = d.map((r) => (
        <tr key={r.id}>
          <td style={{ fontWeight: "500" }}>{r.employeeName}</td>
          <td style={{ color: "var(--text-secondary)" }}>{r.department}</td>
          <td style={{ color: "var(--text-secondary)" }}>{r.date}</td>
          <td><span className={`badge ${r.status === "Present" ? "badge-green" : "badge-red"}`}>{r.status}</span></td>
        </tr>
      ));
    } else if (activeTab === "Advances") {
      headers = ["Employee","Department","Amount","Reason","Date"];
      rows = d.map((r) => (
        <tr key={r.id}>
          <td style={{ fontWeight: "500" }}>{r.employeeName}</td>
          <td style={{ color: "var(--text-secondary)" }}>{r.department}</td>
          <td><span className="badge badge-amber">₹{r.amount?.toLocaleString()}</span></td>
          <td style={{ color: "var(--text-secondary)" }}>{r.reason || "—"}</td>
          <td style={{ color: "var(--text-secondary)" }}>{r.date}</td>
        </tr>
      ));
    } else if (activeTab === "Overtime") {
      headers = ["Employee","Department","Hours","Rate/Hr","Amount","Date"];
      rows = d.map((r) => (
        <tr key={r.id}>
          <td style={{ fontWeight: "500" }}>{r.employeeName}</td>
          <td style={{ color: "var(--text-secondary)" }}>{r.department}</td>
          <td>{r.hours}</td>
          <td>₹{r.rate}</td>
          <td><span className="badge badge-blue">₹{r.amount?.toLocaleString()}</span></td>
          <td style={{ color: "var(--text-secondary)" }}>{r.date}</td>
        </tr>
      ));
    } else if (activeTab === "Payments") {
      headers = ["Employee","Department","Amount","Note","Date"];
      rows = d.map((r) => (
        <tr key={r.id}>
          <td style={{ fontWeight: "500" }}>{r.employeeName}</td>
          <td style={{ color: "var(--text-secondary)" }}>{r.department}</td>
          <td><span className="badge badge-green">₹{r.amount?.toLocaleString()}</span></td>
          <td style={{ color: "var(--text-secondary)" }}>{r.note || "—"}</td>
          <td style={{ color: "var(--text-secondary)" }}>{r.date}</td>
        </tr>
      ));
    }

    return (
      <div className="table-container" style={{ overflowX: "auto" }}>
        <table className="employee-table">
          <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1>Reports</h1>
        <p className="dashboard-subtitle">View, filter and export your payroll data</p>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "24px", flexWrap: "wrap" }}>
        {/* Month */}
        <select value={month} onChange={(e) => setMonth(e.target.value)} style={selectStyle}>
          {MONTH_NAMES.slice(1).map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
        </select>

        {/* Year */}
        <select value={year} onChange={(e) => setYear(e.target.value)} style={selectStyle}>
          {Array.from({ length: 20 }, (_, i) => { const y = new Date().getFullYear() - 5 + i; return <option key={y} value={y}>{y}</option>; })}
        </select>

        {/* Employee filter — all tabs */}
        <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} style={{ ...selectStyle, minWidth: "200px", borderColor: filterEmployee ? "var(--accent)" : "var(--border-default)", boxShadow: filterEmployee ? "0 0 0 3px var(--accent-glow)" : "none" }}>
          <option value="">All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={String(emp.id)}>{emp.name}</option>
          ))}
        </select>

        {/* Export + Print */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <button className="secondary-btn" onClick={exportExcel}>Export Excel</button>
          <button className="delete-btn" style={{ background: "rgba(255,69,58,0.12)", border: "1px solid rgba(255,69,58,0.2)" }} onClick={exportPDF}>Export PDF</button>
          <button
            className="secondary-btn"
            onClick={printReport}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Show active filter label */}
      {filterEmployee && (
        <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Showing data for:</span>
          <span className="badge badge-blue">{employees.find(e => String(e.id) === filterEmployee)?.name}</span>
          <button onClick={() => setFilterEmployee("")} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: "12px", padding: "2px 6px" }}>✕ Clear</button>
        </div>
      )}

      {renderSummary()}
      {renderTable()}
    </>
  );
}

export default Reports;
