const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    db.all(
      `SELECT payments.id, payments.employeeId, employees.name AS employeeName,
        payments.amount, payments.note, payments.date, payments.category
       FROM payments JOIN employees ON payments.employeeId = employees.id
       ORDER BY payments.date DESC`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  });

  router.get("/employee/:id", (req, res) => {
    db.all(
      `SELECT amount, note, date, category FROM payments WHERE employeeId = ? ORDER BY date DESC`,
      [req.params.id],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  });

  router.post("/", (req, res) => {
    const { employeeId, amount, note, date, category } = req.body;
    db.run(
      `INSERT INTO payments (employeeId, amount, note, date, category) VALUES (?, ?, ?, ?, ?)`,
      [employeeId, amount, note, date, category || null],
      function (err) {
        if (err) return res.status(500).json(err);
        res.json({ message: "Payment added successfully", id: this.lastID });
      }
    );
  });

  router.delete("/:id", (req, res) => {
    db.run("DELETE FROM payments WHERE id=?", [req.params.id], function (err) {
      if (err) return res.status(500).json(err);
      res.json({ message: "Payment deleted successfully" });
    });
  });

  return router;
};
