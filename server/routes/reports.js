const express = require("express");
module.exports = function (pool) {
  const router = express.Router();

  function getMonthYear(req) {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    return { mm: String(month).padStart(2, "0"), yyyy: String(year) };
  }

  router.get("/payroll", async (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    const query = `
      SELECT e.id, e.name, e.department, e.wage,
        COALESCE(a."presentDays",0) AS "presentDays",
        COALESCE(a."presentDays",0)*e.wage AS "grossSalary",
        COALESCE(ot."totalOvertime",0) AS "totalOvertime",
        COALESCE(ad."totalAdvance",0) AS "totalAdvance",
        ((COALESCE(a."presentDays",0)*e.wage)+COALESCE(ot."totalOvertime",0)-COALESCE(ad."totalAdvance",0)) AS "netSalary",
        COALESCE(p."totalPaid",0) AS "totalPaid",
        CASE WHEN ((COALESCE(a."presentDays",0)*e.wage)+COALESCE(ot."totalOvertime",0)-COALESCE(ad."totalAdvance",0))>COALESCE(p."totalPaid",0)
          THEN ((COALESCE(a."presentDays",0)*e.wage)+COALESCE(ot."totalOvertime",0)-COALESCE(ad."totalAdvance",0))-COALESCE(p."totalPaid",0) ELSE 0 END AS remaining,
        CASE WHEN COALESCE(p."totalPaid",0)>((COALESCE(a."presentDays",0)*e.wage)+COALESCE(ot."totalOvertime",0)-COALESCE(ad."totalAdvance",0))
          THEN COALESCE(p."totalPaid",0)-((COALESCE(a."presentDays",0)*e.wage)+COALESCE(ot."totalOvertime",0)-COALESCE(ad."totalAdvance",0)) ELSE 0 END AS excess
      FROM employees e
      LEFT JOIN (SELECT "employeeId", COUNT(*) AS "presentDays" FROM attendance WHERE status='Present' AND SUBSTRING(date,1,4)=$1 AND SUBSTRING(date,6,2)=$2 GROUP BY "employeeId") a ON e.id=a."employeeId"
      LEFT JOIN (SELECT "employeeId", SUM(amount) AS "totalAdvance" FROM advances WHERE SUBSTRING(date,1,4)=$1 AND SUBSTRING(date,6,2)=$2 GROUP BY "employeeId") ad ON e.id=ad."employeeId"
      LEFT JOIN (SELECT "employeeId", SUM(hours*rate) AS "totalOvertime" FROM overtime WHERE SUBSTRING(date,1,4)=$1 AND SUBSTRING(date,6,2)=$2 GROUP BY "employeeId") ot ON e.id=ot."employeeId"
      LEFT JOIN (SELECT "employeeId", SUM(amount) AS "totalPaid" FROM payments WHERE SUBSTRING(date,1,4)=$1 AND SUBSTRING(date,6,2)=$2 GROUP BY "employeeId") p ON e.id=p."employeeId"
      WHERE e.status='Active'`;
    try { res.json((await pool.query(query, [yyyy, mm])).rows); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/attendance", async (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    try {
      res.json((await pool.query(`SELECT a.id, e.name AS "employeeName", e.department, a.date, a.status
        FROM attendance a JOIN employees e ON a."employeeId"=e.id
        WHERE SUBSTRING(a.date,1,4)=$1 AND SUBSTRING(a.date,6,2)=$2
        ORDER BY a.date DESC, e.name ASC`, [yyyy, mm])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/advances", async (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    try {
      res.json((await pool.query(`SELECT ad.id, e.name AS "employeeName", e.department, ad.amount, ad.reason, ad.date
        FROM advances ad JOIN employees e ON ad."employeeId"=e.id
        WHERE SUBSTRING(ad.date,1,4)=$1 AND SUBSTRING(ad.date,6,2)=$2
        ORDER BY ad.date DESC`, [yyyy, mm])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/overtime", async (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    try {
      res.json((await pool.query(`SELECT ot.id, e.name AS "employeeName", e.department, ot.hours, ot.rate, (ot.hours*ot.rate) AS amount, ot.date
        FROM overtime ot JOIN employees e ON ot."employeeId"=e.id
        WHERE SUBSTRING(ot.date,1,4)=$1 AND SUBSTRING(ot.date,6,2)=$2
        ORDER BY ot.date DESC`, [yyyy, mm])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/payments", async (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    try {
      res.json((await pool.query(`SELECT p.id, e.name AS "employeeName", e.department, p.amount, p.note, p.date, p.category
        FROM payments p JOIN employees e ON p."employeeId"=e.id
        WHERE SUBSTRING(p.date,1,4)=$1 AND SUBSTRING(p.date,6,2)=$2
        ORDER BY p.date DESC`, [yyyy, mm])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
