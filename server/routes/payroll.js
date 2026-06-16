const express = require("express");
module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);
    const project = req.query.project || null;

    const query =
      "SELECT e.id, e.name, e.department, e.wage, e.status," +
      " COALESCE(a.presentDays, 0) AS presentDays," +
      " COALESCE(a.presentDays, 0) * e.wage AS grossSalary," +
      " COALESCE(ad.totalAdvance, 0) AS totalAdvance," +
      " COALESCE(ot.totalOvertime, 0) AS totalOvertime," +
      " COALESCE(el.totalEarlyLeave, 0) AS totalEarlyLeave," +
      " ((COALESCE(a.presentDays,0)*e.wage)+COALESCE(ot.totalOvertime,0)-COALESCE(ad.totalAdvance,0)-COALESCE(el.totalEarlyLeave,0)) AS netSalary," +
      " COALESCE(p.totalPaid, 0) AS totalPaid," +
      " CASE WHEN ((COALESCE(a.presentDays,0)*e.wage)+COALESCE(ot.totalOvertime,0)-COALESCE(ad.totalAdvance,0)-COALESCE(el.totalEarlyLeave,0)) > COALESCE(p.totalPaid,0)" +
      "   THEN ((COALESCE(a.presentDays,0)*e.wage)+COALESCE(ot.totalOvertime,0)-COALESCE(ad.totalAdvance,0)-COALESCE(el.totalEarlyLeave,0)) - COALESCE(p.totalPaid,0)" +
      "   ELSE 0 END AS remaining," +
      " CASE WHEN COALESCE(p.totalPaid,0) > ((COALESCE(a.presentDays,0)*e.wage)+COALESCE(ot.totalOvertime,0)-COALESCE(ad.totalAdvance,0)-COALESCE(el.totalEarlyLeave,0))" +
      "   THEN COALESCE(p.totalPaid,0) - ((COALESCE(a.presentDays,0)*e.wage)+COALESCE(ot.totalOvertime,0)-COALESCE(ad.totalAdvance,0)-COALESCE(el.totalEarlyLeave,0))" +
      "   ELSE 0 END AS excess" +
      " FROM employees e" +
      " LEFT JOIN (SELECT employeeId, SUM(CASE WHEN status='Present' THEN 1 WHEN status='Half Day' THEN 0.5 ELSE 0 END) AS presentDays FROM attendance WHERE (status='Present' OR status='Half Day') AND substr(date,1,4)=? AND substr(date,6,2)=? GROUP BY employeeId) a ON e.id=a.employeeId" +
      " LEFT JOIN (SELECT employeeId, SUM(amount) AS totalAdvance FROM advances WHERE substr(date,1,4)=? AND substr(date,6,2)=? GROUP BY employeeId) ad ON e.id=ad.employeeId" +
      " LEFT JOIN (SELECT employeeId, SUM(hours*rate) AS totalOvertime FROM overtime WHERE substr(date,1,4)=? AND substr(date,6,2)=? GROUP BY employeeId) ot ON e.id=ot.employeeId" +
      " LEFT JOIN (SELECT employeeId, SUM(amount) AS totalPaid FROM payments WHERE substr(date,1,4)=? AND substr(date,6,2)=? GROUP BY employeeId) p ON e.id=p.employeeId" +
      " LEFT JOIN (SELECT employeeId, SUM(hours*rate) AS totalEarlyLeave FROM earlyleave WHERE substr(date,1,4)=? AND substr(date,6,2)=? GROUP BY employeeId) el ON e.id=el.employeeId" +
      " WHERE e.status='Active'";

    const projectQuery = query +
      " AND e.id IN (SELECT DISTINCT employeeId FROM attendance WHERE (project=? OR (project IS NULL AND ?='Main Office')) AND substr(date,1,4)=? AND substr(date,6,2)=?)";

    const finalQuery = project ? projectQuery : query;
    const params = project
      ? [yyyy, mm, yyyy, mm, yyyy, mm, yyyy, mm, yyyy, mm, project, project, yyyy, mm]
      : [yyyy, mm, yyyy, mm, yyyy, mm, yyyy, mm, yyyy, mm];

    try { res.json(db.prepare(finalQuery).all(...params)); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
