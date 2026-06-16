import API from "../api.js";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import DatePicker from "../components/DatePicker";

async function confirmDialog(message) {
  if (window.Swal) {
    const result = await window.Swal.fire({
      title: "Are you sure?", text: message, icon: "warning",
      showCancelButton: true, confirmButtonColor: "#ff453a",
      cancelButtonColor: "#3f3f46", confirmButtonText: "Yes, delete it",
      background: "#161616", color: "#f5f5f7",
    });
    return result.isConfirmed;
  }
  return window.confirm(message);
}

const WORK_HOURS_PER_DAY = 8;

function EarlyLeave() {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [hours, setHours] = useState("");
  const [date, setDate] = useState("");
  const [autoRate, setAutoRate] = useState(0);

  useEffect(() => { fetchEmployees(); fetchRecords(); }, []);

  async function fetchEmployees() {
    const r = await axios.get(`${API}/api/employees`);
    setEmployees(r.data.filter(e => e.status === "Active"));
  }

  async function fetchRecords() {
    const r = await axios.get(`${API}/api/earlyleave`);
    setRecords(r.data);
  }

  function handleEmployeeChange(id) {
    setEmployeeId(id);
    if (!id) { setAutoRate(0); return; }
    const emp = employees.find(e => String(e.id) === String(id));
    if (emp) {
      const rate = Math.round((emp.wage / WORK_HOURS_PER_DAY) * 100) / 100;
      setAutoRate(rate);
    }
  }

  async function saveRecord() {
    if (!employeeId || !hours || !date) { toast.error("Please fill all fields"); return; }
    if (!autoRate) { toast.error("Could not calculate rate — employee wage missing"); return; }
    try {
      await axios.post(`${API}/api/earlyleave`, { employeeId, hours, rate: autoRate, date });
      setEmployeeId(""); setHours(""); setDate(""); setAutoRate(0);
      fetchRecords();
      toast.success("Early leave recorded");
    } catch (e) { toast.error("Something went wrong"); }
  }

  async function deleteRecord(id) {
    if (!await confirmDialog("This early leave record will be deleted.")) return;
    try {
      await axios.delete(`${API}/api/earlyleave/${id}`);
      fetchRecords();
      toast.success("Record deleted");
    } catch (e) { toast.error("Something went wrong"); }
  }

  const filtered = records.filter(r =>
    r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    r.date.includes(search)
  );

  const totalHours = filtered.reduce((s, r) => s + Number(r.hours), 0);
  const totalDeduction = filtered.reduce((s, r) => s + r.hours * r.rate, 0);

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1>Early Leave</h1>
        <p className="dashboard-subtitle">Deduction is auto-calculated from employee wage ÷ 8 hrs</p>
      </div>

      <div className="form-panel">
        <h2>Record Early Leave</h2>
        <div className="employee-form">
          <select value={employeeId} onChange={e => handleEmployeeChange(e.target.value)}>
            <option value="">Select employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} — ₹{Math.round(emp.wage / WORK_HOURS_PER_DAY)}/hr
              </option>
            ))}
          </select>
          <input
            type="number" placeholder="Hours left early"
            value={hours} onChange={e => setHours(e.target.value)}
            min="0.5" step="0.5"
          />
          <DatePicker value={date} onChange={setDate} placeholder="Select date" />
        </div>

        {autoRate > 0 && (
          <div style={{
            marginTop: "14px", padding: "12px 16px",
            background: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.2)",
            borderRadius: "var(--radius-md)", display: "flex", gap: "24px", flexWrap: "wrap",
          }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Rate: <strong style={{ color: "var(--red)" }}>₹{autoRate}/hr</strong>
              <span style={{ fontSize: "11px", color: "var(--text-tertiary)", marginLeft: "6px" }}>(wage ÷ 8)</span>
            </span>
            {hours && (
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Deduction: <strong style={{ color: "var(--red)" }}>₹{(hours * autoRate).toLocaleString()}</strong>
                <span style={{ fontSize: "11px", color: "var(--text-tertiary)", marginLeft: "6px" }}>({hours} hrs × ₹{autoRate})</span>
              </span>
            )}
          </div>
        )}

        <div className="form-actions" style={{ marginTop: "16px" }}>
          <button className="add-btn" onClick={saveRecord}>Save Early Leave</button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div className="search-bar">
          <Search size={14} />
          <input type="text" placeholder="Search records..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {filtered.length > 0 && (
          <div style={{ display: "flex", gap: "20px", fontSize: "13px" }}>
            <span style={{ color: "var(--text-secondary)" }}>Hours: <span style={{ color: "var(--red)", fontWeight: "600" }}>{totalHours}</span></span>
            <span style={{ color: "var(--text-secondary)" }}>Total Deduction: <span style={{ color: "var(--red)", fontWeight: "600" }}>₹{totalDeduction.toLocaleString()}</span></span>
          </div>
        )}
      </div>

      <div className="table-container">
        <table className="employee-table">
          <thead><tr><th>Employee</th><th>Hours Early</th><th>Rate/Hr</th><th>Deduction</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="empty-state">No early leave records found</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: "500" }}>{r.employeeName}</td>
                <td>{r.hours}</td>
                <td style={{ color: "var(--text-secondary)" }}>₹{r.rate}</td>
                <td><span className="badge badge-red">-₹{(r.hours * r.rate).toLocaleString()}</span></td>
                <td style={{ color: "var(--text-secondary)" }}>{r.date}</td>
                <td>
                  <button className="delete-btn" style={{ padding: "7px 14px", fontSize: "12px" }} onClick={() => deleteRecord(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default EarlyLeave;
