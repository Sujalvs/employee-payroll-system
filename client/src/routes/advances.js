const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  // Get all advances
  router.get("/", (req, res) => {
    const query = `
      SELECT
        advances.id,
        advances.employeeId,
        employees.name AS employeeName,
        advances.amount,
        advances.reason,
        advances.date
      FROM advances
      JOIN employees
      ON advances.employeeId = employees.id
    `;

    db.all(query, [], (err, rows) => {
      if (err) return res.status(500).json(err);

      res.json(rows);
    });
  });

  // Add advance
  router.post("/", (req, res) => {
    const { employeeId, amount, reason, date } = req.body;

    db.run(
      `
      INSERT INTO advances (employeeId, amount, reason, date)
      VALUES (?, ?, ?, ?)
      `,
      [employeeId, amount, reason, date],
      function (err) {
        if (err) return res.status(500).json(err);

        res.json({
          message: "Advance added successfully",
          id: this.lastID,
        });
      }
    );
  });

  // Delete advance
  router.delete("/:id", (req, res) => {
    db.run(
      "DELETE FROM advances WHERE id=?",
      [req.params.id],
      function (err) {
        if (err) return res.status(500).json(err);

        res.json({
          message: "Advance deleted successfully",
        });
      }
    );
  });

  return router;
};