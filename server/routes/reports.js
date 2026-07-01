const express = require("express");
module.exports = function (db) {
  const router = express.Router();

  function getMonthYear(req) {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    return { mm: String(month).padStart(2, "0"), yyyy: String(year) };
  }

  function getPayrollData(db, yyyy, mm, project) {
    const cutoffDate = yyyy + "-" + mm + "-31";
    const employees = db.prepare("SELECT * FROM employees WHERE status='Active'").all();

    const results = employees.map(emp => {
      const id = emp.id;

      const att = db.prepare("SELECT SUM(CASE WHEN status='Present' THEN 1 WHEN status='Half Day' THEN 0.5 ELSE 0 END) AS days FROM attendance WHERE employeeId=? AND (status='Present' OR status='Half Day') AND substr(date,1,4)=? AND substr(date,6,2)=?").get(id, yyyy, mm);
      const adv = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM advances WHERE employeeId=? AND substr(date,1,4)=? AND substr(date,6,2)=?").get(id, yyyy, mm);
      const ot = db.prepare("SELECT COALESCE(SUM(hours*rate),0) AS total FROM overtime WHERE employeeId=? AND substr(date,1,4)=? AND substr(date,6,2)=?").get(id, yyyy, mm);
      const el = db.prepare("SELECT COALESCE(SUM(hours*rate),0) AS total FROM earlyleave WHERE employeeId=? AND substr(date,1,4)=? AND substr(date,6,2)=?").get(id, yyyy, mm);
      const paid = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE employeeId=? AND substr(date,1,4)=? AND substr(date,6,2)=?").get(id, yyyy, mm);

      const allAtt = db.prepare("SELECT SUM(CASE WHEN status='Present' THEN 1 WHEN status='Half Day' THEN 0.5 ELSE 0 END) AS days FROM attendance WHERE employeeId=? AND (status='Present' OR status='Half Day') AND date<=?").get(id, cutoffDate);
      const allAdv = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM advances WHERE employeeId=? AND date<=?").get(id, cutoffDate);
      const allOt = db.prepare("SELECT COALESCE(SUM(hours*rate),0) AS total FROM overtime WHERE employeeId=? AND date<=?").get(id, cutoffDate);
      const allEl = db.prepare("SELECT COALESCE(SUM(hours*rate),0) AS total FROM earlyleave WHERE employeeId=? AND date<=?").get(id, cutoffDate);
      const allPaid = db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE employeeId=? AND date<=?").get(id, cutoffDate);

      const presentDays = att?.days || 0;
      const grossSalary = presentDays * emp.wage;
      const totalAdvance = adv?.total || 0;
      const totalOvertime = ot?.total || 0;
      const totalEarlyLeave = el?.total || 0;
      const totalPaid = paid?.total || 0;

      const allGross = (allAtt?.days || 0) * emp.wage;
      const allNet = allGross + (allOt?.total || 0) - (allAdv?.total || 0) - (allEl?.total || 0) - (allPaid?.total || 0);
      const carryForward = allNet - (grossSalary + totalOvertime - totalAdvance - totalEarlyLeave - totalPaid);

      const netSalary = grossSalary + totalOvertime - totalAdvance - totalEarlyLeave + carryForward - totalPaid;
      const remaining = netSalary > 0 ? netSalary : 0;
      const excess = netSalary < 0 ? Math.abs(netSalary) : 0;

      return {
        id: emp.id, name: emp.name, department: emp.department, wage: emp.wage,
        presentDays, grossSalary: Math.round(grossSalary),
        totalAdvance: Math.round(totalAdvance), totalOvertime: Math.round(totalOvertime),
        totalEarlyLeave: Math.round(totalEarlyLeave), totalPaid: Math.round(totalPaid),
        carryForward: Math.round(carryForward), netSalary: Math.round(netSalary),
        remaining: Math.round(remaining), excess: Math.round(excess),
      };
    });

    if (project) {
      const projectEmps = db.prepare(
        "SELECT DISTINCT employeeId FROM attendance WHERE (project=? OR (project IS NULL AND ?='Main Office')) AND substr(date,1,4)=? AND substr(date,6,2)=?"
      ).all(project, project, yyyy, mm).map(r => r.employeeId);
      return results.filter(r => projectEmps.includes(r.id));
    }
    return results;
  }

  router.get("/payroll", (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    const project = req.query.project || null;
    try { res.json(getPayrollData(db, yyyy, mm, project)); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/attendance", (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    try {
      res.json(db.prepare(
        "SELECT a.id, e.name AS employeeName, e.department, a.date, a.status, a.project" +
        " FROM attendance a JOIN employees e ON a.employeeId=e.id" +
        " WHERE substr(a.date,1,4)=? AND substr(a.date,6,2)=? ORDER BY a.date DESC"
      ).all(yyyy, mm));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/advances", (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    try {
      res.json(db.prepare(
        "SELECT ad.id, e.name AS employeeName, e.department, ad.amount, ad.reason, ad.date" +
        " FROM advances ad JOIN employees e ON ad.employeeId=e.id" +
        " WHERE substr(ad.date,1,4)=? AND substr(ad.date,6,2)=? ORDER BY ad.date DESC"
      ).all(yyyy, mm));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/overtime", (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    try {
      res.json(db.prepare(
        "SELECT ot.id, e.name AS employeeName, e.department, ot.hours, ot.rate, (ot.hours*ot.rate) AS amount, ot.date" +
        " FROM overtime ot JOIN employees e ON ot.employeeId=e.id" +
        " WHERE substr(ot.date,1,4)=? AND substr(ot.date,6,2)=? ORDER BY ot.date DESC"
      ).all(yyyy, mm));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/payments", (req, res) => {
    const { mm, yyyy } = getMonthYear(req);
    try {
      res.json(db.prepare(
        "SELECT p.id, e.name AS employeeName, e.department, p.amount, p.note, p.date, p.category" +
        " FROM payments p JOIN employees e ON p.employeeId=e.id" +
        " WHERE substr(p.date,1,4)=? AND substr(p.date,6,2)=? ORDER BY p.date DESC"
      ).all(yyyy, mm));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
