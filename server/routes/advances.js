const express = require("express");
module.exports = function (pool) {
  const router = express.Router();

  async function sendToTrash(type, label, data) {
    await pool.query("INSERT INTO trash (type, label, data, \"deletedAt\") VALUES ($1,$2,$3,$4)",
      [type, label, JSON.stringify(data), new Date().toISOString()]);
  }

  router.get("/", async (req, res) => {
    try {
      res.json((await pool.query(`SELECT a.id, a."employeeId", e.name AS "employeeName", a.amount, a.reason, a.date
        FROM advances a JOIN employees e ON a."employeeId"=e.id`)).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/employee/:id", async (req, res) => {
    try {
      res.json((await pool.query(`SELECT amount, reason, date FROM advances WHERE "employeeId"=$1 ORDER BY date DESC`, [req.params.id])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/", async (req, res) => {
    const { employeeId, amount, reason, date } = req.body;
    try {
      const r = await pool.query(`INSERT INTO advances ("employeeId", amount, reason, date) VALUES ($1,$2,$3,$4) RETURNING id`, [employeeId, amount, reason, date]);
      res.json({ message: "Advance added successfully", id: r.rows[0].id });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const item = (await pool.query(`SELECT a.*, e.name AS "empName" FROM advances a JOIN employees e ON a."employeeId"=e.id WHERE a.id=$1`, [req.params.id])).rows[0];
      if (item) await sendToTrash("advance", `${item.empName} - ₹${item.amount} - ${item.date}`, item);
      await pool.query("DELETE FROM advances WHERE id=$1", [req.params.id]);
      res.json({ message: "Advance moved to trash" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
