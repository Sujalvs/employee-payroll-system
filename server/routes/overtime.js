const express = require("express");
module.exports = function (pool) {
  const router = express.Router();

  async function sendToTrash(type, label, data) {
    await pool.query("INSERT INTO trash (type, label, data, \"deletedAt\") VALUES ($1,$2,$3,$4)",
      [type, label, JSON.stringify(data), new Date().toISOString()]);
  }

  router.get("/", async (req, res) => {
    try {
      res.json((await pool.query(`SELECT o.id, o."employeeId", e.name AS "employeeName", o.hours, o.rate, o.date
        FROM overtime o JOIN employees e ON o."employeeId"=e.id`)).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/employee/:id", async (req, res) => {
    try {
      res.json((await pool.query(`SELECT hours, rate, date FROM overtime WHERE "employeeId"=$1 ORDER BY date DESC`, [req.params.id])).rows);
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/", async (req, res) => {
    const { employeeId, hours, rate, date } = req.body;
    try {
      const r = await pool.query(`INSERT INTO overtime ("employeeId", hours, rate, date) VALUES ($1,$2,$3,$4) RETURNING id`, [employeeId, hours, rate, date]);
      res.json({ message: "Overtime added successfully", id: r.rows[0].id });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const item = (await pool.query(`SELECT o.*, e.name AS "empName" FROM overtime o JOIN employees e ON o."employeeId"=e.id WHERE o.id=$1`, [req.params.id])).rows[0];
      if (item) await sendToTrash("overtime", `${item.empName} - ${item.hours}hrs - ${item.date}`, item);
      await pool.query("DELETE FROM overtime WHERE id=$1", [req.params.id]);
      res.json({ message: "Overtime moved to trash" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
