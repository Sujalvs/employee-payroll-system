const express = require("express");

function sendToTrash(db, type, label, data) {
  db.prepare("INSERT INTO trash (type, label, data, deletedAt) VALUES (?,?,?,?)")
    .run(type, label, JSON.stringify(data), new Date().toISOString());
}

module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    try {
      res.json(db.prepare(`SELECT a.id, a.employeeId, e.name AS employeeName, e.department,
        a.date, a.status, a.project
        FROM attendance a JOIN employees e ON a.employeeId=e.id
        ORDER BY a.date DESC`).all());
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/employee/:id", (req, res) => {
    try {
      res.json(db.prepare("SELECT date, status, project FROM attendance WHERE employeeId=? ORDER BY date DESC").all(req.params.id));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/bulk", (req, res) => {
    const { records } = req.body;
    if (!records || !records.length) return res.status(400).json({ message: "No records provided" });
    try {
      const date = records[0].date;
      const ids = records.map(r => r.employeeId);
      const placeholders = ids.map(() => "?").join(",");
      db.prepare(`DELETE FROM attendance WHERE date=? AND employeeId IN (${placeholders})`).run(date, ...ids);
      const insert = db.prepare("INSERT INTO attendance (employeeId, date, status, project) VALUES (?,?,?,?)");
      const insertMany = db.transaction((recs) => { recs.forEach(r => insert.run(r.employeeId, r.date, r.status, r.project||null)); });
      insertMany(records);
      res.json({ message: `${records.length} records saved` });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/", (req, res) => {
    const { employeeId, date, status, project } = req.body;
    try {
      const result = db.prepare("INSERT INTO attendance (employeeId, date, status, project) VALUES (?,?,?,?)").run(employeeId, date, status, project||null);
      res.json({ message: "Attendance added successfully", id: result.lastInsertRowid });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.put("/:id", (req, res) => {
    const { employeeId, date, status, project } = req.body;
    try {
      db.prepare("UPDATE attendance SET employeeId=?, date=?, status=?, project=? WHERE id=?").run(employeeId, date, status, project||null, req.params.id);
      res.json({ message: "Attendance updated successfully" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/cleanup/orphaned", (req, res) => {
    try {
      db.prepare("DELETE FROM attendance WHERE employeeId NOT IN (SELECT id FROM employees)").run();
      res.json({ message: "Orphaned records cleaned up" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", (req, res) => {
    try {
      const item = db.prepare("SELECT a.*, e.name AS empName FROM attendance a JOIN employees e ON a.employeeId=e.id WHERE a.id=?").get(req.params.id);
      if (item) sendToTrash(db, "attendance", `${item.empName} - ${item.date} - ${item.status}`, item);
      db.prepare("DELETE FROM attendance WHERE id=?").run(req.params.id);
      res.json({ message: "Attendance moved to trash" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
