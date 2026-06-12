const express = require("express");
module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    try {
      res.json(db.prepare(`SELECT overtime.id, overtime.employeeId, employees.name AS employeeName,
        overtime.hours, overtime.rate, overtime.date
        FROM overtime JOIN employees ON overtime.employeeId = employees.id`).all());
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/employee/:id", (req, res) => {
    try {
      res.json(db.prepare("SELECT hours, rate, date FROM overtime WHERE employeeId=? ORDER BY date DESC").all(req.params.id));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/", (req, res) => {
    const { employeeId, hours, rate, date } = req.body;
    try {
      const result = db.prepare("INSERT INTO overtime (employeeId, hours, rate, date) VALUES (?,?,?,?)").run(employeeId, hours, rate, date);
      res.json({ message: "Overtime added successfully", id: result.lastInsertRowid });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", (req, res) => {
    try { db.prepare("DELETE FROM overtime WHERE id=?").run(req.params.id); res.json({ message: "Overtime deleted successfully" }); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
