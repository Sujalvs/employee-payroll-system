const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  // Payroll Report
  router.get("/payroll", (req, res) => {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);

    const query = `
      SELECT
        e.id,
        e.name,
        e.department,
        e.wage,
        COALESCE(a.presentDays, 0) AS presentDays,
        COALESCE(a.presentDays, 0) * e.wage AS grossSalary,
        COALESCE(ot.totalOvertime, 0) AS totalOvertime,
        COALESCE(ad.totalAdvance, 0) AS totalAdvance,
        (
          (COALESCE(a.presentDays, 0) * e.wage)
          + COALESCE(ot.totalOvertime, 0)
          - COALESCE(ad.totalAdvance, 0)
        ) AS netSalary,
        COALESCE(p.totalPaid, 0) AS totalPaid,
        CASE
          WHEN (
            (COALESCE(a.presentDays, 0) * e.wage)
            + COALESCE(ot.totalOvertime, 0)
            - COALESCE(ad.totalAdvance, 0)
          ) > COALESCE(p.totalPaid, 0)
          THEN (
            (COALESCE(a.presentDays, 0) * e.wage)
            + COALESCE(ot.totalOvertime, 0)
            - COALESCE(ad.totalAdvance, 0)
          ) - COALESCE(p.totalPaid, 0)
          ELSE 0
        END AS remaining,
        CASE
          WHEN COALESCE(p.totalPaid, 0) > (
            (COALESCE(a.presentDays, 0) * e.wage)
            + COALESCE(ot.totalOvertime, 0)
            - COALESCE(ad.totalAdvance, 0)
          )
          THEN COALESCE(p.totalPaid, 0) - (
            (COALESCE(a.presentDays, 0) * e.wage)
            + COALESCE(ot.totalOvertime, 0)
            - COALESCE(ad.totalAdvance, 0)
          )
          ELSE 0
        END AS excess
      FROM employees e
      LEFT JOIN (
        SELECT employeeId, COUNT(*) AS presentDays
        FROM attendance
        WHERE status='Present' AND substr(date,1,4)=? AND substr(date,6,2)=?
        GROUP BY employeeId
      ) a ON e.id = a.employeeId
      LEFT JOIN (
        SELECT employeeId, SUM(amount) AS totalAdvance
        FROM advances
        WHERE substr(date,1,4)=? AND substr(date,6,2)=?
        GROUP BY employeeId
      ) ad ON e.id = ad.employeeId
      LEFT JOIN (
        SELECT employeeId, SUM(hours * rate) AS totalOvertime
        FROM overtime
        WHERE substr(date,1,4)=? AND substr(date,6,2)=?
        GROUP BY employeeId
      ) ot ON e.id = ot.employeeId
      LEFT JOIN (
        SELECT employeeId, SUM(amount) AS totalPaid
        FROM payments
        WHERE substr(date,1,4)=? AND substr(date,6,2)=?
        GROUP BY employeeId
      ) p ON e.id = p.employeeId
      WHERE e.status='Active'
    `;

    db.all(query, [yyyy, mm, yyyy, mm, yyyy, mm, yyyy, mm], (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  });

  // Attendance Report
  router.get("/attendance", (req, res) => {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);

    const query = `
      SELECT
        a.id,
        e.name AS employeeName,
        e.department,
        a.date,
        a.status
      FROM attendance a
      JOIN employees e ON a.employeeId = e.id
      WHERE substr(a.date,1,4)=? AND substr(a.date,6,2)=?
      ORDER BY a.date DESC, e.name ASC
    `;

    db.all(query, [yyyy, mm], (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  });

  // Advances Report
  router.get("/advances", (req, res) => {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);

    const query = `
      SELECT
        ad.id,
        e.name AS employeeName,
        e.department,
        ad.amount,
        ad.reason,
        ad.date
      FROM advances ad
      JOIN employees e ON ad.employeeId = e.id
      WHERE substr(ad.date,1,4)=? AND substr(ad.date,6,2)=?
      ORDER BY ad.date DESC
    `;

    db.all(query, [yyyy, mm], (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  });

  // Overtime Report
  router.get("/overtime", (req, res) => {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);

    const query = `
      SELECT
        ot.id,
        e.name AS employeeName,
        e.department,
        ot.hours,
        ot.rate,
        (ot.hours * ot.rate) AS amount,
        ot.date
      FROM overtime ot
      JOIN employees e ON ot.employeeId = e.id
      WHERE substr(ot.date,1,4)=? AND substr(ot.date,6,2)=?
      ORDER BY ot.date DESC
    `;

    db.all(query, [yyyy, mm], (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  });

  // Payments Report
  router.get("/payments", (req, res) => {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);

    const query = `
      SELECT
        p.id,
        e.name AS employeeName,
        e.department,
        p.amount,
        p.note,
        p.date
      FROM payments p
      JOIN employees e ON p.employeeId = e.id
      WHERE substr(p.date,1,4)=? AND substr(p.date,6,2)=?
      ORDER BY p.date DESC
    `;

    db.all(query, [yyyy, mm], (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  });

  return router;
};
