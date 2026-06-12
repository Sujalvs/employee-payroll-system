const express = require("express");
module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    try { res.json(db.prepare("SELECT * FROM employees").all()); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/present-today", (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    try {
      res.json(db.prepare(`SELECT e.id, e.name, e.department, e.phone FROM employees e
        INNER JOIN attendance a ON a.employeeId = e.id
        WHERE a.date=? AND a.status='Present' AND e.status='Active'`).all(today));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/absent-today", (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    try {
      res.json(db.prepare(`SELECT e.id, e.name, e.department, e.phone FROM employees e
        INNER JOIN attendance a ON a.employeeId = e.id
        WHERE a.date=? AND a.status='Absent' AND e.status='Active'`).all(today));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/not-marked-on/:date", (req, res) => {
    try {
      res.json(db.prepare(`SELECT id, name, department, phone FROM employees
        WHERE status='Active' AND id NOT IN (SELECT employeeId FROM attendance WHERE date=?)`).all(req.params.date));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/present-on/:date", (req, res) => {
    try {
      res.json(db.prepare(`SELECT e.id, e.name, e.department, e.phone FROM employees e
        INNER JOIN attendance a ON a.employeeId = e.id
        WHERE a.date=? AND a.status='Present' AND e.status='Active'`).all(req.params.date));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/absent-on/:date", (req, res) => {
    try {
      res.json(db.prepare(`SELECT e.id, e.name, e.department, e.phone FROM employees e
        INNER JOIN attendance a ON a.employeeId = e.id
        WHERE a.date=? AND a.status='Absent' AND e.status='Active'`).all(req.params.date));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/:id", (req, res) => {
    try { res.json(db.prepare("SELECT * FROM employees WHERE id=?").get(req.params.id)); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/", (req, res) => {
    const { name, department, wage, phone, notes } = req.body;
    try {
      // Check if position column exists and handle both old and new schema
      const cols = db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
      let result;
      if (cols.includes("position")) {
        result = db.prepare("INSERT INTO employees (name, position, department, wage, status, phone, notes) VALUES (?,?,?,?,'Active',?,?)").run(name, department, department, wage, phone||null, notes||null);
      } else {
        result = db.prepare("INSERT INTO employees (name, department, wage, status, phone, notes) VALUES (?,?,?,'Active',?,?)").run(name, department, wage, phone||null, notes||null);
      }
      res.json({ message: "Employee added successfully", id: result.lastInsertRowid });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.put("/:id", (req, res) => {
    const { name, department, wage, phone, notes } = req.body;
    try {
      const cols = db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
      if (cols.includes("position")) {
        db.prepare("UPDATE employees SET name=?, position=?, department=?, wage=?, phone=?, notes=? WHERE id=?").run(name, department, department, wage, phone||null, notes||null, req.params.id);
      } else {
        db.prepare("UPDATE employees SET name=?, department=?, wage=?, phone=?, notes=? WHERE id=?").run(name, department, wage, phone||null, notes||null, req.params.id);
      }
      res.json({ message: "Employee updated successfully" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.put("/inactive/:id", (req, res) => {
    try { db.prepare("UPDATE employees SET status='Inactive' WHERE id=?").run(req.params.id); res.json({ message: "Employee marked inactive" }); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.put("/active/:id", (req, res) => {
    try { db.prepare("UPDATE employees SET status='Active' WHERE id=?").run(req.params.id); res.json({ message: "Employee reactivated" }); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", (req, res) => {
    try { db.prepare("DELETE FROM employees WHERE id=?").run(req.params.id); res.json({ message: "Employee deleted successfully" }); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
