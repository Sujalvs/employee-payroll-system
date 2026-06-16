import API from "../api.js";
import { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const MONTH_NAMES = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
const TABS = ["Payroll","Attendance","Advances","Overtime","Payments"];

function Reports() {
  const [activeTab, setActiveTab] = useState("Payroll");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState([]);
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [projects, setProjects] = useState([]);
  const [data, setData] = useState({ Payroll: [], Attendance: [], Advances: [], Overtime: [], Payments: [] });

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { fetchData(); }, [activeTab, month, year]);

  async function fetchEmployees() {
    try {
      const [empRes, projRes] = await Promise.all([axios.get(`${API}/api/employees`), axios.get(`${API}/api/projects`)]);
      setEmployees(empRes.data);
      setProjects(projRes.data);
    } catch(e) { console.log(e); }
  }

  async function fetchData() {
    const endpoints = {
      Payroll: `${API}/api/reports/payroll?month=${month}&year=${year}`,
      Attendance: `${API}/api/reports/attendance?month=${month}&year=${year}`,
      Advances: `${API}/api/reports/advances?month=${month}&year=${year}`,
      Overtime: `${API}/api/reports/overtime?month=${month}&year=${year}`,
      Payments: `${API}/api/reports/payments?month=${month}&year=${year}`,
    };
    try {
      const r = await axios.get(endpoints[activeTab]);
      setData(prev => ({ ...prev, [activeTab]: r.data }));
    } catch (e) { console.log(e); }
  }

  const departments = [...new Set(employees.map(e => e.department))].sort();

  const filteredData = data[activeTab].filter(r => {
    if (filterEmployee && String(r.id) !== filterEmployee && String(r.employeeId) !== filterEmployee) return false;
    if (filterDepartment && r.department !== filterDepartment) return false;
    if (filterProject && activeTab === "Attendance" && r.project !== filterProject) return false;
    return true;
  });

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredData), activeTab);
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const empName = filterEmployee ? employees.find(e => String(e.id) === filterEmployee)?.name : "";
    const deptName = filterDepartment || "";
    const suffix = empName ? "_" + empName.replace(/ /g, "_") : deptName ? "_" + deptName.replace(/ /g, "_") : "";
    saveAs(new Blob([buf], { type: "application/octet-stream" }), `${activeTab}_${MONTH_NAMES[month]}_${year}${suffix}.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    const empName = filterEmployee ? employees.find(e => String(e.id) === filterEmployee)?.name : "";
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(249, 112, 32);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("KSHETHROPASANA", 14, 10);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("TEMPLE CONSTRUCTION", 14, 16);

    const reportLabel = activeTab.toUpperCase() + " REPORT";
    const periodLabel = MONTH_NAMES[month] + " " + year + (empName ? "  |  " + empName.toUpperCase() : "");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(reportLabel, pageW - 10, 10, { align: "right" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(periodLabel, pageW - 10, 16, { align: "right" });

    let head = [], body = [];
    const d = filteredData;
    if (activeTab === "Payroll") {
      head = [["Employee","Dept","Wage/Day","Days","Gross","Overtime","Advances","Net Salary","Total Paid","Remaining","Excess"]];
      body = d.map(r => [r.name, r.department, "Rs." + r.wage, r.presentDays, "Rs." + r.grossSalary, "Rs." + r.totalOvertime, "Rs." + r.totalAdvance, "Rs." + r.netSalary, "Rs." + r.totalPaid, r.remaining > 0 ? "Rs." + r.remaining : "-", r.excess > 0 ? "Rs." + r.excess : "-"]);
    } else if (activeTab === "Attendance") {
      head = [["Employee","Department","Date","Status","Project"]];
      body = d.map(r => [r.employeeName, r.department, r.date, r.status, r.project || "-"]);
    } else if (activeTab === "Advances") {
      head = [["Employee","Department","Amount","Reason","Date"]];
      body = d.map(r => [r.employeeName, r.department, "Rs." + r.amount, r.reason || "-", r.date]);
    } else if (activeTab === "Overtime") {
      head = [["Employee","Department","Hours","Rate/Hr","Amount","Date"]];
      body = d.map(r => [r.employeeName, r.department, r.hours, "Rs." + r.rate, "Rs." + r.amount, r.date]);
    } else if (activeTab === "Payments") {
      head = [["Employee","Department","Amount","Category","Note","Date"]];
      body = d.map(r => [r.employeeName, r.department, "Rs." + r.amount, r.category || "-", r.note || "-", r.date]);
    }

    autoTable(doc, {
      startY: 28, head, body,
      styles: { fontSize: 8.5, cellPadding: 4, textColor: [30, 30, 30] },
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      didDrawPage: (data) => {
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFillColor(249, 112, 32);
        doc.rect(0, pageH - 10, pageW, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text("Kshethropasana Payroll Management System", 10, pageH - 3.5);
        doc.text("Page " + data.pageNumber, pageW - 10, pageH - 3.5, { align: "right" });
      },
    });

    const suffix = empName ? "_" + empName.replace(/ /g, "_") : "";
    doc.save(`${activeTab}_${MONTH_NAMES[month]}_${year}${suffix}.pdf`);
  }

  function printReport() {
    const empName = filterEmployee ? employees.find(e => String(e.id) === filterEmployee)?.name : filterDepartment ? filterDepartment + " Dept" : "All Employees";
    const d = filteredData;
    let headers = [], rows = [];
    if (activeTab === "Payroll") {
      headers = ["Employee","Department","Wage/Day","Days","Gross","Overtime","Advances","Net Salary","Total Paid","Remaining","Excess"];
      rows = d.map(r => [r.name, r.department, "Rs." + r.wage, r.presentDays, "Rs." + r.grossSalary, "Rs." + r.totalOvertime, "Rs." + r.totalAdvance, "Rs." + r.netSalary, "Rs." + r.totalPaid, r.remaining > 0 ? "Rs." + r.remaining : "-", r.excess > 0 ? "Rs." + r.excess : "-"]);
    } else if (activeTab === "Attendance") {
      headers = ["Employee","Department","Date","Status"];
      rows = d.map(r => [r.employeeName, r.department, r.date, r.status]);
    } else if (activeTab === "Advances") {
      headers = ["Employee","Department","Amount","Reason","Date"];
      rows = d.map(r => [r.employeeName, r.department, "Rs." + r.amount, r.reason || "-", r.date]);
    } else if (activeTab === "Overtime") {
      headers = ["Employee","Department","Hours","Rate/Hr","Amount","Date"];
      rows = d.map(r => [r.employeeName, r.department, r.hours, "Rs." + r.rate, "Rs." + r.amount, r.date]);
    } else if (activeTab === "Payments") {
      headers = ["Employee","Department","Amount","Category","Note","Date"];
      rows = d.map(r => [r.employeeName, r.department, "Rs." + r.amount, r.category || "-", r.note || "-", r.date]);
    }

    const tableRows = rows.map(row => "<tr>" + row.map(cell => "<td>" + cell + "</td>").join("") + "</tr>").join("");
    const tableHeaders = headers.map(h => "<th>" + h + "</th>").join("");
    const generatedOn = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const title = activeTab + " Report - " + MONTH_NAMES[month] + " " + year + " - " + empName;

    const win = window.open("", "_blank");
    win.document.write("<!DOCTYPE html><html><head><title>" + title + "</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;color:#111}.header{background:#f97020;padding:18px 32px;display:flex;align-items:center;justify-content:space-between}.company-name{color:#fff;font-size:18px;font-weight:700}.company-sub{color:rgba(255,255,255,0.75);font-size:11px;margin-top:2px}.report-type{color:#fff;font-size:14px;font-weight:700;text-align:right}.report-period{color:rgba(255,255,255,0.8);font-size:11px;text-align:right;margin-top:3px}.content{padding:24px 32px}table{width:100%;border-collapse:collapse;font-size:12px}thead tr{background:#1c1c1e}th{padding:10px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;color:#fff}td{padding:10px 12px;border-bottom:1px solid #f0f0f0}tbody tr:nth-child(even){background:#fafafa}.footer{background:#f97020;padding:8px 32px;display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,0.85)}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>");
    win.document.write("<div class='header'><div><div class='company-name'>Kshethropasana</div><div class='company-sub'>Temple Construction</div></div><div><div class='report-type'>" + activeTab + " Report</div><div class='report-period'>" + MONTH_NAMES[month] + " " + year + "</div></div></div>");
    win.document.write("<div class='content'><table><thead><tr>" + tableHeaders + "</tr></thead><tbody>" + tableRows + "</tbody></table></div>");
    win.document.write("<div class='footer'><span>Kshethropasana Payroll Management System</span><span>" + generatedOn + "</span></div>");
    win.document.write("<script>window.onload=function(){window.print()}<\/script></body></html>");
    win.document.close();
  }

  const selectStyle = {
    background: "var(--bg-surface)", color: "var(--text-primary)",
    border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
    padding: "10px 36px 10px 14px", fontSize: "14px", fontFamily: "inherit",
    appearance: "none",
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
    backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
  };

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1>Reports</h1>
        <p className="dashboard-subtitle">Monthly reports for all records</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: "24px" }}>
        {TABS.map(tab => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}>
        <select value={month} onChange={e => setMonth(e.target.value)} style={selectStyle}>
          {MONTH_NAMES.slice(1).map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)} style={selectStyle}>
          {Array.from({ length: 10 }, (_, i) => { const y = new Date().getFullYear() - 3 + i; return <option key={y} value={y}>{y}</option>; })}
        </select>
        <select value={filterDepartment} onChange={e => { setFilterDepartment(e.target.value); setFilterEmployee(""); }} style={{ ...selectStyle, minWidth: "160px" }}>
          <option value="">All Departments</option>
          {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
        </select>
        <select value={filterEmployee} onChange={e => { setFilterEmployee(e.target.value); setFilterDepartment(""); }} style={{ ...selectStyle, minWidth: "180px" }}>
          <option value="">All Employees</option>
          {employees.filter(emp => !filterDepartment || emp.department === filterDepartment).map(emp => <option key={emp.id} value={String(emp.id)}>{emp.name}</option>)}
        </select>
        {activeTab === "Attendance" && (
          <select value={filterProject} onChange={e => { setFilterProject(e.target.value); setFilterEmployee(""); }} style={{ ...selectStyle, minWidth: "160px" }}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        )}
        {(filterEmployee || filterDepartment || filterProject) && <button onClick={() => { setFilterEmployee(""); setFilterDepartment(""); setFilterProject(""); }} className="secondary-btn" style={{ padding: "10px 16px", fontSize: "13px" }}>Clear</button>}
        <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
          <button className="secondary-btn" onClick={exportExcel} style={{ fontSize: "13px" }}>Export Excel</button>
          <button className="delete-btn" style={{ background: "rgba(255,69,58,0.12)", border: "1px solid rgba(255,69,58,0.2)", fontSize: "13px" }} onClick={exportPDF}>Export PDF</button>
          <button className="add-btn" onClick={printReport} style={{ fontSize: "13px" }}>Print</button>
        </div>
      </div>

      <div className="table-container" style={{ overflowX: "auto" }}>
        {activeTab === "Payroll" && (
          <table className="employee-table">
            <thead><tr><th>Employee</th><th>Dept</th><th>Wage</th><th>Days</th><th>Gross</th><th>OT</th><th>Advances</th><th>Net</th><th>Paid</th><th>Remaining</th><th>Excess</th></tr></thead>
            <tbody>
              {filteredData.length === 0 ? <tr><td colSpan={11} className="empty-state">No data</td></tr>
              : filteredData.map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.department}</td><td>Rs.{r.wage}</td><td>{r.presentDays}</td><td>Rs.{r.grossSalary?.toLocaleString()}</td><td>Rs.{r.totalOvertime?.toLocaleString()}</td><td>Rs.{r.totalAdvance?.toLocaleString()}</td><td><span className={`badge ${r.netSalary >= 0 ? "badge-green" : "badge-red"}`}>Rs.{r.netSalary?.toLocaleString()}</span></td><td>Rs.{r.totalPaid?.toLocaleString()}</td><td>{r.remaining > 0 ? "Rs." + r.remaining?.toLocaleString() : "-"}</td><td>{r.excess > 0 ? "Rs." + r.excess?.toLocaleString() : "-"}</td></tr>)}
            </tbody>
          </table>
        )}
        {activeTab === "Attendance" && (
          <table className="employee-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {filteredData.length === 0 ? <tr><td colSpan={4} className="empty-state">No data</td></tr>
              : filteredData.map((r, i) => <tr key={i}><td>{r.employeeName}</td><td>{r.department}</td><td>{r.date}</td><td><span className={`badge ${r.status === "Present" ? "badge-green" : "badge-red"}`}>{r.status}</span></td></tr>)}
            </tbody>
          </table>
        )}
        {activeTab === "Advances" && (
          <table className="employee-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Amount</th><th>Reason</th><th>Date</th></tr></thead>
            <tbody>
              {filteredData.length === 0 ? <tr><td colSpan={5} className="empty-state">No data</td></tr>
              : filteredData.map((r, i) => <tr key={i}><td>{r.employeeName}</td><td>{r.department}</td><td>Rs.{r.amount?.toLocaleString()}</td><td>{r.reason || "-"}</td><td>{r.date}</td></tr>)}
            </tbody>
          </table>
        )}
        {activeTab === "Overtime" && (
          <table className="employee-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Hours</th><th>Rate/Hr</th><th>Amount</th><th>Date</th></tr></thead>
            <tbody>
              {filteredData.length === 0 ? <tr><td colSpan={6} className="empty-state">No data</td></tr>
              : filteredData.map((r, i) => <tr key={i}><td>{r.employeeName}</td><td>{r.department}</td><td>{r.hours}</td><td>Rs.{r.rate}</td><td>Rs.{r.amount?.toLocaleString()}</td><td>{r.date}</td></tr>)}
            </tbody>
          </table>
        )}
        {activeTab === "Payments" && (
          <table className="employee-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Amount</th><th>Category</th><th>Note</th><th>Date</th></tr></thead>
            <tbody>
              {filteredData.length === 0 ? <tr><td colSpan={6} className="empty-state">No data</td></tr>
              : filteredData.map((r, i) => <tr key={i}><td>{r.employeeName}</td><td>{r.department}</td><td>Rs.{r.amount?.toLocaleString()}</td><td>{r.category || "-"}</td><td>{r.note || "-"}</td><td>{r.date}</td></tr>)}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default Reports;
