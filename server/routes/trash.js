const express = require("express");
module.exports = function (db) {
  const router = express.Router();

  // Get all trash items, newest first
  router.get("/", (req, res) => {
    try {
      res.json(db.prepare("SELECT * FROM trash ORDER BY deletedAt DESC").all());
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  // Get trash by type
  router.get("/:type", (req, res) => {
    try {
      res.json(db.prepare("SELECT * FROM trash WHERE type=? ORDER BY deletedAt DESC").all(req.params.type));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  // Permanently delete one item from trash
  router.delete("/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM trash WHERE id=?").run(req.params.id);
      res.json({ message: "Permanently deleted" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  // Empty all trash
  router.delete("/", (req, res) => {
    try {
      db.prepare("DELETE FROM trash").run();
      res.json({ message: "Trash emptied" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  // Restore employee
  router.post("/restore/employee/:id", (req, res) => {
    try {
      const item = db.prepare("SELECT * FROM trash WHERE id=? AND type='employee'").get(req.params.id);
      if (!item) return res.status(404).json({ message: "Item not found in trash" });
      const data = JSON.parse(item.data);
      const cols = db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
      if (cols.includes("position")) {
        db.prepare("INSERT INTO employees (id, name, position, department, wage, status, phone, notes) VALUES (?,?,?,?,?,?,?,?)")
          .run(data.id, data.name, data.position||data.department, data.department, data.wage, data.status||'Active', data.phone||null, data.notes||null);
      } else {
        db.prepare("INSERT INTO employees (id, name, department, wage, status, phone, notes) VALUES (?,?,?,?,?,?,?)")
          .run(data.id, data.name, data.department, data.wage, data.status||'Active', data.phone||null, data.notes||null);
      }
      // Restore all related records
      const related = db.prepare("SELECT * FROM trash WHERE type!=? AND JSON_EXTRACT(data,'$.employeeId')=?").all('employee', String(data.id));
      related.forEach(r => {
        const d = JSON.parse(r.data);
        if (r.type === 'attendance') db.prepare("INSERT OR IGNORE INTO attendance (id,employeeId,date,status) VALUES (?,?,?,?)").run(d.id,d.employeeId,d.date,d.status);
        if (r.type === 'advance') db.prepare("INSERT OR IGNORE INTO advances (id,employeeId,amount,reason,date) VALUES (?,?,?,?,?)").run(d.id,d.employeeId,d.amount,d.reason||null,d.date);
        if (r.type === 'overtime') db.prepare("INSERT OR IGNORE INTO overtime (id,employeeId,hours,rate,date) VALUES (?,?,?,?,?)").run(d.id,d.employeeId,d.hours,d.rate,d.date);
        if (r.type === 'payment') db.prepare("INSERT OR IGNORE INTO payments (id,employeeId,amount,note,date,category) VALUES (?,?,?,?,?,?)").run(d.id,d.employeeId,d.amount,d.note||null,d.date,d.category||null);
        db.prepare("DELETE FROM trash WHERE id=?").run(r.id);
      });
      db.prepare("DELETE FROM trash WHERE id=?").run(req.params.id);
      res.json({ message: `Employee "${data.name}" restored successfully` });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  // Restore single record (attendance/advance/overtime/payment)
  router.post("/restore/record/:id", (req, res) => {
    try {
      const item = db.prepare("SELECT * FROM trash WHERE id=?").get(req.params.id);
      if (!item) return res.status(404).json({ message: "Item not found in trash" });
      const d = JSON.parse(item.data);
      if (item.type === 'attendance') db.prepare("INSERT OR IGNORE INTO attendance (id,employeeId,date,status) VALUES (?,?,?,?)").run(d.id,d.employeeId,d.date,d.status);
      if (item.type === 'advance') db.prepare("INSERT OR IGNORE INTO advances (id,employeeId,amount,reason,date) VALUES (?,?,?,?,?)").run(d.id,d.employeeId,d.amount,d.reason||null,d.date);
      if (item.type === 'overtime') db.prepare("INSERT OR IGNORE INTO overtime (id,employeeId,hours,rate,date) VALUES (?,?,?,?,?)").run(d.id,d.employeeId,d.hours,d.rate,d.date);
      if (item.type === 'payment') db.prepare("INSERT OR IGNORE INTO payments (id,employeeId,amount,note,date,category) VALUES (?,?,?,?,?,?)").run(d.id,d.employeeId,d.amount,d.note||null,d.date,d.category||null);
      db.prepare("DELETE FROM trash WHERE id=?").run(req.params.id);
      res.json({ message: "Record restored successfully" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
