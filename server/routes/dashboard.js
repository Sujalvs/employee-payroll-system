const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  // Chart - real monthly payroll from DB (last 6 months)
  router.get("/chart", (req, res) => {
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const results = [];
    let completed = 0;
    const total = 6;
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const label = monthNames[d.getMonth()];
      const index = 5 - i;

      db.get(
        `SELECT SUM(
          (SELECT COUNT(*) FROM attendance a
           WHERE a.employeeId = e.id AND a.status = 'Present'
           AND substr(a.date,1,4) = ? AND substr(a.date,6,2) = ?) * e.wage
         ) AS payroll FROM employees e WHERE e.status = 'Active'`,
        [yyyy, mm],
        (err, row) => {
          results[index] = { month: label, payroll: row && row.payroll ? row.payroll : 0 };
          completed++;
          if (completed === total) res.json(results);
        }
      );
    }
  });

  // Dashboard summary
  router.get("/", (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const yyyy = today.substring(0, 4);
    const mm = today.substring(5, 7);

    db.get("SELECT COUNT(*) AS totalEmployees FROM employees WHERE status='Active'", [], (err, empRow) => {
      if (err) return res.status(500).json(err);

      db.get("SELECT COUNT(*) AS presentToday FROM attendance WHERE date=? AND status='Present'", [today], (err, presentRow) => {
        if (err) return res.status(500).json(err);

        db.get("SELECT COUNT(*) AS absentToday FROM attendance WHERE date=? AND status='Absent'", [today], (err, absentRow) => {
          if (err) return res.status(500).json(err);

          db.get("SELECT SUM(wage) AS totalPayroll FROM employees WHERE status='Active'", [], (err, payrollRow) => {
            if (err) return res.status(500).json(err);

            db.get("SELECT COALESCE(SUM(amount),0) AS totalAdvances FROM advances WHERE substr(date,1,4)=? AND substr(date,6,2)=?", [yyyy, mm], (err, advRow) => {
              if (err) return res.status(500).json(err);

              db.get("SELECT COALESCE(SUM(hours*rate),0) AS totalOvertime FROM overtime WHERE substr(date,1,4)=? AND substr(date,6,2)=?", [yyyy, mm], (err, otRow) => {
                if (err) return res.status(500).json(err);

                db.get("SELECT COALESCE(SUM(amount),0) AS totalPayments FROM payments WHERE substr(date,1,4)=? AND substr(date,6,2)=?", [yyyy, mm], (err, pmtRow) => {
                  if (err) return res.status(500).json(err);

                  // Count active employees who have NO attendance entry for today
                  db.get(
                    `SELECT COUNT(*) AS notMarkedToday
                     FROM employees
                     WHERE status = 'Active'
                     AND id NOT IN (
                       SELECT employeeId FROM attendance WHERE date = ?
                     )`,
                    [today],
                    (err, notMarkedRow) => {
                      if (err) return res.status(500).json(err);

                      res.json({
                        totalEmployees: empRow.totalEmployees || 0,
                        presentToday: presentRow.presentToday || 0,
                        absentToday: absentRow.absentToday || 0,
                        notMarkedToday: notMarkedRow.notMarkedToday || 0,
                        totalPayroll: payrollRow.totalPayroll || 0,
                        totalAdvances: advRow.totalAdvances || 0,
                        totalOvertime: otRow.totalOvertime || 0,
                        totalPayments: pmtRow.totalPayments || 0,
                      });
                    }
                  );
                });
              });
            });
          });
        });
      });
    });
  });

  return router;
};
