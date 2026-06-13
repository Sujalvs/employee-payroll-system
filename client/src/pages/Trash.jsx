import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import API from "../api.js";

async function confirmDialog(message, confirmText = "Yes") {
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

const TYPE_LABELS = {
  employee: { label: "Employee", color: "var(--accent)", badge: "badge-blue" },
  attendance: { label: "Attendance", color: "var(--green)", badge: "badge-green" },
  advance: { label: "Advance", color: "var(--amber)", badge: "badge-amber" },
  overtime: { label: "Overtime", color: "var(--accent)", badge: "badge-blue" },
  payment: { label: "Payment", color: "var(--green)", badge: "badge-green" },
};

const TABS = ["All", "Employee", "Attendance", "Advance", "Overtime", "Payment"];

function Trash() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState(`All`);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchTrash(); }, []);

  async function fetchTrash() {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/trash`);
      setItems(r.data);
    } catch(e) { console.log(e); }
    setLoading(false);
  }

  async function restoreItem(item) {
    try {
      if (item.type === `employee`) {
        await axios.post(`${API}/api/trash/restore/employee/${item.id}`);
      } else {
        await axios.post(`${API}/api/trash/restore/record/${item.id}`);
      }
      toast.success(`Restored successfully`);
      fetchTrash();
    } catch(e) {
      toast.error(e.response?.data?.message || "Restore failed");
    }
  }

  async function deleteForever(item) {
    if (!await confirmDialog("Permanently delete "${item.label}`? This cannot be undone.`, `Delete Forever`)) return;
    try {
      await axios.delete(`${API}/api/trash/${item.id}`);
      toast.success(`Permanently deleted`);
      fetchTrash();
    } catch(e) { toast.error("Failed to delete"); }
  }

  async function emptyTrash() {
    if (!await confirmDialog("Empty the entire trash? All items will be permanently deleted.", "Empty Trash")) return;
    try {
      await axios.delete(`${API}/api/trash`);
      toast.success(`Trash emptied`);
      fetchTrash();
    } catch(e) { toast.error("Failed to empty trash"); }
  }

  const filtered = activeTab === "All"
    ? items
    : items.filter(i => i.type === activeTab.toLowerCase());

  function formatDate(iso) {
    return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function renderData(item) {
    const d = JSON.parse(item.data);
    if (item.type === "employee") return (
      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
        Dept: {d.department} · Wage: ₹{d.wage}{d.phone ? ` · Phone: ${d.phone}" : ""}
      </div>
    );
    if (item.type === "attendance") return (
      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
        Date: {d.date} · Status: <span style={{ color: d.status === "Present" ? "var(--green)" : "var(--red)" }}>{d.status}</span>
      </div>
    );
    if (item.type === "advance") return (
      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
        Amount: <span style={{ color: "var(--amber)" }}>₹{d.amount}</span> · Date: {d.date}{d.reason ? ` · ${d.reason}" : ""}
      </div>
    );
    if (item.type === "overtime") return (
      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
        Hours: {d.hours} · Rate: ₹{d.rate} · Amount: <span style={{ color: "var(--accent)" }}>₹{d.hours * d.rate}</span> · Date: {d.date}
      </div>
    );
    if (item.type === "payment") return (
      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
        Amount: <span style={{ color: "var(--green)" }}>₹{d.amount}</span> · Date: {d.date}{d.category ? ` · ${d.category}" : ""}
      </div>
    );
    return null;
  }

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
          <h1>Trash</h1>
          <span className="badge badge-red">{items.length} item{items.length !== 1 ? "s" : ""}</span>
        </div>
        <p className="dashboard-subtitle">Deleted items are stored here and can be restored</p>
      </div>

      {/* Warning */}
      <div style={{ background: "rgba(255,69,58,0.06)", border: "1px solid rgba(255,69,58,0.2)", borderRadius: "var(--radius-md)", padding: "12px 16px", marginBottom: "24px", display: "flex", gap: "10px", alignItems: "center" }}>
        <AlertTriangle size={15} style={{ color: "var(--red)", flexShrink: 0 }} />
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          This page is for recovery only. Items here can be restored to their original location or permanently deleted.
        </p>
      </div>

      {/* Tabs + Empty button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div className="tab-bar">
          {TABS.map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>
        {items.length > 0 && (
          <button className="delete-btn" onClick={emptyTrash} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Trash2 size={14} /> Empty Trash
          </button>
        )}
      </div>

      {/* Items */}
      {loading ? (
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="table-container">
          <div className="empty-state">
            <Trash2 size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p>Trash is empty</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map(item => {
            const typeInfo = TYPE_LABELS[item.type] || { label: item.type, badge: "" };
            return (
              <div key={item.id} style={{
                background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)", padding: "16px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span className={`badge ${typeInfo.badge}`} style={{ fontSize: "11px" }}>{typeInfo.label}</span>
                    <span style={{ fontWeight: "600", fontSize: "14px" }}>{item.label}</span>
                  </div>
                  {renderData(item)}
                  <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "6px" }}>
                    Deleted {formatDate(item.deletedAt)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button
                    className="add-btn"
                    onClick={() => restoreItem(item)}
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "8px 14px" }}
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => deleteForever(item)}
                    style={{ fontSize: "12px", padding: "8px 14px" }}
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default Trash;
