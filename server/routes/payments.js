const express = require("express");
module.exports = function (pool) {
  const router = express.Router();

  async function sendToTrash(type, label, data) {
    await pool.query("INSERT INTO trash (type, label, data, \"deletedAt\") VALUES ($1,$2,$3,$4)",
      [type, label, JSON.stringify(data), new Date().toISOString()]);
  }

  router.get("/", async (req, res) => {
    try {
      res.json((await pool.query(`SELECT p.id, p."employeeId", e.name AS "employeeName", p.amount, p.note, p.date, p.category
        FROM payments p JOIN employees e ON p."employeeId"=e.id ORDER BY p.date DESC`)).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/employee/:id", async (req, res) => {
    try {
      res.json((await pool.query(`SELECT amount, note, date, category FROM payments WHERE "employeeId"=$1 ORDER BY date DESC`, [req.params.id])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/", async (req, res) => {
    const { employeeId, amount, note, date, category } = req.body;
    try {
      const r = await pool.query(`INSERT INTO payments ("employeeId", amount, note, date, category) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [employeeId, amount, note||null, date, category||null]);
      res.json({ message: "Payment added successfully", id: r.rows[0].id });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const item = (await pool.query(`SELECT p.*, e.name AS "empName" FROM payments p JOIN employees e ON p."employeeId"=e.id WHERE p.id=$1`, [req.params.id])).rows[0];
      if (item) await sendToTrash("payment", `${item.empName} - ₹${item.amount} - ${item.date}`, item);
      await pool.query("DELETE FROM payments WHERE id=$1", [req.params.id]);
      res.json({ message: "Payment moved to trash" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
