const express = require("express");
module.exports = function (db) {
  const router = express.Router();

  router.get("/chart", (req, res) => {
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    const results = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      try {
        const row = db.prepare(`SELECT SUM(
          (SELECT COUNT(*) FROM attendance a WHERE a.employeeId = e.id AND a.status='Present'
           AND substr(a.date,1,4)=? AND substr(a.date,6,2)=?) * e.wage
        ) AS payroll FROM employees e WHERE e.status='Active'`).get(yyyy, mm);
        results.push({ month: monthNames[d.getMonth()], payroll: row?.payroll || 0 });
      } catch(e) { results.push({ month: monthNames[d.getMonth()], payroll: 0 }); }
    }
    res.json(results);
  });

  router.get("/", (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const yyyy = today.substring(0, 4);
    const mm = today.substring(5, 7);
    try {
      const totalEmployees = db.prepare("SELECT COUNT(*) AS c FROM employees WHERE status='Active'").get().c;
      const presentToday = db.prepare("SELECT COUNT(*) AS c FROM attendance WHERE date=? AND status='Present'").get(today).c;
      const absentToday = db.prepare("SELECT COUNT(*) AS c FROM attendance WHERE date=? AND status='Absent'").get(today).c;
      const totalPayroll = db.prepare("SELECT COALESCE(SUM(wage),0) AS c FROM employees WHERE status='Active'").get().c;
      const totalAdvances = db.prepare("SELECT COALESCE(SUM(amount),0) AS c FROM advances WHERE substr(date,1,4)=? AND substr(date,6,2)=?").get(yyyy, mm).c;
      const totalOvertime = db.prepare("SELECT COALESCE(SUM(hours*rate),0) AS c FROM overtime WHERE substr(date,1,4)=? AND substr(date,6,2)=?").get(yyyy, mm).c;
      const totalPayments = db.prepare("SELECT COALESCE(SUM(amount),0) AS c FROM payments WHERE substr(date,1,4)=? AND substr(date,6,2)=?").get(yyyy, mm).c;
      const notMarkedToday = db.prepare("SELECT COUNT(*) AS c FROM employees WHERE status='Active' AND id NOT IN (SELECT employeeId FROM attendance WHERE date=?)").get(today).c;
      res.json({ totalEmployees, presentToday, absentToday, notMarkedToday, totalPayroll, totalAdvances, totalOvertime, totalPayments });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
