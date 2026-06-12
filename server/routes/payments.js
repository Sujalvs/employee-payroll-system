const express = require("express");

function sendToTrash(db, type, label, data) {
  db.prepare("INSERT INTO trash (type, label, data, deletedAt) VALUES (?,?,?,?)")
    .run(type, label, JSON.stringify(data), new Date().toISOString());
}

module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    try {
      res.json(db.prepare(`SELECT payments.id, payments.employeeId, employees.name AS employeeName,
        payments.amount, payments.note, payments.date, payments.category
        FROM payments JOIN employees ON payments.employeeId = employees.id
        ORDER BY payments.date DESC`).all());
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/employee/:id", (req, res) => {
    try {
      res.json(db.prepare("SELECT amount, note, date, category FROM payments WHERE employeeId=? ORDER BY date DESC").all(req.params.id));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/", (req, res) => {
    const { employeeId, amount, note, date, category } = req.body;
    try {
      const result = db.prepare("INSERT INTO payments (employeeId, amount, note, date, category) VALUES (?,?,?,?,?)").run(employeeId, amount, note||null, date, category||null);
      res.json({ message: "Payment added successfully", id: result.lastInsertRowid });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", (req, res) => {
    try {
      const item = db.prepare("SELECT p.*, e.name AS empName FROM payments p JOIN employees e ON p.employeeId=e.id WHERE p.id=?").get(req.params.id);
      if (item) sendToTrash(db, "payment", `${item.empName} - ₹${item.amount} - ${item.date}`, item);
      db.prepare("DELETE FROM payments WHERE id=?").run(req.params.id);
      res.json({ message: "Payment moved to trash" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
