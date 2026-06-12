const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    const query = `
      SELECT attendance.id, attendance.employeeId,
        employees.name AS employeeName,
        attendance.date, attendance.status
      FROM attendance
      JOIN employees ON attendance.employeeId = employees.id
    `;
    db.all(query, [], (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  });

  router.get("/employee/:id", (req, res) => {
    db.all(
      `SELECT date, status FROM attendance WHERE employeeId = ? ORDER BY date DESC`,
      [req.params.id],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  });

  // Bulk save: array of { employeeId, date, status }
  router.post("/bulk", (req, res) => {
    const { records } = req.body;
    if (!records || !records.length)
      return res.status(400).json({ message: "No records provided" });

    const stmt = db.prepare(
      `INSERT INTO attendance (employeeId, date, status) VALUES (?, ?, ?)
       ON CONFLICT DO NOTHING`
    );

    // Use REPLACE approach: delete existing for that date then insert
    const date = records[0].date;

    // Delete existing records for these employees on this date, then insert fresh
    const employeeIds = records.map((r) => r.employeeId);
    const placeholders = employeeIds.map(() => "?").join(",");

    db.run(
      `DELETE FROM attendance WHERE date=? AND employeeId IN (${placeholders})`,
      [date, ...employeeIds],
      function (err) {
        if (err) return res.status(500).json(err);

        let inserted = 0;
        let hasError = false;

        records.forEach((record) => {
          db.run(
            `INSERT INTO attendance (employeeId, date, status) VALUES (?, ?, ?)`,
            [record.employeeId, record.date, record.status],
            function (err) {
              if (err && !hasError) {
                hasError = true;
                return res.status(500).json(err);
              }
              inserted++;
              if (inserted === records.length && !hasError) {
                res.json({ message: `${inserted} records saved` });
              }
            }
          );
        });
      }
    );
  });

  router.post("/", (req, res) => {
    const { employeeId, date, status } = req.body;
    db.run(
      `INSERT INTO attendance (employeeId, date, status) VALUES (?, ?, ?)`,
      [employeeId, date, status],
      function (err) {
        if (err) return res.status(500).json(err);
        res.json({ message: "Attendance added successfully", id: this.lastID });
      }
    );
  });

  router.put("/:id", (req, res) => {
    const { employeeId, date, status } = req.body;
    db.run(
      `UPDATE attendance SET employeeId=?, date=?, status=? WHERE id=?`,
      [employeeId, date, status, req.params.id],
      function (err) {
        if (err) return res.status(500).json(err);
        res.json({ message: "Attendance updated successfully" });
      }
    );
  });

  router.delete("/:id", (req, res) => {
    db.run("DELETE FROM attendance WHERE id=?", [req.params.id], function (err) {
      if (err) return res.status(500).json(err);
      res.json({ message: "Attendance deleted successfully" });
    });
  });

  return router;
};
