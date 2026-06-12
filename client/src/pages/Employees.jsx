import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { Search, Phone } from "lucide-react";

async function confirmDialog(message, confirmText = "Yes, proceed") {
  if (window.Swal) {
    const result = await window.Swal.fire({
      title: "Are you sure?", text: message, icon: "warning",
      showCancelButton: true, confirmButtonColor: "#ff453a",
      cancelButtonColor: "#3f3f46", confirmButtonText: confirmText,
      background: "#161616", color: "#f5f5f7",
    });
    return result.isConfirmed;
  }
  return window.confirm(message);
}

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [wage, setWage] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchEmployees(); }, []);

  async function fetchEmployees() {
    try {
      const r = await axios.get("https://balanced-light-production-e602.up.railway.app/api/employees");
      setEmployees(r.data);
    } catch (e) { console.log(e); }
  }

  function clearForm() { setName(""); setDepartment(""); setWage(""); setPhone(""); setNotes(""); setEditingId(null); }

  async function addOrUpdateEmployee() {
    if (!name || !department || !wage) { toast.error("Please fill name, department and wage"); return; }
    try {
      if (editingId) {
        await axios.put(`https://balanced-light-production-e602.up.railway.app/api/employees/${editingId}`, { name, department, wage, phone, notes });
      } else {
        await axios.post("https://balanced-light-production-e602.up.railway.app/api/employees", { name, department, wage, phone, notes });
      }
      await fetchEmployees(); clearForm();
      toast.success(editingId ? "Employee updated" : "Employee added");
    } catch (e) { console.log(e); }
  }

  function editEmployee(emp) {
    setName(emp.name); setDepartment(emp.department);
    setWage(emp.wage); setPhone(emp.phone || ""); setNotes(emp.notes || "");
    setEditingId(emp.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function markInactive(id) {
    if (!await confirmDialog("This employee will be marked as inactive.", "Mark Inactive")) return;
    try { await axios.put(`https://balanced-light-production-e602.up.railway.app/api/employees/inactive/${id}`); fetchEmployees(); toast.success("Employee marked inactive"); }
    catch (e) { console.log(e); }
  }

  async function reactivate(id) {
    try { await axios.put(`https://balanced-light-production-e602.up.railway.app/api/employees/active/${id}`); fetchEmployees(); toast.success("Employee reactivated"); }
    catch (e) { console.log(e); }
  }

  async function deleteEmployee(id) {
    if (!await confirmDialog("This employee will be permanently deleted.", "Delete")) return;
    try { await axios.delete(`https://balanced-light-production-e602.up.railway.app/api/employees/${id}`); fetchEmployees(); toast.success("Employee deleted"); if (editingId === id) clearForm(); }
    catch (e) { console.log(e); }
  }

  const filtered = employees
    .filter((emp) => showInactive ? true : emp.status === "Active")
    .filter((emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase()) ||
      (emp.phone && emp.phone.includes(search))
    );

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1>Employees</h1>
        <p className="dashboard-subtitle">Manage your workforce</p>
      </div>

      <div className="form-panel">
        <h2>{editingId ? "Edit Employee" : "Add Employee"}</h2>
        <div className="employee-form">
          <input type="text" placeholder="Full name *" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="text" placeholder="Department *" value={department} onChange={(e) => setDepartment(e.target.value)} />
          <input type="number" placeholder="Daily wage (₹) *" value={wage} onChange={(e) => setWage(e.target.value)} />
          <div style={{ position: "relative" }}>
            <Phone size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
            <input type="tel" placeholder="Phone number (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ paddingLeft: "34px" }} />
          </div>
        </div>
        {/* Notes full width */}
        <textarea
          placeholder="Notes / Remarks (optional) — e.g. joined June 2026, operates crane..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            marginTop: "12px", width: "100%", background: "var(--bg-hover)",
            color: "var(--text-primary)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)", padding: "11px 14px", fontSize: "14px",
            fontFamily: "inherit", resize: "vertical", minHeight: "72px",
          }}
        />
        <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "8px" }}>* Required fields</p>
        <div className="form-actions" style={{ marginTop: "12px" }}>
          <button className="add-btn" onClick={addOrUpdateEmployee}>
            {editingId ? "Update Employee" : "Add Employee"}
          </button>
          {editingId && <button className="secondary-btn" onClick={clearForm}>Cancel</button>}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div className="search-bar">
          <Search size={14} />
          <input type="text" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
              style={{ width: "14px", height: "14px", accentColor: "var(--accent)", cursor: "pointer" }} />
            Show inactive
          </label>
          <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
            {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="table-container">
        <table className="employee-table">
          <thead>
            <tr><th>Name</th><th>Department</th><th>Phone</th><th>Daily Wage</th><th>Notes</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="empty-state">No employees found</td></tr>
            ) : filtered.map((emp) => (
              <tr key={emp.id}>
                <td><Link to={`/employees/${emp.id}`} style={{ color: "var(--accent)", fontWeight: "600" }}>{emp.name}</Link></td>
                <td style={{ color: "var(--text-secondary)" }}>{emp.department}</td>
                <td style={{ color: "var(--text-secondary)" }}>
                  {emp.phone
                    ? <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><Phone size={12} style={{ color: "var(--text-tertiary)" }} />{emp.phone}</span>
                    : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                </td>
                <td style={{ fontWeight: "600" }}>₹{emp.wage}</td>
                <td style={{ color: "var(--text-secondary)", fontSize: "13px", maxWidth: "180px" }}>
                  {emp.notes
                    ? <span title={emp.notes}>{emp.notes.length > 30 ? emp.notes.slice(0, 30) + "…" : emp.notes}</span>
                    : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                </td>
                <td><span className={`badge ${emp.status === "Active" ? "badge-green" : "badge-red"}`}>{emp.status}</span></td>
                <td>
                  <div className="flex gap-2">
                    <button className="add-btn" style={{ padding: "7px 14px", fontSize: "12px" }} onClick={() => editEmployee(emp)}>Edit</button>
                    {emp.status === "Active"
                      ? <button className="secondary-btn" style={{ padding: "7px 14px", fontSize: "12px" }} onClick={() => markInactive(emp.id)}>Deactivate</button>
                      : <button className="add-btn" style={{ padding: "7px 14px", fontSize: "12px", background: "var(--green)" }} onClick={() => reactivate(emp.id)}>Reactivate</button>
                    }
                    <button className="delete-btn" style={{ padding: "7px 14px", fontSize: "12px" }} onClick={() => deleteEmployee(emp.id)}>Delete</button>
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

export default Employees;
