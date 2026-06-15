import API from "../api.js";
import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { MapPin, Plus, Trash2, Edit2, Check, X } from "lucide-react";

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

function Projects() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState("Active");

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    try { const r = await axios.get(`${API}/api/projects`); setProjects(r.data); }
    catch(e) { console.log(e); }
  }

  async function addProject() {
    if (!name.trim()) { toast.error("Project name required"); return; }
    try {
      await axios.post(`${API}/api/projects`, { name: name.trim(), location: location.trim() });
      setName(""); setLocation("");
      fetchProjects(); toast.success("Project added");
    } catch(e) { toast.error(e.response?.data?.message || "Failed to add project"); }
  }

  async function saveEdit(id) {
    try {
      await axios.put(`${API}/api/projects/${id}`, { name: editName, location: editLocation, status: editStatus });
      setEditingId(null); fetchProjects(); toast.success("Project updated");
    } catch(e) { toast.error("Failed to update project"); }
  }

  async function deleteProject(id, name) {
    if (!await confirmDialog(`Delete project "${name}"? This won't affect past attendance records.`)) return;
    try {
      await axios.delete(`${API}/api/projects/${id}`);
      fetchProjects(); toast.success("Project deleted");
    } catch(e) { toast.error("Failed to delete project"); }
  }

  function startEdit(p) {
    setEditingId(p.id); setEditName(p.name);
    setEditLocation(p.location || ""); setEditStatus(p.status || "Active");
  }

  const active = projects.filter(p => p.status === "Active");
  const inactive = projects.filter(p => p.status !== "Active");

  return (
    <>
      <div style={{ marginBottom: "32px" }}>
        <h1>Projects</h1>
        <p className="dashboard-subtitle">Manage project sites — assign workers to projects in Attendance</p>
      </div>

      {/* Add project */}
      <div className="form-panel" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <MapPin size={18} style={{ color: "var(--accent)" }} />
          <h2 style={{ margin: 0 }}>Add New Project</h2>
        </div>
        <div className="employee-form">
          <input type="text" placeholder="Project name *" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && addProject()} />
          <input type="text" placeholder="Location (optional)" value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === "Enter" && addProject()} />
        </div>
        <div className="form-actions" style={{ marginTop: "16px" }}>
          <button className="add-btn" onClick={addProject} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={14} /> Add Project
          </button>
        </div>
      </div>

      {/* Active projects */}
      <h2 style={{ marginBottom: "14px", fontSize: "16px" }}>Active Projects ({active.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
        {active.length === 0 ? (
          <div className="table-container"><div className="empty-state">No active projects — add one above</div></div>
        ) : active.map(p => (
          <div key={p.id} style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", padding: "16px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap",
          }}>
            {editingId === p.id ? (
              <>
                <div style={{ display: "flex", gap: "10px", flex: 1, flexWrap: "wrap" }}>
                  <input value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 1, minWidth: "140px" }} />
                  <input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="Location" style={{ flex: 1, minWidth: "140px" }} />
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ minWidth: "120px" }}>
                    <option>Active</option>
                    <option>Completed</option>
                    <option>On Hold</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="add-btn" style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => saveEdit(p.id)}><Check size={13} /> Save</button>
                  <button className="secondary-btn" style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => setEditingId(null)}><X size={13} /> Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "var(--accent-glow)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <MapPin size={16} style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: "600", fontSize: "15px" }}>{p.name}</p>
                    {p.location && <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{p.location}</p>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="secondary-btn" style={{ padding: "8px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => startEdit(p)}>
                    <Edit2 size={12} /> Edit
                  </button>
                  {p.id !== 1 && (
                    <button className="delete-btn" style={{ padding: "8px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => deleteProject(p.id, p.name)}>
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Completed/On Hold projects */}
      {inactive.length > 0 && (
        <>
          <h2 style={{ marginBottom: "14px", fontSize: "16px", color: "var(--text-secondary)" }}>Completed / On Hold ({inactive.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {inactive.map(p => (
              <div key={p.id} style={{
                background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)", padding: "16px 20px", opacity: 0.6,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <MapPin size={16} style={{ color: "var(--text-tertiary)" }} />
                  <div>
                    <p style={{ fontWeight: "600", fontSize: "15px" }}>{p.name}</p>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{p.location || ""} · {p.status}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="secondary-btn" style={{ padding: "8px 14px", fontSize: "12px" }} onClick={() => startEdit(p)}>Edit</button>
                  <button className="delete-btn" style={{ padding: "8px 14px", fontSize: "12px" }} onClick={() => deleteProject(p.id, p.name)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default Projects;
