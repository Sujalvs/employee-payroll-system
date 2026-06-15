import API from "../api.js";
import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Search, Plus, Trash2, ChevronDown, ChevronUp, Edit2, X, Check, Package } from "lucide-react";
import DatePicker from "../components/DatePicker";

async function confirmDialog(message) {
  if (window.Swal) {
    const result = await window.Swal.fire({
      title: "Are you sure?", text: message, icon: "warning",
      showCancelButton: true, confirmButtonColor: "#ff453a",
      cancelButtonColor: "#3f3f46", confirmButtonText: "Yes, delete",
      background: "#161616", color: "#f5f5f7",
    });
    return result.isConfirmed;
  }
  return window.confirm(message);
}

function Contracts() {
  const [tab, setTab] = useState("workers"); // "workers" | "detail"
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState("");

  // Add worker form
  const [wName, setWName] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [wWorkType, setWWorkType] = useState("");
  const [wUnit, setWUnit] = useState("kg");
  const [wRate, setWRate] = useState("");
  const [wNotes, setWNotes] = useState("");
  const [showAddWorker, setShowAddWorker] = useState(false);

  // Add work entry
  const [workDesc, setWorkDesc] = useState("");
  const [workQty, setWorkQty] = useState("");
  const [workDate, setWorkDate] = useState(new Date().toISOString().split("T")[0]);

  // Add advance
  const [advAmount, setAdvAmount] = useState("");
  const [advReason, setAdvReason] = useState("");
  const [advDate, setAdvDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => { fetchWorkers(); }, []);

  async function fetchWorkers() {
    try { const r = await axios.get(`${API}/api/contracts/workers`); setWorkers(r.data); }
    catch(e) { console.log(e); }
  }

  async function fetchSummary(workerId) {
    try { const r = await axios.get(`${API}/api/contracts/summary/${workerId}`); setSummary(r.data); }
    catch(e) { console.log(e); }
  }

  function openWorker(worker) {
    setSelectedWorker(worker);
    fetchSummary(worker.id);
    setTab("detail");
  }

  async function addWorker() {
    if (!wName || !wWorkType || !wUnit || !wRate) { toast.error("Fill all required fields"); return; }
    try {
      await axios.post(`${API}/api/contracts/workers`, { name: wName, phone: wPhone, workType: wWorkType, unit: wUnit, ratePerUnit: wRate, notes: wNotes });
      setWName(""); setWPhone(""); setWWorkType(""); setWUnit("kg"); setWRate(""); setWNotes(""); setShowAddWorker(false);
      fetchWorkers(); toast.success("Worker added");
    } catch(e) { toast.error(e.response?.data?.message || "Failed to add worker"); }
  }

  async function deleteWorker(id, name) {
    if (!await confirmDialog(`Delete "${name}" and all their work records?`)) return;
    try { await axios.delete(`${API}/api/contracts/workers/${id}`); fetchWorkers(); toast.success("Worker deleted"); setTab("workers"); }
    catch(e) { toast.error("Failed to delete"); }
  }

  async function addWork() {
    if (!workQty || !workDate) { toast.error("Enter quantity and date"); return; }
    try {
      await axios.post(`${API}/api/contracts/work`, {
        workerId: selectedWorker.id,
        description: workDesc,
        quantity: workQty,
        unit: selectedWorker.unit,
        ratePerUnit: selectedWorker.ratePerUnit,
        date: workDate,
      });
      setWorkDesc(""); setWorkQty("");
      fetchSummary(selectedWorker.id); toast.success("Work entry added");
    } catch(e) { toast.error("Failed to add work entry"); }
  }

  async function deleteWork(id) {
    if (!await confirmDialog("Delete this work entry?")) return;
    try { await axios.delete(`${API}/api/contracts/work/${id}`); fetchSummary(selectedWorker.id); toast.success("Deleted"); }
    catch(e) { toast.error("Failed"); }
  }

  async function addAdvance() {
    if (!advAmount || !advDate) { toast.error("Enter amount and date"); return; }
    try {
      await axios.post(`${API}/api/contracts/advances`, { workerId: selectedWorker.id, amount: advAmount, reason: advReason, date: advDate });
      setAdvAmount(""); setAdvReason("");
      fetchSummary(selectedWorker.id); toast.success("Advance added");
    } catch(e) { toast.error("Failed to add advance"); }
  }

  async function deleteAdvance(id) {
    if (!await confirmDialog("Delete this advance?")) return;
    try { await axios.delete(`${API}/api/contracts/advances/${id}`); fetchSummary(selectedWorker.id); toast.success("Deleted"); }
    catch(e) { toast.error("Failed"); }
  }

  const filtered = workers.filter(w => w.name.toLowerCase().includes(search.toLowerCase()) || (w.workType || "").toLowerCase().includes(search.toLowerCase()));

  const cardStyle = (w) => ({
    background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)", padding: "16px 20px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    cursor: "pointer", gap: "12px", flexWrap: "wrap",
    transition: "border-color 0.15s ease",
  });

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1>Contract Workers</h1>
        <p className="dashboard-subtitle">Track piece-rate / per-material workers — advances and work completed</p>
      </div>

      {tab === "workers" && (
        <>
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
            <div className="search-bar" style={{ flex: 1 }}>
              <Search size={14} />
              <input type="text" placeholder="Search workers..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="add-btn" onClick={() => setShowAddWorker(p => !p)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Plus size={14} /> Add Worker
            </button>
          </div>

          {showAddWorker && (
            <div className="form-panel" style={{ marginBottom: "20px" }}>
              <h2 style={{ marginBottom: "16px" }}>New Contract Worker</h2>
              <div className="employee-form">
                <input type="text" placeholder="Worker name *" value={wName} onChange={e => setWName(e.target.value)} />
                <input type="text" placeholder="Phone (optional)" value={wPhone} onChange={e => setWPhone(e.target.value)} />
                <input type="text" placeholder="Work type (e.g. Stone cutting, Plastering) *" value={wWorkType} onChange={e => setWWorkType(e.target.value)} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <input type="number" placeholder="Rate per unit *" value={wRate} onChange={e => setWRate(e.target.value)} style={{ flex: 2 }} />
                  <select value={wUnit} onChange={e => setWUnit(e.target.value)} style={{ flex: 1 }}>
                    <option value="kg">per kg</option>
                    <option value="ton">per ton</option>
                    <option value="unit">per unit</option>
                    <option value="sqft">per sq.ft</option>
                    <option value="sqm">per sq.m</option>
                    <option value="bag">per bag</option>
                    <option value="piece">per piece</option>
                    <option value="load">per load</option>
                    <option value="day">per day</option>
                  </select>
                </div>
                <input type="text" placeholder="Notes (optional)" value={wNotes} onChange={e => setWNotes(e.target.value)} />
              </div>
              <div className="form-actions" style={{ marginTop: "16px" }}>
                <button className="add-btn" onClick={addWorker}>Save Worker</button>
                <button className="secondary-btn" onClick={() => setShowAddWorker(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.length === 0 ? (
              <div className="table-container"><div className="empty-state">No contract workers — add one above</div></div>
            ) : filtered.map(w => (
              <div key={w.id} style={cardStyle(w)} onClick={() => openWorker(w)}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(10,132,255,0.1)", border: "1px solid rgba(10,132,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Package size={18} style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: "600", fontSize: "15px" }}>{w.name}</p>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {w.workType} · <strong style={{ color: "var(--accent)" }}>₹{w.ratePerUnit}</strong> {w.unit}
                      {w.phone && ` · ${w.phone}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }} onClick={e => e.stopPropagation()}>
                  <span className={`badge ${w.status === "Active" ? "badge-green" : "badge-red"}`}>{w.status}</span>
                  <button className="add-btn" style={{ padding: "7px 14px", fontSize: "12px" }} onClick={() => openWorker(w)}>View</button>
                  <button className="delete-btn" style={{ padding: "7px 14px", fontSize: "12px" }} onClick={() => deleteWorker(w.id, w.name)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "detail" && summary && (
        <>
          <button className="secondary-btn" style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => { setTab("workers"); setSummary(null); }}>
            ← Back to Workers
          </button>

          {/* Worker summary card */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 24px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: 0 }}>{summary.worker.name}</h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {summary.worker.workType} · ₹{summary.worker.ratePerUnit} {summary.worker.unit}
                  {summary.worker.phone && ` · ${summary.worker.phone}`}
                </p>
              </div>
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Work</p>
                  <p style={{ fontSize: "20px", fontWeight: "700", color: "var(--green)" }}>₹{summary.totalWork.toLocaleString()}</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>Advances Given</p>
                  <p style={{ fontSize: "20px", fontWeight: "700", color: "var(--amber)" }}>₹{summary.totalAdvances.toLocaleString()}</p>
                </div>
                <div style={{ textAlign: "center", padding: "0 8px", borderRadius: "10px", background: summary.balance >= 0 ? "rgba(48,209,88,0.08)" : "rgba(255,69,58,0.08)", border: `1px solid ${summary.balance >= 0 ? "rgba(48,209,88,0.2)" : "rgba(255,69,58,0.2)"}` }}>
                  <p style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>{summary.balance >= 0 ? "Balance Due" : "Excess Paid"}</p>
                  <p style={{ fontSize: "20px", fontWeight: "700", color: summary.balance >= 0 ? "var(--green)" : "var(--red)" }}>₹{Math.abs(summary.balance).toLocaleString()}</p>
                </div>
              </div>
            </div>
            {summary.balance > 0 && (
              <div style={{ padding: "10px 14px", background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)", borderRadius: "var(--radius-md)", fontSize: "13px", color: "var(--green)" }}>
                You owe this worker <strong>₹{summary.balance.toLocaleString()}</strong> (Work done minus advances given)
              </div>
            )}
            {summary.balance < 0 && (
              <div style={{ padding: "10px 14px", background: "rgba(255,214,10,0.08)", border: "1px solid rgba(255,214,10,0.2)", borderRadius: "var(--radius-md)", fontSize: "13px", color: "var(--amber)" }}>
                Worker has received <strong>₹{Math.abs(summary.balance).toLocaleString()}</strong> more than work completed
              </div>
            )}
            {summary.balance === 0 && (
              <div style={{ padding: "10px 14px", background: "rgba(10,132,255,0.08)", border: "1px solid rgba(10,132,255,0.2)", borderRadius: "var(--radius-md)", fontSize: "13px", color: "var(--accent)" }}>
                All settled — work and advances are equal
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
            {/* Add work entry */}
            <div className="form-panel">
              <h2 style={{ marginBottom: "14px" }}>Add Work Entry</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input type="text" placeholder={`Description (e.g. Stone work batch 1)`} value={workDesc} onChange={e => setWorkDesc(e.target.value)} />
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="number" placeholder={`Quantity (${summary.worker.unit})`} value={workQty} onChange={e => setWorkQty(e.target.value)} style={{ flex: 1 }} min="0" step="0.01" />
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{summary.worker.unit} × ₹{summary.worker.ratePerUnit}</span>
                </div>
                {workQty && <div style={{ fontSize: "13px", color: "var(--green)", fontWeight: "600" }}>= ₹{(workQty * summary.worker.ratePerUnit).toLocaleString()}</div>}
                <DatePicker value={workDate} onChange={setWorkDate} />
              </div>
              <div className="form-actions" style={{ marginTop: "14px" }}>
                <button className="add-btn" onClick={addWork}>Add Work</button>
              </div>
            </div>

            {/* Add advance */}
            <div className="form-panel">
              <h2 style={{ marginBottom: "14px" }}>Add Advance</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input type="number" placeholder="Amount (₹)" value={advAmount} onChange={e => setAdvAmount(e.target.value)} min="0" />
                <input type="text" placeholder="Reason (optional)" value={advReason} onChange={e => setAdvReason(e.target.value)} />
                <DatePicker value={advDate} onChange={setAdvDate} />
              </div>
              <div className="form-actions" style={{ marginTop: "14px" }}>
                <button className="add-btn" style={{ background: "var(--amber)", color: "#000" }} onClick={addAdvance}>Add Advance</button>
              </div>
            </div>
          </div>

          {/* Work history */}
          <div className="table-container" style={{ marginBottom: "24px" }}>
            <div style={{ padding: "16px 20px 12px", fontWeight: "600", fontSize: "14px", borderBottom: "1px solid var(--border-subtle)" }}>Work Completed ({summary.work.length} entries)</div>
            <table className="employee-table">
              <thead><tr><th>Date</th><th>Description</th><th>Quantity</th><th>Rate</th><th>Amount</th><th></th></tr></thead>
              <tbody>
                {summary.work.length === 0 ? (
                  <tr><td colSpan={6} className="empty-state">No work entries yet</td></tr>
                ) : summary.work.map(w => (
                  <tr key={w.id}>
                    <td style={{ color: "var(--text-secondary)" }}>{w.date}</td>
                    <td>{w.description || "—"}</td>
                    <td>{w.quantity} {w.unit}</td>
                    <td style={{ color: "var(--text-secondary)" }}>₹{w.ratePerUnit}</td>
                    <td><span className="badge badge-green">₹{w.amount.toLocaleString()}</span></td>
                    <td><button className="delete-btn" style={{ padding: "6px 12px", fontSize: "11px" }} onClick={() => deleteWork(w.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Advances history */}
          <div className="table-container">
            <div style={{ padding: "16px 20px 12px", fontWeight: "600", fontSize: "14px", borderBottom: "1px solid var(--border-subtle)" }}>Advances Given ({summary.advances.length} entries)</div>
            <table className="employee-table">
              <thead><tr><th>Date</th><th>Amount</th><th>Reason</th><th></th></tr></thead>
              <tbody>
                {summary.advances.length === 0 ? (
                  <tr><td colSpan={4} className="empty-state">No advances given yet</td></tr>
                ) : summary.advances.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: "var(--text-secondary)" }}>{a.date}</td>
                    <td><span className="badge badge-amber">₹{a.amount.toLocaleString()}</span></td>
                    <td style={{ color: "var(--text-secondary)" }}>{a.reason || "—"}</td>
                    <td><button className="delete-btn" style={{ padding: "6px 12px", fontSize: "11px" }} onClick={() => deleteAdvance(a.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

export default Contracts;
