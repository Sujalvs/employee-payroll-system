import API from "../api.js";
import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Search, CheckSquare } from "lucide-react";
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

function statusBadge(status) {
  if (status === "Present") return "badge-green";
  if (status === "Half Day") return "badge-amber";
  return "badge-red";
}

function Attendance() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("single");

  const [employee, setEmployee] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("Present");
  const [editingId, setEditingId] = useState(null);

  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split("T")[0]);
  const [bulkStatuses, setBulkStatuses] = useState({});

  useEffect(() => { fetchAttendance(); fetchEmployees(); }, []);

  async function fetchAttendance() {
    try { const r = await axios.get(`${API}/api/attendance`); setRecords(r.data); }
    catch (e) { console.log(e); }
  }

  async function fetchEmployees() {
    try {
      const r = await axios.get(`${API}/api/employees`);
      const active = r.data.filter((e) => e.status === "Active");
      setEmployees(active);
      const init = {};
      active.forEach((e) => { init[e.id] = "Present"; });
      setBulkStatuses(init);
    } catch (e) { console.log(e); }
  }

  function clearForm() { setEmployee(""); setDate(""); setStatus("Present"); setEditingId(null); }

  async function saveAttendance() {
    if (!employee || !date) { toast.error("Please fill all fields"); return; }
    try {
      if (editingId) {
        await axios.put(`${API}/api/attendance/${editingId}`, { employeeId: employee, date, status });
      } else {
        await axios.post(`${API}/api/attendance`, { employeeId: employee, date, status });
      }
      fetchAttendance(); clearForm();
      toast.success(editingId ? "Attendance updated" : "Attendance saved");
    } catch (e) { toast.error("Something went wrong"); }
  }

  async function saveBulkAttendance() {
    if (!bulkDate) { toast.error("Please select a date"); return; }
    const recs = employees.map((emp) => ({
      employeeId: emp.id,
      date: bulkDate,
      status: bulkStatuses[emp.id] || "Present",
    }));
    try {
      await axios.post(`${API}/api/attendance/bulk`, { records: recs });
      fetchAttendance();
      toast.success(`Attendance saved for ${recs.length} employees`);
    } catch (e) { toast.error("Something went wrong"); }
  }

  function markAll(s) {
    const updated = {};
    employees.forEach((e) => { updated[e.id] = s; });
    setBulkStatuses(updated);
  }

  function editRecord(record) {
    setEmployee(record.employeeId); setDate(record.date);
    setStatus(record.status); setEditingId(record.id);
    setActiveTab("single");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteRecord(id) {
    if (!await confirmDialog("This attendance record will be deleted.")) return;
    try {
      await axios.delete(`${API}/api/attendance/${id}`);
      fetchAttendance(); toast.success("Record deleted");
      if (editingId === id) clearForm();
    } catch (e) { console.log(e); }
  }

  const filtered = records.filter((r) =>
    r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    r.date.includes(search) ||
    r.status.toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = filtered.filter((r) => r.status === "Present").length;
  const halfDayCount = filtered.filter((r) => r.status === "Half Day").length;
  const absentCount = filtered.filter((r) => r.status === "Absent").length;

  const btnStyle = (s, empId) => ({
    padding: "6px 12px", borderRadius: "var(--radius-md)", fontSize: "12px",
    fontWeight: "600", cursor: "pointer", fontFamily: "inherit",
    background: bulkStatuses[empId] === s
      ? s === "Present" ? "rgba(48,209,88,0.15)" : s === "Half Day" ? "rgba(255,214,10,0.15)" : "rgba(255,69,58,0.15)"
      : "var(--bg-surface)",
    color: bulkStatuses[empId] === s
      ? s === "Present" ? "var(--green)" : s === "Half Day" ? "var(--amber)" : "var(--red)"
      : "var(--text-secondary)",
    border: bulkStatuses[empId] === s
      ? s === "Present" ? "1px solid rgba(48,209,88,0.4)" : s === "Half Day" ? "1px solid rgba(255,214,10,0.4)" : "1px solid rgba(255,69,58,0.4)"
      : "1px solid var(--border-default)",
  });

  const borderColor = (empId) => {
    const s = bulkStatuses[empId];
    if (s === "Present") return "rgba(48,209,88,0.2)";
    if (s === "Half Day") return "rgba(255,214,10,0.3)";
    return "rgba(255,69,58,0.3)";
  };

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1>Attendance</h1>
        <p className="dashboard-subtitle">Track daily employee attendance — Half Day counts as 0.5 days wage</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: "24px" }}>
        <button className={`tab-btn ${activeTab === "single" ? "active" : ""}`} onClick={() => setActiveTab("single")}>Single Entry</button>
        <button className={`tab-btn ${activeTab === "bulk" ? "active" : ""}`} onClick={() => setActiveTab("bulk")}>
          <CheckSquare size={13} style={{ marginRight: "6px", verticalAlign: "middle" }} />Bulk Mark
        </button>
      </div>

      {activeTab === "single" && (
        <div className="form-panel">
          <h2>{editingId ? "Edit Record" : "Mark Attendance"}</h2>
          <div className="employee-form">
            <select value={employee} onChange={(e) => setEmployee(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
            <DatePicker value={date} onChange={setDate} placeholder="Select date" />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Present</option>
              <option>Half Day</option>
              <option>Absent</option>
            </select>
          </div>
          {status === "Half Day" && (
            <div style={{ marginTop: "12px", padding: "10px 14px", background: "rgba(255,214,10,0.08)", border: "1px solid rgba(255,214,10,0.25)", borderRadius: "var(--radius-md)", fontSize: "13px", color: "var(--amber)" }}>
              Half Day = 0.5 × daily wage will be calculated for this day
            </div>
          )}
          <div className="form-actions" style={{ marginTop: "16px" }}>
            <button className="add-btn" onClick={saveAttendance}>{editingId ? "Update Record" : "Save Attendance"}</button>
            {editingId && <button className="secondary-btn" onClick={clearForm}>Cancel</button>}
          </div>
        </div>
      )}

      {activeTab === "bulk" && (
        <div className="form-panel">
          <h2>Bulk Mark Attendance</h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
            Mark attendance for all active employees at once.
          </p>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
            <DatePicker value={bulkDate} onChange={setBulkDate} placeholder="Select date" />
            <button className="add-btn" style={{ background: "var(--green)", fontSize: "12px", padding: "10px 16px" }} onClick={() => markAll("Present")}>Mark All Present</button>
            <button className="add-btn" style={{ background: "rgba(255,214,10,0.2)", color: "var(--amber)", border: "1px solid rgba(255,214,10,0.3)", fontSize: "12px", padding: "10px 16px" }} onClick={() => markAll("Half Day")}>Mark All Half Day</button>
            <button className="delete-btn" style={{ fontSize: "12px", padding: "10px 16px" }} onClick={() => markAll("Absent")}>Mark All Absent</button>
          </div>

          <div style={{ display: "grid", gap: "10px", marginBottom: "20px" }}>
            {employees.map((emp) => (
              <div key={emp.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", background: "var(--bg-hover)",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${borderColor(emp.id)}`,
              }}>
                <div>
                  <p style={{ fontWeight: "600", fontSize: "14px", marginBottom: "2px" }}>{emp.name}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{emp.department}</p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setBulkStatuses((prev) => ({ ...prev, [emp.id]: "Present" }))} style={btnStyle("Present", emp.id)}>Present</button>
                  <button onClick={() => setBulkStatuses((prev) => ({ ...prev, [emp.id]: "Half Day" }))} style={btnStyle("Half Day", emp.id)}>Half Day</button>
                  <button onClick={() => setBulkStatuses((prev) => ({ ...prev, [emp.id]: "Absent" }))} style={btnStyle("Absent", emp.id)}>Absent</button>
                </div>
              </div>
            ))}
          </div>

          <button className="add-btn" onClick={saveBulkAttendance} style={{ fontSize: "14px", padding: "12px 24px" }}>
            Save All Attendance for {bulkDate}
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div className="search-bar">
          <Search size={14} />
          <input type="text" placeholder="Search records..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <span className="badge badge-green">{presentCount} Present</span>
          {halfDayCount > 0 && <span className="badge badge-amber">{halfDayCount} Half Day</span>}
          <span className="badge badge-red">{absentCount} Absent</span>
        </div>
      </div>

      <div className="table-container">
        <table className="employee-table">
          <thead><tr><th>Employee</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="empty-state">No records found</td></tr>
            ) : filtered.map((record) => (
              <tr key={record.id}>
                <td style={{ fontWeight: "500" }}>{record.employeeName}</td>
                <td style={{ color: "var(--text-secondary)" }}>{record.date}</td>
                <td><span className={`badge ${statusBadge(record.status)}`}>{record.status}</span></td>
                <td>
                  <div className="flex gap-2">
                    <button className="add-btn" style={{ padding: "7px 14px", fontSize: "12px" }} onClick={() => editRecord(record)}>Edit</button>
                    <button className="delete-btn" style={{ padding: "7px 14px", fontSize: "12px" }} onClick={() => deleteRecord(record.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default Attendance;
