const express = require("express");
module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);
    const project = req.query.project || null;

    try {
      // Get all active employees
      const employees = db.prepare("SELECT * FROM employees WHERE status='Active'").all();
      const cutoffDate = yyyy + "-" + mm + "-31"; // everything up to end of selected month

      const results = employees.map(emp => {
        const id = emp.id;

        // Current month stats
        const att = db.prepare(
          "SELECT SUM(CASE WHEN status='Present' THEN 1 WHEN status='Half Day' THEN 0.5 ELSE 0 END) AS days" +
          " FROM attendance WHERE employeeId=? AND (status='Present' OR status='Half Day') AND substr(date,1,4)=? AND substr(date,6,2)=?"
        ).get(id, yyyy, mm);

        const adv = db.prepare(
          "SELECT COALESCE(SUM(amount),0) AS total FROM advances WHERE employeeId=? AND substr(date,1,4)=? AND substr(date,6,2)=?"
        ).get(id, yyyy, mm);

        const ot = db.prepare(
          "SELECT COALESCE(SUM(hours*rate),0) AS total FROM overtime WHERE employeeId=? AND substr(date,1,4)=? AND substr(date,6,2)=?"
        ).get(id, yyyy, mm);

        const el = db.prepare(
          "SELECT COALESCE(SUM(hours*rate),0) AS total FROM earlyleave WHERE employeeId=? AND substr(date,1,4)=? AND substr(date,6,2)=?"
        ).get(id, yyyy, mm);

        const paid = db.prepare(
          "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE employeeId=? AND substr(date,1,4)=? AND substr(date,6,2)=?"
        ).get(id, yyyy, mm);

        // ALL TIME totals (from beginning up to end of selected month)
        const allAtt = db.prepare(
          "SELECT SUM(CASE WHEN status='Present' THEN 1 WHEN status='Half Day' THEN 0.5 ELSE 0 END) AS days" +
          " FROM attendance WHERE employeeId=? AND (status='Present' OR status='Half Day') AND date<=?"
        ).get(id, cutoffDate);

        const allAdv = db.prepare(
          "SELECT COALESCE(SUM(amount),0) AS total FROM advances WHERE employeeId=? AND date<=?"
        ).get(id, cutoffDate);

        const allOt = db.prepare(
          "SELECT COALESCE(SUM(hours*rate),0) AS total FROM overtime WHERE employeeId=? AND date<=?"
        ).get(id, cutoffDate);

        const allEl = db.prepare(
          "SELECT COALESCE(SUM(hours*rate),0) AS total FROM earlyleave WHERE employeeId=? AND date<=?"
        ).get(id, cutoffDate);

        const allPaid = db.prepare(
          "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE employeeId=? AND date<=?"
        ).get(id, cutoffDate);

        const presentDays = att?.days || 0;
        const grossSalary = presentDays * emp.wage;
        const totalAdvance = adv?.total || 0;
        const totalOvertime = ot?.total || 0;
        const totalEarlyLeave = el?.total || 0;
        const totalPaid = paid?.total || 0;

        // All time balance (carry forward included automatically)
        const allGross = (allAtt?.days || 0) * emp.wage;
        const allNet = allGross + (allOt?.total || 0) - (allAdv?.total || 0) - (allEl?.total || 0) - (allPaid?.total || 0);
        const carryForward = allNet - (grossSalary + totalOvertime - totalAdvance - totalEarlyLeave - totalPaid);

        const netSalary = grossSalary + totalOvertime - totalAdvance - totalEarlyLeave + carryForward - totalPaid;
        const remaining = netSalary > 0 ? netSalary : 0;
        const excess = netSalary < 0 ? Math.abs(netSalary) : 0;

        return {
          id: emp.id,
          name: emp.name,
          department: emp.department,
          wage: emp.wage,
          status: emp.status,
          presentDays,
          grossSalary: Math.round(grossSalary),
          totalAdvance: Math.round(totalAdvance),
          totalOvertime: Math.round(totalOvertime),
          totalEarlyLeave: Math.round(totalEarlyLeave),
          totalPaid: Math.round(totalPaid),
          carryForward: Math.round(carryForward),
          netSalary: Math.round(netSalary),
          remaining: Math.round(remaining),
          excess: Math.round(excess),
        };
      });

      // Filter by project if needed
      if (project) {
        const projectEmployees = db.prepare(
          "SELECT DISTINCT employeeId FROM attendance WHERE (project=? OR (project IS NULL AND ?='Main Office')) AND substr(date,1,4)=? AND substr(date,6,2)=?"
        ).all(project, project, yyyy, mm).map(r => r.employeeId);
        res.json(results.filter(r => projectEmployees.includes(r.id)));
      } else {
        res.json(results);
      }

    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
