const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {

    const month =
      req.query.month ||
      new Date().getMonth() + 1;

    const year =
      req.query.year ||
      new Date().getFullYear();

    const monthString =
      String(month).padStart(2, "0");

    const yearString = String(year);

    const query = `
      SELECT
        e.id,
        e.name,
        e.department,
        e.wage,
        e.status,

        COALESCE(a.presentDays, 0) AS presentDays,

        COALESCE(a.presentDays, 0) * e.wage AS grossSalary,

        COALESCE(ad.totalAdvance, 0) AS totalAdvance,

        COALESCE(ot.totalOvertime, 0) AS totalOvertime,

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
        SELECT
          employeeId,
          COUNT(*) AS presentDays
        FROM attendance
        WHERE status='Present'
        AND substr(date,1,4)=?
        AND substr(date,6,2)=?
        GROUP BY employeeId
      ) a
      ON e.id = a.employeeId

      LEFT JOIN (
        SELECT
          employeeId,
          SUM(amount) AS totalAdvance
        FROM advances
        WHERE substr(date,1,4)=?
        AND substr(date,6,2)=?
        GROUP BY employeeId
      ) ad
      ON e.id = ad.employeeId

      LEFT JOIN (
        SELECT
          employeeId,
          SUM(hours * rate) AS totalOvertime
        FROM overtime
        WHERE substr(date,1,4)=?
        AND substr(date,6,2)=?
        GROUP BY employeeId
      ) ot
      ON e.id = ot.employeeId

      LEFT JOIN (
        SELECT
          employeeId,
          SUM(amount) AS totalPaid
        FROM payments
        WHERE substr(date,1,4)=?
        AND substr(date,6,2)=?
        GROUP BY employeeId
      ) p
      ON e.id = p.employeeId

      WHERE e.status='Active'
    `;

    db.all(
      query,
      [
        yearString, monthString,
        yearString, monthString,
        yearString, monthString,
        yearString, monthString,
      ],
      (err, rows) => {
        if (err) {
          return res.status(500).json(err);
        }

        res.json(rows);
      }
    );
  });

  return router;
};
