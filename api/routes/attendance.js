const express = require("express");
module.exports = function (pool) {
  const router = express.Router();

  async function sendToTrash(type, label, data) {
    await pool.query("INSERT INTO trash (type, label, data, \"deletedAt\") VALUES ($1,$2,$3,$4)",
      [type, label, JSON.stringify(data), new Date().toISOString()]);
  }

  router.get("/", async (req, res) => {
    try {
      res.json((await pool.query(`SELECT a.id, a."employeeId", e.name AS "employeeName", a.date, a.status
        FROM attendance a JOIN employees e ON a."employeeId"=e.id`)).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/employee/:id", async (req, res) => {
    try {
      res.json((await pool.query(`SELECT date, status FROM attendance WHERE "employeeId"=$1 ORDER BY date DESC`, [req.params.id])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/bulk", async (req, res) => {
    const { records } = req.body;
    if (!records || !records.length) return res.status(400).json({ message: "No records provided" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const date = records[0].date;
      const ids = records.map(r => r.employeeId);
      await client.query(`DELETE FROM attendance WHERE date=$1 AND "employeeId"=ANY($2)`, [date, ids]);
      for (const r of records) {
        await client.query(`INSERT INTO attendance ("employeeId", date, status) VALUES ($1,$2,$3)`, [r.employeeId, r.date, r.status]);
      }
      await client.query("COMMIT");
      res.json({ message: `${records.length} records saved` });
    } catch(e) { await client.query("ROLLBACK"); res.status(500).json({ message: e.message }); }
    finally { client.release(); }
  });

  router.post("/", async (req, res) => {
    const { employeeId, date, status } = req.body;
    try {
      const r = await pool.query(`INSERT INTO attendance ("employeeId", date, status) VALUES ($1,$2,$3) RETURNING id`, [employeeId, date, status]);
      res.json({ message: "Attendance added successfully", id: r.rows[0].id });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.put("/:id", async (req, res) => {
    const { employeeId, date, status } = req.body;
    try {
      await pool.query(`UPDATE attendance SET "employeeId"=$1, date=$2, status=$3 WHERE id=$4`, [employeeId, date, status, req.params.id]);
      res.json({ message: "Attendance updated successfully" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/cleanup/orphaned", async (req, res) => {
    try {
      await pool.query(`DELETE FROM attendance WHERE "employeeId" NOT IN (SELECT id FROM employees)`);
      res.json({ message: "Orphaned records cleaned up" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const item = (await pool.query(`SELECT a.*, e.name AS "empName" FROM attendance a JOIN employees e ON a."employeeId"=e.id WHERE a.id=$1`, [req.params.id])).rows[0];
      if (item) await sendToTrash("attendance", `${item.empName} - ${item.date} - ${item.status}`, item);
      await pool.query("DELETE FROM attendance WHERE id=$1", [req.params.id]);
      res.json({ message: "Attendance moved to trash" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
