const express = require("express");

function sendToTrash(db, type, label, data) {
  db.prepare("INSERT INTO trash (type, label, data, deletedAt) VALUES (?,?,?,?)")
    .run(type, label, JSON.stringify(data), new Date().toISOString());
}

module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    try {
      res.json(db.prepare(`SELECT advances.id, advances.employeeId, employees.name AS employeeName,
        advances.amount, advances.reason, advances.date
        FROM advances JOIN employees ON advances.employeeId = employees.id`).all());
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/employee/:id", (req, res) => {
    try {
      res.json(db.prepare("SELECT amount, reason, date FROM advances WHERE employeeId=? ORDER BY date DESC").all(req.params.id));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/", (req, res) => {
    const { employeeId, amount, reason, date } = req.body;
    try {
      const result = db.prepare("INSERT INTO advances (employeeId, amount, reason, date) VALUES (?,?,?,?)").run(employeeId, amount, reason, date);
      res.json({ message: "Advance added successfully", id: result.lastInsertRowid });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", (req, res) => {
    try {
      const item = db.prepare("SELECT a.*, e.name AS empName FROM advances a JOIN employees e ON a.employeeId=e.id WHERE a.id=?").get(req.params.id);
      if (item) sendToTrash(db, "advance", `${item.empName} - ₹${item.amount} - ${item.date}`, item);
      db.prepare("DELETE FROM advances WHERE id=?").run(req.params.id);
      res.json({ message: "Advance moved to trash" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
