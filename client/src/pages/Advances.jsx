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

function Advances() {
  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(``);

  useEffect(() => { fetchEmployees(); fetchAdvances(); }, []);

  async function fetchEmployees() {
    const r = await axios.get(`${API}/api/employees`);
    setEmployees(r.data.filter((e) => e.status === `Active`));
  }

  async function fetchAdvances() {
    const r = await axios.get(`${API}/api/advances`);
    setAdvances(r.data);
  }

  async function saveAdvance() {
    try {
      if (!employeeId || !amount || !date) { toast.error(`Please fill all required fields`); return; }
      await axios.post(`${API}/api/advances`, { employeeId, amount, reason, date });
      setEmployeeId(`"); setAmount(""); setReason(""); setDate("");
      fetchAdvances(); toast.success("Advance saved");
    } catch (e) { toast.error("Something went wrong`); }
  }

  async function deleteAdvance(id) {
    if (!await confirmDialog(`This advance record will be deleted.`)) return;
    try {
      await axios.delete(`${API}/api/advances/${id}`);
      fetchAdvances(); toast.success(`Advance deleted`);
    } catch (e) { toast.error("Something went wrong"); }
  }

  const filtered = advances.filter((a) =>
    a.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    a.date.includes(search) ||
    (a.reason && a.reason.toLowerCase().includes(search.toLowerCase()))
  );

  const total = filtered.reduce((s, a) => s + a.amount, 0);

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1>Advance Payments</h1>
        <p className="dashboard-subtitle">Record salary advances given to employees</p>
      </div>

      <div className="form-panel">
        <h2>Add Advance</h2>
        <div className="employee-form">
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select employee</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
          <input type="number" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input type="text" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DatePicker value={date} onChange={setDate} placeholder="Select date" />
        </div>
        <div className="form-actions" style={{ marginTop: "16px" }}>
          <button className="add-btn" onClick={saveAdvance}>Save Advance</button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div className="search-bar">
          <Search size={14} />
          <input type="text" placeholder="Search advances..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {filtered.length > 0 && (
          <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600" }}>
            Total: <span style={{ color: "var(--amber)" }}>₹{total.toLocaleString()}</span>
          </span>
        )}
      </div>

      <div className="table-container">
        <table className="employee-table">
          <thead>
            <tr><th>Employee</th><th>Amount</th><th>Reason</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="empty-state">No advance records found</td></tr>
            ) : filtered.map((adv) => (
              <tr key={adv.id}>
                <td style={{ fontWeight: "500" }}>{adv.employeeName}</td>
                <td><span className="badge badge-amber">₹{adv.amount.toLocaleString()}</span></td>
                <td style={{ color: "var(--text-secondary)" }}>{adv.reason || "—"}</td>
                <td style={{ color: "var(--text-secondary)" }}>{adv.date}</td>
                <td>
                  <button className="delete-btn" style={{ padding: "7px 14px", fontSize: "12px" }} onClick={() => deleteAdvance(adv.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default Advances;
