const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  // Get all overtime records
  router.get("/", (req, res) => {
    const query = `
      SELECT
        overtime.id,
        overtime.employeeId,
        employees.name AS employeeName,
        overtime.hours,
        overtime.rate,
        overtime.date
      FROM overtime
      JOIN employees
      ON overtime.employeeId = employees.id
    `;

    db.all(query, [], (err, rows) => {
      if (err) return res.status(500).json(err);

      res.json(rows);
    });
  });

  // Get overtime for one employee
  router.get("/employee/:id", (req, res) => {
    db.all(
      `
      SELECT hours, rate, date
      FROM overtime
      WHERE employeeId = ?
      ORDER BY date DESC
      `,
      [req.params.id],
      (err, rows) => {
        if (err) return res.status(500).json(err);

        res.json(rows);
      }
    );
  });

  // Add overtime
  router.post("/", (req, res) => {
    const { employeeId, hours, rate, date } = req.body;

    db.run(
      `
      INSERT INTO overtime (employeeId, hours, rate, date)
      VALUES (?, ?, ?, ?)
      `,
      [employeeId, hours, rate, date],
      function (err) {
        if (err) return res.status(500).json(err);

        res.json({
          message: "Overtime added successfully",
          id: this.lastID,
        });
      }
    );
  });

  // Delete overtime
  router.delete("/:id", (req, res) => {
    db.run(
      "DELETE FROM overtime WHERE id=?",
      [req.params.id],
      function (err) {
        if (err) return res.status(500).json(err);

        res.json({
          message: "Overtime deleted successfully",
        });
      }
    );
  });

  return router;
};
