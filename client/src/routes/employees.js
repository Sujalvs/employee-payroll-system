const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  // GET all employees
  router.get("/", (req, res) => {
    db.all("SELECT * FROM employees", [], (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  });

  // GET employees present today
  router.get("/present-today", (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    db.all(
      `SELECT e.id, e.name, e.department, e.phone
       FROM employees e
       INNER JOIN attendance a ON a.employeeId = e.id
       WHERE a.date = ? AND a.status = 'Present' AND e.status = 'Active'`,
      [today],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  });

  // GET employees absent today
  router.get("/absent-today", (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    db.all(
      `SELECT e.id, e.name, e.department, e.phone
       FROM employees e
       INNER JOIN attendance a ON a.employeeId = e.id
       WHERE a.date = ? AND a.status = 'Absent' AND e.status = 'Active'`,
      [today],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
      }
    );
  });

  // GET one employee
  router.get("/:id", (req, res) => {
    db.get("SELECT * FROM employees WHERE id = ?", [req.params.id], (err, row) => {
      if (err) return res.status(500).json(err);
      res.json(row);
    });
  });

  // ADD employee
  router.post("/", (req, res) => {
    const { name, department, wage, phone } = req.body;
    db.run(
      `INSERT INTO employees (name, department, wage, status, phone) VALUES (?, ?, ?, ?, ?)`,
      [name, department, wage, "Active", phone || null],
      function (err) {
        if (err) return res.status(500).json(err);
        res.json({ message: "Employee added successfully", id: this.lastID });
      }
    );
  });

  // UPDATE employee
  router.put("/:id", (req, res) => {
    const { name, department, wage, phone } = req.body;
    db.run(
      `UPDATE employees SET name=?, department=?, wage=?, phone=? WHERE id=?`,
      [name, department, wage, phone || null, req.params.id],
      function (err) {
        if (err) return res.status(500).json(err);
        res.json({ message: "Employee updated successfully" });
      }
    );
  });

  // MARK INACTIVE
  router.put("/inactive/:id", (req, res) => {
    db.run(`UPDATE employees SET status='Inactive' WHERE id=?`, [req.params.id], function (err) {
      if (err) return res.status(500).json(err);
      res.json({ message: "Employee marked inactive" });
    });
  });

  // DELETE employee
  router.delete("/:id", (req, res) => {
    db.run("DELETE FROM employees WHERE id=?", [req.params.id], function (err) {
      if (err) return res.status(500).json(err);
      res.json({ message: "Employee deleted successfully" });
    });
  });

  return router;
};
