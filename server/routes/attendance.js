const express = require("express");
module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    try {
      res.json(db.prepare(`SELECT attendance.id, attendance.employeeId,
        employees.name AS employeeName, attendance.date, attendance.status
        FROM attendance JOIN employees ON attendance.employeeId = employees.id`).all());
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/employee/:id", (req, res) => {
    try {
      res.json(db.prepare("SELECT date, status FROM attendance WHERE employeeId=? ORDER BY date DESC").all(req.params.id));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  // Bulk save
  router.post("/bulk", (req, res) => {
    const { records } = req.body;
    if (!records || !records.length) return res.status(400).json({ message: "No records provided" });
    try {
      const date = records[0].date;
      const employeeIds = records.map(r => r.employeeId);
      const placeholders = employeeIds.map(() => "?").join(",");
      db.prepare(`DELETE FROM attendance WHERE date=? AND employeeId IN (${placeholders})`).run(date, ...employeeIds);
      const insert = db.prepare("INSERT INTO attendance (employeeId, date, status) VALUES (?,?,?)");
      const insertMany = db.transaction((recs) => { recs.forEach(r => insert.run(r.employeeId, r.date, r.status)); });
      insertMany(records);
      res.json({ message: `${records.length} records saved` });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/", (req, res) => {
    const { employeeId, date, status } = req.body;
    try {
      const result = db.prepare("INSERT INTO attendance (employeeId, date, status) VALUES (?,?,?)").run(employeeId, date, status);
      res.json({ message: "Attendance added successfully", id: result.lastInsertRowid });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.put("/:id", (req, res) => {
    const { employeeId, date, status } = req.body;
    try {
      db.prepare("UPDATE attendance SET employeeId=?, date=?, status=? WHERE id=?").run(employeeId, date, status, req.params.id);
      res.json({ message: "Attendance updated successfully" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", (req, res) => {
    try { db.prepare("DELETE FROM attendance WHERE id=?").run(req.params.id); res.json({ message: "Attendance deleted successfully" }); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
