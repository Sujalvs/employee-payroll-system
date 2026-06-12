const express = require("express");
module.exports = function (pool) {
  const router = express.Router();

  router.get("/chart", async (req, res) => {
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    const results = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      try {
        const r = await pool.query(`
          SELECT COALESCE(SUM(
            (SELECT COUNT(*) FROM attendance a WHERE a."employeeId"=e.id AND a.status='Present'
             AND SUBSTRING(a.date,1,4)=$1 AND SUBSTRING(a.date,6,2)=$2) * e.wage
          ),0) AS payroll FROM employees e WHERE e.status='Active'`, [yyyy, mm]);
        results.push({ month: monthNames[d.getMonth()], payroll: Number(r.rows[0].payroll) || 0 });
      } catch(e) { results.push({ month: monthNames[d.getMonth()], payroll: 0 }); }
    }
    res.json(results);
  });

  router.get("/", async (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const yyyy = today.substring(0, 4);
    const mm = today.substring(5, 7);
    try {
      const [emp, present, absent, payroll, adv, ot, pmt, notMarked] = await Promise.all([
        pool.query("SELECT COUNT(*) AS c FROM employees WHERE status='Active'"),
        pool.query("SELECT COUNT(*) AS c FROM attendance WHERE date=$1 AND status='Present'", [today]),
        pool.query("SELECT COUNT(*) AS c FROM attendance WHERE date=$1 AND status='Absent'", [today]),
        pool.query("SELECT COALESCE(SUM(wage),0) AS c FROM employees WHERE status='Active'"),
        pool.query("SELECT COALESCE(SUM(amount),0) AS c FROM advances WHERE SUBSTRING(date,1,4)=$1 AND SUBSTRING(date,6,2)=$2", [yyyy, mm]),
        pool.query("SELECT COALESCE(SUM(hours*rate),0) AS c FROM overtime WHERE SUBSTRING(date,1,4)=$1 AND SUBSTRING(date,6,2)=$2", [yyyy, mm]),
        pool.query("SELECT COALESCE(SUM(amount),0) AS c FROM payments WHERE SUBSTRING(date,1,4)=$1 AND SUBSTRING(date,6,2)=$2", [yyyy, mm]),
        pool.query(`SELECT COUNT(*) AS c FROM employees WHERE status='Active' AND id NOT IN (SELECT "employeeId" FROM attendance WHERE date=$1)`, [today]),
      ]);
      res.json({
        totalEmployees: Number(emp.rows[0].c),
        presentToday: Number(present.rows[0].c),
        absentToday: Number(absent.rows[0].c),
        notMarkedToday: Number(notMarked.rows[0].c),
        totalPayroll: Number(payroll.rows[0].c),
        totalAdvances: Number(adv.rows[0].c),
        totalOvertime: Number(ot.rows[0].c),
        totalPayments: Number(pmt.rows[0].c),
      });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
