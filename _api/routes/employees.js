const express = require("express");
module.exports = function (pool) {
  const router = express.Router();

  async function sendToTrash(type, label, data) {
    await pool.query("INSERT INTO trash (type, label, data, \"deletedAt\") VALUES ($1,$2,$3,$4)",
      [type, label, JSON.stringify(data), new Date().toISOString()]);
  }

  router.get("/", async (req, res) => {
    try { res.json((await pool.query("SELECT * FROM employees")).rows); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/present-today", async (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    try {
      res.json((await pool.query(`SELECT e.id, e.name, e.department, e.phone FROM employees e
        INNER JOIN attendance a ON a."employeeId"=e.id
        WHERE a.date=$1 AND a.status='Present' AND e.status='Active'`, [today])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/absent-today", async (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    try {
      res.json((await pool.query(`SELECT e.id, e.name, e.department, e.phone FROM employees e
        INNER JOIN attendance a ON a."employeeId"=e.id
        WHERE a.date=$1 AND a.status='Absent' AND e.status='Active'`, [today])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/not-marked-on/:date", async (req, res) => {
    try {
      res.json((await pool.query(`SELECT id, name, department, phone FROM employees
        WHERE status='Active' AND id NOT IN (SELECT "employeeId" FROM attendance WHERE date=$1)`,
        [req.params.date])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/present-on/:date", async (req, res) => {
    try {
      res.json((await pool.query(`SELECT e.id, e.name, e.department, e.phone FROM employees e
        INNER JOIN attendance a ON a."employeeId"=e.id
        WHERE a.date=$1 AND a.status='Present' AND e.status='Active'`, [req.params.date])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/absent-on/:date", async (req, res) => {
    try {
      res.json((await pool.query(`SELECT e.id, e.name, e.department, e.phone FROM employees e
        INNER JOIN attendance a ON a."employeeId"=e.id
        WHERE a.date=$1 AND a.status='Absent' AND e.status='Active'`, [req.params.date])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/:id", async (req, res) => {
    try { res.json((await pool.query("SELECT * FROM employees WHERE id=$1", [req.params.id])).rows[0]); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/", async (req, res) => {
    const { name, department, wage, phone, notes } = req.body;
    try {
      const r = await pool.query("INSERT INTO employees (name, department, wage, status, phone, notes) VALUES ($1,$2,$3,'Active',$4,$5) RETURNING id",
        [name, department, wage, phone||null, notes||null]);
      res.json({ message: "Employee added successfully", id: r.rows[0].id });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.put("/:id", async (req, res) => {
    const { name, department, wage, phone, notes } = req.body;
    try {
      await pool.query("UPDATE employees SET name=$1, department=$2, wage=$3, phone=$4, notes=$5 WHERE id=$6",
        [name, department, wage, phone||null, notes||null, req.params.id]);
      res.json({ message: "Employee updated successfully" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.put("/inactive/:id", async (req, res) => {
    try { await pool.query("UPDATE employees SET status='Inactive' WHERE id=$1", [req.params.id]); res.json({ message: "Employee marked inactive" }); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.put("/active/:id", async (req, res) => {
    try { await pool.query("UPDATE employees SET status='Active' WHERE id=$1", [req.params.id]); res.json({ message: "Employee reactivated" }); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const emp = (await client.query("SELECT * FROM employees WHERE id=$1", [req.params.id])).rows[0];
      if (!emp) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Employee not found" }); }

      await sendToTrash("employee", emp.name, emp);

      const att = (await client.query("SELECT * FROM attendance WHERE \"employeeId\"=$1", [req.params.id])).rows;
      for (const r of att) await sendToTrash("attendance", `${emp.name} - ${r.date}`, r);

      const adv = (await client.query("SELECT * FROM advances WHERE \"employeeId\"=$1", [req.params.id])).rows;
      for (const r of adv) await sendToTrash("advance", `${emp.name} - ₹${r.amount}`, r);

      const ot = (await client.query("SELECT * FROM overtime WHERE \"employeeId\"=$1", [req.params.id])).rows;
      for (const r of ot) await sendToTrash("overtime", `${emp.name} - ${r.date}`, r);

      const pmt = (await client.query("SELECT * FROM payments WHERE \"employeeId\"=$1", [req.params.id])).rows;
      for (const r of pmt) await sendToTrash("payment", `${emp.name} - ₹${r.amount}`, r);

      await client.query("DELETE FROM attendance WHERE \"employeeId\"=$1", [req.params.id]);
      await client.query("DELETE FROM advances WHERE \"employeeId\"=$1", [req.params.id]);
      await client.query("DELETE FROM overtime WHERE \"employeeId\"=$1", [req.params.id]);
      await client.query("DELETE FROM payments WHERE \"employeeId\"=$1", [req.params.id]);
      await client.query("DELETE FROM employees WHERE id=$1", [req.params.id]);
      await client.query("COMMIT");
      res.json({ message: "Employee moved to trash" });
    } catch(e) { await client.query("ROLLBACK"); res.status(500).json({ message: e.message }); }
    finally { client.release(); }
  });

  return router;
};
