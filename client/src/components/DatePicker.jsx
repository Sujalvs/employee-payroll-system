import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function DatePicker({ value, onChange, placeholder = "Select date" }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const ref = useRef(null);

  // Parse existing value
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(day) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const mm = String(viewMonth + 1).padStart(2, "0");
  const selectedDay = value && value.startsWith(`${viewYear}-${mm}`) ? parseInt(value.split("-")[2]) : null;

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "var(--bg-hover)", border: `1px solid ${open ? "var(--accent)" : "var(--border-default)"}`,
          borderRadius: "var(--radius-md)", padding: "11px 14px",
          cursor: "pointer", fontSize: "14px", color: value ? "var(--text-primary)" : "var(--text-tertiary)",
          boxShadow: open ? "0 0 0 3px var(--accent-glow)" : "none",
          transition: "all 0.15s ease",
          userSelect: "none",
        }}
      >
        <Calendar size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{displayValue || placeholder}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 500,
          background: "#161616", border: "1px solid var(--border-default)",
          borderRadius: "20px", padding: "20px", width: "300px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
        }}>
          {/* Month/Year nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <button onClick={prevMonth} style={{ background: "var(--bg-hover)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontWeight: "700", fontSize: "15px" }}>{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{ background: "var(--bg-hover)", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "6px" }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: "11px", fontWeight: "600", color: "var(--text-tertiary)", padding: "4px 0" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const dateStr = `${viewYear}-${mm}-${String(day).padStart(2, "0")}`;
              const isSelected = day === selectedDay;
              const isToday = dateStr === today;

              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  style={{
                    height: "36px", borderRadius: "50%", border: "none",
                    cursor: "pointer", fontSize: "13px", fontWeight: isSelected ? "700" : "400",
                    background: isSelected ? "var(--accent)" : isToday ? "var(--accent-glow)" : "transparent",
                    color: isSelected ? "#fff" : isToday ? "var(--accent)" : "var(--text-primary)",
                    transition: "all 0.1s ease",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.target.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.target.style.background = isToday ? "var(--accent-glow)" : "transparent"; }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: "12px", paddingTop: "12px", textAlign: "center" }}>
            <button
              onClick={() => { onChange(today); setOpen(false); }}
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatePicker;
