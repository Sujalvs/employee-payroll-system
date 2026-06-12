import { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Shield, Users, Download, Trash2, Plus, Clock, RotateCcw, HardDrive, Upload, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

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

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function Settings() {
  // Password
  const [cpUsername, setCpUsername] = useState("admin");
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");

  // Admins
  const [admins, setAdmins] = useState([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Backup
  const [backups, setBackups] = useState([]);
  const [backupSettings, setBackupSettings] = useState({ autoBackup: false, keepDays: 30 });
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetPassword, setResetPassword] = useState("");

  const restoreInputRef = useRef(null);

  useEffect(() => {
    fetchAdmins();
    fetchBackups();
    fetchBackupSettings();
  }, []);

  async function resetToDefault() {
    if (!resetPassword) {
      toast.error("Please enter the reset password");
      return;
    }
    const confirmed = await confirmDialog(
      "This will permanently delete ALL employees, attendance, advances, overtime and payments. Admin accounts are kept. A backup is created first.",
      "Yes, reset everything"
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      await axios.post("http://localhost:8000/api/backup/reset", { resetPassword });
      setResetPassword("");
      toast.success("System reset to default. All data cleared.", { duration: 5000 });
      fetchBackups();
    } catch (e) {
      toast.error(e.response?.data?.message || "Reset failed");
    }
    setResetting(false);
  }

  // ── Admins ────────────────────────────────────────────
  async function fetchAdmins() {
    try { const r = await axios.get("http://localhost:8000/api/auth/admins"); setAdmins(r.data); }
    catch (e) { console.log(e); }
  }

  async function changePassword() {
    if (!cpCurrent || !cpNew || !cpConfirm) { toast.error("Please fill all fields"); return; }
    if (cpNew !== cpConfirm) { toast.error("New passwords do not match"); return; }
    if (cpNew.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    try {
      await axios.post("http://localhost:8000/api/auth/change-password", {
        username: cpUsername, currentPassword: cpCurrent, newPassword: cpNew,
      });
      setCpCurrent(""); setCpNew(""); setCpConfirm("");
      toast.success("Password changed successfully");
    } catch (e) { toast.error(e.response?.data?.message || "Something went wrong"); }
  }

  async function createAdmin() {
    if (!newUsername || !newPassword) { toast.error("Please fill username and password"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    try {
      await axios.post("http://localhost:8000/api/auth/create-admin", { username: newUsername, password: newPassword });
      setNewUsername(""); setNewPassword("");
      fetchAdmins();
      toast.success(`Admin "${newUsername}" created`);
    } catch (e) { toast.error(e.response?.data?.message || "Something went wrong"); }
  }

  async function deleteAdmin(id, username) {
    if (!await confirmDialog(`Delete admin "${username}"?`)) return;
    try {
      await axios.delete(`http://localhost:8000/api/auth/admins/${id}`);
      fetchAdmins(); toast.success("Admin deleted");
    } catch (e) { toast.error(e.response?.data?.message || "Cannot delete this admin"); }
  }

  // ── Backup ────────────────────────────────────────────
  async function fetchBackups() {
    try { const r = await axios.get("http://localhost:8000/api/backup/list"); setBackups(r.data); }
    catch (e) { console.log(e); }
  }

  async function fetchBackupSettings() {
    try { const r = await axios.get("http://localhost:8000/api/backup/settings"); setBackupSettings(r.data); }
    catch (e) { console.log(e); }
  }

  async function saveBackupSettings(updated) {
    try {
      await axios.post("http://localhost:8000/api/backup/settings", updated);
      setBackupSettings(updated);
      toast.success(updated.autoBackup ? "Auto backup enabled — runs daily at 2:00 AM" : "Auto backup disabled");
    } catch (e) { toast.error("Failed to save settings"); }
  }

  async function createManualBackup() {
    setCreatingBackup(true);
    try {
      const r = await axios.post("http://localhost:8000/api/backup/create");
      toast.success("Backup created: " + r.data.backup.filename);
      fetchBackups();
    } catch (e) { toast.error(e.response?.data?.message || "Backup failed"); }
    setCreatingBackup(false);
  }

  function downloadBackup(filename) {
    window.open(`http://localhost:8000/api/backup/download/${filename}`, "_blank");
  }

  async function deleteBackup(filename) {
    if (!await confirmDialog(`Delete backup "${filename}"?`, "Yes, delete")) return;
    try {
      await axios.delete(`http://localhost:8000/api/backup/${filename}`);
      toast.success("Backup deleted");
      fetchBackups();
    } catch (e) { toast.error("Failed to delete backup"); }
  }

  async function handleRestoreFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ""; // reset input

    if (!file.name.endsWith(".db")) {
      toast.error("Please select a .db backup file");
      return;
    }

    const confirmed = await confirmDialog(
      `Restore from "${file.name}"? This will REPLACE all current data with the backup. A safety backup will be created first.`,
      "Yes, restore"
    );
    if (!confirmed) return;

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append("backup", file);
      const r = await axios.post("http://localhost:8000/api/backup/restore", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(r.data.message, { duration: 6000 });
      fetchBackups();
    } catch (e) {
      toast.error(e.response?.data?.message || "Restore failed");
    }
    setRestoring(false);
  }

  // ── Full Excel export (existing feature) ─────────────
  async function exportAllData() {
    try {
      const [emps, att, adv, ot, pmts] = await Promise.all([
        axios.get("http://localhost:8000/api/employees"),
        axios.get("http://localhost:8000/api/attendance"),
        axios.get("http://localhost:8000/api/advances"),
        axios.get("http://localhost:8000/api/overtime"),
        axios.get("http://localhost:8000/api/payments"),
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(emps.data.map((e) => ({ ID: e.id, Name: e.name, Department: e.department, "Daily Wage": e.wage, Phone: e.phone || "", Notes: e.notes || "", Status: e.status }))), "Employees");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(att.data.map((a) => ({ Employee: a.employeeName, Date: a.date, Status: a.status }))), "Attendance");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(adv.data.map((a) => ({ Employee: a.employeeName, Amount: a.amount, Reason: a.reason || "", Date: a.date }))), "Advances");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ot.data.map((o) => ({ Employee: o.employeeName, Hours: o.hours, Rate: o.rate, Amount: o.hours * o.rate, Date: o.date }))), "Overtime");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pmts.data.map((p) => ({ Employee: p.employeeName, Amount: p.amount, Note: p.note || "", Date: p.date }))), "Payments");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([buf], { type: "application/octet-stream" }), `Kshethropasana_Backup_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel export downloaded");
    } catch (e) { toast.error("Export failed"); }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1>Settings</h1>
        <p className="dashboard-subtitle">Manage account, admins, backups and data</p>
      </div>

      {/* ── Change Password ── */}
      <div className="form-panel" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <Shield size={18} style={{ color: "var(--accent)" }} />
          <h2 style={{ margin: 0 }}>Change Password</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", maxWidth: "600px" }}>
          <input type="text" placeholder="Username" value={cpUsername} onChange={(e) => setCpUsername(e.target.value)} />
          <input type="password" placeholder="Current password" value={cpCurrent} onChange={(e) => setCpCurrent(e.target.value)} />
          <input type="password" placeholder="New password (min 6 chars)" value={cpNew} onChange={(e) => setCpNew(e.target.value)} />
          <input type="password" placeholder="Confirm new password" value={cpConfirm} onChange={(e) => setCpConfirm(e.target.value)} />
        </div>
        <div className="form-actions" style={{ marginTop: "16px" }}>
          <button className="add-btn" onClick={changePassword}>Change Password</button>
        </div>
      </div>

      {/* ── Admin Users ── */}
      <div className="form-panel" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <Users size={18} style={{ color: "var(--accent)" }} />
          <h2 style={{ margin: 0 }}>Admin Users</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {admins.map((admin) => (
            <div key={admin.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--bg-hover)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--accent-glow)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", color: "var(--accent)", fontSize: "13px" }}>
                  {admin.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: "600", fontSize: "14px" }}>{admin.username}</p>
                  {admin.id === 1 && <p style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>Primary admin — cannot be deleted</p>}
                </div>
              </div>
              {admin.id !== 1 && (
                <button className="delete-btn" style={{ padding: "7px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => deleteAdmin(admin.id, admin.username)}>
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px", fontWeight: "600" }}>Add new admin</p>
        <div className="employee-form" style={{ maxWidth: "500px" }}>
          <input type="text" placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
          <input type="password" placeholder="Password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div className="form-actions" style={{ marginTop: "16px" }}>
          <button className="add-btn" onClick={createAdmin} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={14} /> Create Admin
          </button>
        </div>
      </div>

      {/* ── Auto Backup Settings ── */}
      <div className="form-panel" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <Clock size={18} style={{ color: "var(--accent)" }} />
          <h2 style={{ margin: 0 }}>Auto Backup</h2>
          <span className={`badge ${backupSettings.autoBackup ? "badge-green" : "badge-red"}`} style={{ marginLeft: "4px" }}>
            {backupSettings.autoBackup ? "Enabled" : "Disabled"}
          </span>
        </div>

        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>
          When enabled, the server automatically backs up the database every day at <strong style={{ color: "var(--text-primary)" }}>2:00 AM</strong>.
          Backup files are stored in <code style={{ background: "var(--bg-hover)", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>server/database/backups/</code>
        </p>

        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", marginBottom: "20px" }}>
          {/* Toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <div
              onClick={() => saveBackupSettings({ ...backupSettings, autoBackup: !backupSettings.autoBackup })}
              style={{
                width: "44px", height: "24px", borderRadius: "99px", position: "relative", cursor: "pointer",
                background: backupSettings.autoBackup ? "var(--accent)" : "var(--bg-hover)",
                border: "1px solid var(--border-default)",
                transition: "background 0.2s ease",
              }}
            >
              <div style={{
                position: "absolute", top: "3px",
                left: backupSettings.autoBackup ? "22px" : "3px",
                width: "16px", height: "16px", borderRadius: "50%",
                background: "#fff", transition: "left 0.2s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }} />
            </div>
            <span style={{ fontSize: "14px", fontWeight: "500" }}>
              {backupSettings.autoBackup ? "Auto backup is ON" : "Auto backup is OFF"}
            </span>
          </label>

          {/* Keep days */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Keep backups for</span>
            <select
              value={backupSettings.keepDays}
              onChange={(e) => saveBackupSettings({ ...backupSettings, keepDays: Number(e.target.value) })}
              style={{ background: "var(--bg-hover)", color: "var(--text-primary)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "8px 30px 8px 12px", fontSize: "13px", fontFamily: "inherit", appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Backup History ── */}
      <div className="form-panel" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <HardDrive size={18} style={{ color: "var(--accent)" }} />
            <h2 style={{ margin: 0 }}>Backup History</h2>
            <span className="badge badge-blue">{backups.length} backup{backups.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="secondary-btn" onClick={fetchBackups} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              className="add-btn"
              onClick={createManualBackup}
              disabled={creatingBackup}
              style={{ display: "flex", alignItems: "center", gap: "6px", opacity: creatingBackup ? 0.7 : 1 }}
            >
              <HardDrive size={14} />
              {creatingBackup ? "Creating..." : "Back Up Now"}
            </button>
          </div>
        </div>

        {backups.length === 0 ? (
          <div className="empty-state" style={{ padding: "32px" }}>
            No backups yet — click "Back Up Now" to create the first one
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {backups.map((b) => (
              <div key={b.filename} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", background: "var(--bg-hover)", borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: "12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <HardDrive size={16} style={{ color: b.filename.includes("auto") ? "var(--accent)" : "var(--green)", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: "600", fontSize: "13px", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.filename}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {formatDate(b.createdAt)} · {formatBytes(b.size)}
                      {b.filename.includes("auto") && <span className="badge badge-blue" style={{ marginLeft: "8px", padding: "1px 7px", fontSize: "10px" }}>auto</span>}
                      {b.filename.includes("manual") && <span className="badge badge-green" style={{ marginLeft: "8px", padding: "1px 7px", fontSize: "10px" }}>manual</span>}
                      {b.filename.includes("pre-restore") && <span className="badge badge-amber" style={{ marginLeft: "8px", padding: "1px 7px", fontSize: "10px" }}>pre-restore</span>}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button className="secondary-btn" style={{ padding: "7px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => downloadBackup(b.filename)}>
                    <Download size={12} /> Download
                  </button>
                  <button className="delete-btn" style={{ padding: "7px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => deleteBackup(b.filename)}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Restore from Backup ── */}
      <div className="form-panel" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <RotateCcw size={18} style={{ color: "var(--amber)" }} />
          <h2 style={{ margin: 0 }}>Restore from Backup</h2>
        </div>

        <input
          type="file"
          accept=".db"
          ref={restoreInputRef}
          onChange={handleRestoreFile}
          style={{ display: "none" }}
        />

        <button
          className="add-btn"
          onClick={() => restoreInputRef.current.click()}
          disabled={restoring}
          style={{ background: restoring ? "var(--bg-hover)" : "rgba(255,214,10,0.15)", color: "var(--amber)", border: "1px solid rgba(255,214,10,0.3)", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", padding: "12px 24px", opacity: restoring ? 0.7 : 1 }}
        >
          <Upload size={16} />
          {restoring ? "Restoring..." : "Upload & Restore .db File"}
        </button>
      </div>

      {/* ── Reset to Default ── */}
      <div className="form-panel" style={{ marginBottom: "24px", border: "1px solid rgba(255,69,58,0.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <RefreshCw size={18} style={{ color: "var(--red)" }} />
          <h2 style={{ margin: 0, color: "var(--red)" }}>Reset to Default</h2>
        </div>

        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "10px" }}>
          Enter the <strong style={{ color: "var(--text-primary)" }}>reset password</strong> set by the administrator:
        </p>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="password"
            placeholder="Enter reset password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && resetToDefault()}
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)", padding: "11px 14px",
              fontSize: "14px", fontFamily: "inherit", width: "260px",
            }}
          />
          <button
            onClick={resetToDefault}
            disabled={resetting || !resetPassword}
            style={{
              background: resetPassword ? "rgba(255,69,58,0.15)" : "var(--bg-hover)",
              color: resetPassword ? "var(--red)" : "var(--text-tertiary)",
              border: `1px solid ${resetPassword ? "rgba(255,69,58,0.35)" : "var(--border-subtle)"}`,
              padding: "11px 22px", borderRadius: "var(--radius-md)",
              cursor: resetPassword && !resetting ? "pointer" : "not-allowed",
              fontSize: "14px", fontWeight: "600", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: "8px",
              transition: "all 0.15s ease", opacity: resetting ? 0.7 : 1,
            }}
          >
            <RefreshCw size={15} />
            {resetting ? "Resetting..." : "Reset All Data"}
          </button>
        </div>


      </div>

      {/* ── Excel Export ── */}
      <div className="form-panel">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <Download size={18} style={{ color: "var(--accent)" }} />
          <h2 style={{ margin: 0 }}>Export to Excel</h2>
        </div>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>
          Export all data as a human-readable Excel file with separate sheets for each table. Good for sharing or printing.
        </p>
        <button className="add-btn" onClick={exportAllData} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", padding: "12px 24px" }}>
          <Download size={16} /> Export Full Excel Backup
        </button>
      </div>
    </>
  );
}

export default Settings;
