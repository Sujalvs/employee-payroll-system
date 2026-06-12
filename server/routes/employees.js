const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    db.all("SELECT * FROM employees", [], (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  });

  router.get("/present-today", (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    db.all(
      `SELECT e.id, e.name, e.department, e.phone FROM employees e
       INNER JOIN attendance a ON a.employeeId = e.id
       WHERE a.date = ? AND a.status = 'Present' AND e.status = 'Active'`,
      [today], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  });

  router.get("/absent-today", (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    db.all(
      `SELECT e.id, e.name, e.department, e.phone FROM employees e
       INNER JOIN attendance a ON a.employeeId = e.id
       WHERE a.date = ? AND a.status = 'Absent' AND e.status = 'Active'`,
      [today], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  });

  // Active employees NOT marked on a specific date
  router.get("/not-marked-on/:date", (req, res) => {
    db.all(
      `SELECT id, name, department, phone FROM employees
       WHERE status = 'Active'
       AND id NOT IN (
         SELECT employeeId FROM attendance WHERE date = ?
       )`,
      [req.params.date],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  });

  // Present on a specific date
  router.get("/present-on/:date", (req, res) => {
    db.all(
      `SELECT e.id, e.name, e.department, e.phone FROM employees e
       INNER JOIN attendance a ON a.employeeId = e.id
       WHERE a.date = ? AND a.status = 'Present' AND e.status = 'Active'`,
      [req.params.date], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  });

  // Absent on a specific date
  router.get("/absent-on/:date", (req, res) => {
    db.all(
      `SELECT e.id, e.name, e.department, e.phone FROM employees e
       INNER JOIN attendance a ON a.employeeId = e.id
       WHERE a.date = ? AND a.status = 'Absent' AND e.status = 'Active'`,
      [req.params.date], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  });

  router.get("/:id", (req, res) => {
    db.get("SELECT * FROM employees WHERE id = ?", [req.params.id], (err, row) => {
      if (err) return res.status(500).json(err);
      res.json(row);
    });
  });

  router.post("/", (req, res) => {
    const { name, department, wage, phone, notes } = req.body;
    db.run(
      `INSERT INTO employees (name, department, wage, status, phone, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, department, wage, "Active", phone || null, notes || null],
      function (err) {
        if (err) return res.status(500).json(err);
        res.json({ message: "Employee added successfully", id: this.lastID });
      }
    );
  });

  router.put("/:id", (req, res) => {
    const { name, department, wage, phone, notes } = req.body;
    db.run(
      `UPDATE employees SET name=?, department=?, wage=?, phone=?, notes=? WHERE id=?`,
      [name, department, wage, phone || null, notes || null, req.params.id],
      function (err) {
        if (err) return res.status(500).json(err);
        res.json({ message: "Employee updated successfully" });
      }
    );
  });

  router.put("/inactive/:id", (req, res) => {
    db.run(`UPDATE employees SET status='Inactive' WHERE id=?`, [req.params.id], function (err) {
      if (err) return res.status(500).json(err);
      res.json({ message: "Employee marked inactive" });
    });
  });

  router.put("/active/:id", (req, res) => {
    db.run(`UPDATE employees SET status='Active' WHERE id=?`, [req.params.id], function (err) {
      if (err) return res.status(500).json(err);
      res.json({ message: "Employee reactivated" });
    });
  });

  router.delete("/:id", (req, res) => {
    db.run("DELETE FROM employees WHERE id=?", [req.params.id], function (err) {
      if (err) return res.status(500).json(err);
      res.json({ message: "Employee deleted successfully" });
    });
  });

  return router;
};
