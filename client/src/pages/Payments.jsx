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

const CATEGORIES = [
  "Salary",
  "Festival Bonus",
  "Emergency Advance",
  "Overtime Payment",
  "Incentive",
  "Other",
];

// Badge color per category
function categoryBadge(category) {
  const map = {
    "Salary":            "badge-green",
    "Festival Bonus":    "badge-blue",
    "Emergency Advance": "badge-amber",
    "Overtime Payment":  "badge-blue",
    "Incentive":         "badge-purple",
    "Other":             "",
  };
  return map[category] || "";
}

function Payments() {
  const [employees, setEmployees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("Salary");

  useEffect(() => { fetchEmployees(); fetchPayments(); }, []);

  async function fetchEmployees() {
    const r = await axios.get("http://https://balanced-light-production-e602.up.railway.app/api/employees");
    setEmployees(r.data.filter((e) => e.status === "Active"));
  }

  async function fetchPayments() {
    const r = await axios.get("http://https://balanced-light-production-e602.up.railway.app/api/payments");
    setPayments(r.data);
  }

  async function savePayment() {
    try {
      if (!employeeId || !amount || !date) { toast.error("Please fill all required fields"); return; }
      await axios.post("http://https://balanced-light-production-e602.up.railway.app/api/payments", { employeeId, amount, note, date, category });
      setEmployeeId(""); setAmount(""); setNote(""); setDate(""); setCategory("Salary");
      fetchPayments(); toast.success("Payment saved");
    } catch (e) { toast.error("Something went wrong"); }
  }

  async function deletePayment(id) {
    if (!await confirmDialog("This payment record will be deleted.")) return;
    try {
      await axios.delete(`http://https://balanced-light-production-e602.up.railway.app/api/payments/${id}`);
      fetchPayments(); toast.success("Payment deleted");
    } catch (e) { toast.error("Something went wrong"); }
  }

  const filtered = payments.filter((p) =>
    p.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    p.date.includes(search) ||
    (p.note && p.note.toLowerCase().includes(search.toLowerCase())) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  const total = filtered.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1>Payments</h1>
        <p className="dashboard-subtitle">Record salary payments made to employees</p>
      </div>

      <div className="form-panel">
        <h2>Add Payment</h2>
        <div className="employee-form">
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">Select employee</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
          <input type="number" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <DatePicker value={date} onChange={setDate} placeholder="Select date" />
        </div>
        <div style={{ marginTop: "12px" }}>
          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: "100%", maxWidth: "500px" }}
          />
        </div>
        <div className="form-actions" style={{ marginTop: "16px" }}>
          <button className="add-btn" onClick={savePayment}>Save Payment</button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div className="search-bar">
          <Search size={14} />
          <input type="text" placeholder="Search by name, category, note..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {filtered.length > 0 && (
          <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "600" }}>
            Total: <span style={{ color: "var(--green)" }}>₹{total.toLocaleString()}</span>
          </span>
        )}
      </div>

      <div className="table-container">
        <table className="employee-table">
          <thead>
            <tr><th>Employee</th><th>Amount</th><th>Category</th><th>Note</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="empty-state">No payment records found</td></tr>
            ) : filtered.map((pmt) => (
              <tr key={pmt.id}>
                <td style={{ fontWeight: "500" }}>{pmt.employeeName}</td>
                <td><span className="badge badge-green">₹{pmt.amount.toLocaleString()}</span></td>
                <td>
                  {pmt.category
                    ? <span className={`badge ${categoryBadge(pmt.category)}`}>{pmt.category}</span>
                    : <span style={{ color: "var(--text-tertiary)" }}>—</span>}
                </td>
                <td style={{ color: "var(--text-secondary)" }}>{pmt.note || "—"}</td>
                <td style={{ color: "var(--text-secondary)" }}>{pmt.date}</td>
                <td>
                  <button className="delete-btn" style={{ padding: "7px 14px", fontSize: "12px" }} onClick={() => deletePayment(pmt.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default Payments;
