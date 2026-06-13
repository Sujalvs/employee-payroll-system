const express = require("express");
module.exports = function (db) {
  const router = express.Router();

  function getMonthYear(req) {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    return { mm: String(month).padStart(2, "0"), yyyy: String(year) };
  }

  router.get("/payroll", (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    const query = `SELECT e.id, e.name, e.department, e.wage,
      COALESCE(a.presentDays,0) AS presentDays, COALESCE(a.presentDays,0)*e.wage AS grossSalary,
      COALESCE(ot.totalOvertime,0) AS totalOvertime, COALESCE(ad.totalAdvance,0) AS totalAdvance,
      ((COALESCE(a.presentDays,0)*e.wage)+COALESCE(ot.totalOvertime,0)-COALESCE(ad.totalAdvance,0)) AS netSalary,
      COALESCE(p.totalPaid,0) AS totalPaid,
      CASE WHEN ((COALESCE(a.presentDays,0)*e.wage)+COALESCE(ot.totalOvertime,0)-COALESCE(ad.totalAdvance,0))>COALESCE(p.totalPaid,0)
        THEN ((COALESCE(a.presentDays,0)*e.wage)+COALESCE(ot.totalOvertime,0)-COALESCE(ad.totalAdvance,0))-COALESCE(p.totalPaid,0) ELSE 0 END AS remaining,
      CASE WHEN COALESCE(p.totalPaid,0)>((COALESCE(a.presentDays,0)*e.wage)+COALESCE(ot.totalOvertime,0)-COALESCE(ad.totalAdvance,0))
        THEN COALESCE(p.totalPaid,0)-((COALESCE(a.presentDays,0)*e.wage)+COALESCE(ot.totalOvertime,0)-COALESCE(ad.totalAdvance,0)) ELSE 0 END AS excess
      FROM employees e
      LEFT JOIN (SELECT employeeId, COUNT(*) AS presentDays FROM attendance WHERE status='Present' AND substr(date,1,4)=? AND substr(date,6,2)=? GROUP BY employeeId) a ON e.id=a.employeeId
      LEFT JOIN (SELECT employeeId, SUM(amount) AS totalAdvance FROM advances WHERE substr(date,1,4)=? AND substr(date,6,2)=? GROUP BY employeeId) ad ON e.id=ad.employeeId
      LEFT JOIN (SELECT employeeId, SUM(hours*rate) AS totalOvertime FROM overtime WHERE substr(date,1,4)=? AND substr(date,6,2)=? GROUP BY employeeId) ot ON e.id=ot.employeeId
      LEFT JOIN (SELECT employeeId, SUM(amount) AS totalPaid FROM payments WHERE substr(date,1,4)=? AND substr(date,6,2)=? GROUP BY employeeId) p ON e.id=p.employeeId
      WHERE e.status='Active'`;
    try { res.json(db.prepare(query).all(yyyy, mm, yyyy, mm, yyyy, mm, yyyy, mm)); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/attendance", (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    try {
      res.json(db.prepare(`SELECT a.id, e.name AS employeeName, e.department, a.date, a.status
        FROM attendance a JOIN employees e ON a.employeeId=e.id
        WHERE substr(a.date,1,4)=? AND substr(a.date,6,2)=? ORDER BY a.date DESC`).all(yyyy, mm));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/advances", (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    try {
      res.json(db.prepare(`SELECT ad.id, e.name AS employeeName, e.department, ad.amount, ad.reason, ad.date
        FROM advances ad JOIN employees e ON ad.employeeId=e.id
        WHERE substr(ad.date,1,4)=? AND substr(ad.date,6,2)=? ORDER BY ad.date DESC`).all(yyyy, mm));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/overtime", (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    try {
      res.json(db.prepare(`SELECT ot.id, e.name AS employeeName, e.department, ot.hours, ot.rate, (ot.hours*ot.rate) AS amount, ot.date
        FROM overtime ot JOIN employees e ON ot.employeeId=e.id
        WHERE substr(ot.date,1,4)=? AND substr(ot.date,6,2)=? ORDER BY ot.date DESC`).all(yyyy, mm));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/payments", (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    try {
      res.json(db.prepare(`SELECT p.id, e.name AS employeeName, e.department, p.amount, p.note, p.date, p.category
        FROM payments p JOIN employees e ON p.employeeId=e.id
        WHERE substr(p.date,1,4)=? AND substr(p.date,6,2)=? ORDER BY p.date DESC`).all(yyyy, mm));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
