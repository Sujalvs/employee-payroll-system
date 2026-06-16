const express = require("express");

function sendToTrash(db, type, label, data) {
  db.prepare("INSERT INTO trash (type, label, data, deletedAt) VALUES (?,?,?,?)")
    .run(type, label, JSON.stringify(data), new Date().toISOString());
}

module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    try {
      res.json(db.prepare(`SELECT e.id, e.employeeId, emp.name AS employeeName,
        e.hours, e.rate, e.date
        FROM earlyleave e JOIN employees emp ON e.employeeId=emp.id
        ORDER BY e.date DESC`).all());
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/employee/:id", (req, res) => {
    try {
      res.json(db.prepare("SELECT hours, rate, date FROM earlyleave WHERE employeeId=? ORDER BY date DESC").all(req.params.id));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/", (req, res) => {
    const { employeeId, hours, rate, date } = req.body;
    try {
      const result = db.prepare("INSERT INTO earlyleave (employeeId, hours, rate, date) VALUES (?,?,?,?)").run(employeeId, hours, rate, date);
      res.json({ message: "Early leave recorded", id: result.lastInsertRowid });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", (req, res) => {
    try {
      const item = db.prepare(`SELECT e.*, emp.name AS empName FROM earlyleave e
        JOIN employees emp ON e.employeeId=emp.id WHERE e.id=?`).get(req.params.id);
      if (item) sendToTrash(db, "earlyleave", `${item.empName} - ${item.hours}hrs - ${item.date}`, item);
      db.prepare("DELETE FROM earlyleave WHERE id=?").run(req.params.id);
      res.json({ message: "Early leave deleted" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
