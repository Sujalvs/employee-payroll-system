const express = require("express");
module.exports = function (pool) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);

    const query = `
      SELECT e.id, e.name, e.department, e.wage, e.status,
        COALESCE(a."presentDays", 0) AS "presentDays",
        COALESCE(a."presentDays", 0) * e.wage AS "grossSalary",
        COALESCE(ad."totalAdvance", 0) AS "totalAdvance",
        COALESCE(ot."totalOvertime", 0) AS "totalOvertime",
        ((COALESCE(a."presentDays",0)*e.wage)+COALESCE(ot."totalOvertime",0)-COALESCE(ad."totalAdvance",0)) AS "netSalary",
        COALESCE(p."totalPaid", 0) AS "totalPaid",
        CASE WHEN ((COALESCE(a."presentDays",0)*e.wage)+COALESCE(ot."totalOvertime",0)-COALESCE(ad."totalAdvance",0)) > COALESCE(p."totalPaid",0)
          THEN ((COALESCE(a."presentDays",0)*e.wage)+COALESCE(ot."totalOvertime",0)-COALESCE(ad."totalAdvance",0)) - COALESCE(p."totalPaid",0)
          ELSE 0 END AS remaining,
        CASE WHEN COALESCE(p."totalPaid",0) > ((COALESCE(a."presentDays",0)*e.wage)+COALESCE(ot."totalOvertime",0)-COALESCE(ad."totalAdvance",0))
          THEN COALESCE(p."totalPaid",0) - ((COALESCE(a."presentDays",0)*e.wage)+COALESCE(ot."totalOvertime",0)-COALESCE(ad."totalAdvance",0))
          ELSE 0 END AS excess
      FROM employees e
      LEFT JOIN (SELECT "employeeId", COUNT(*) AS "presentDays" FROM attendance WHERE status='Present' AND SUBSTRING(date,1,4)=$1 AND SUBSTRING(date,6,2)=$2 GROUP BY "employeeId") a ON e.id=a."employeeId"
      LEFT JOIN (SELECT "employeeId", SUM(amount) AS "totalAdvance" FROM advances WHERE SUBSTRING(date,1,4)=$1 AND SUBSTRING(date,6,2)=$2 GROUP BY "employeeId") ad ON e.id=ad."employeeId"
      LEFT JOIN (SELECT "employeeId", SUM(hours*rate) AS "totalOvertime" FROM overtime WHERE SUBSTRING(date,1,4)=$1 AND SUBSTRING(date,6,2)=$2 GROUP BY "employeeId") ot ON e.id=ot."employeeId"
      LEFT JOIN (SELECT "employeeId", SUM(amount) AS "totalPaid" FROM payments WHERE SUBSTRING(date,1,4)=$1 AND SUBSTRING(date,6,2)=$2 GROUP BY "employeeId") p ON e.id=p."employeeId"
      WHERE e.status='Active'`;

    try {
      res.json((await pool.query(query, [yyyy, mm])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
