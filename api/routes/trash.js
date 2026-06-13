const express = require("express");
module.exports = function (pool) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    try { res.json((await pool.query(`SELECT * FROM trash ORDER BY "deletedAt" DESC`)).rows); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.get("/:type", async (req, res) => {
    try { res.json((await pool.query(`SELECT * FROM trash WHERE type=$1 ORDER BY "deletedAt" DESC`, [req.params.type])).rows); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/", async (req, res) => {
    try { await pool.query("DELETE FROM trash"); res.json({ message: "Trash emptied" }); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", async (req, res) => {
    try { await pool.query("DELETE FROM trash WHERE id=$1", [req.params.id]); res.json({ message: "Permanently deleted" }); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/restore/employee/:id", async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const item = (await client.query("SELECT * FROM trash WHERE id=$1 AND type='employee'", [req.params.id])).rows[0];
      if (!item) return res.status(404).json({ message: "Item not found in trash" });
      const d = JSON.parse(item.data);
      await client.query("INSERT INTO employees (id, name, department, wage, status, phone, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
        [d.id, d.name, d.department, d.wage, d.status||'Active', d.phone||null, d.notes||null]);
      await client.query("DELETE FROM trash WHERE id=$1", [req.params.id]);
      await client.query("COMMIT");
      res.json({ message: `Employee "${d.name}" restored successfully` });
    } catch(e) { await client.query("ROLLBACK"); res.status(500).json({ message: e.message }); }
    finally { client.release(); }
  });

  router.post("/restore/record/:id", async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const item = (await client.query("SELECT * FROM trash WHERE id=$1", [req.params.id])).rows[0];
      if (!item) return res.status(404).json({ message: "Item not found in trash" });
      const d = JSON.parse(item.data);
      if (item.type === 'attendance') await client.query(`INSERT INTO attendance (id,"employeeId",date,status) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [d.id,d.employeeId,d.date,d.status]);
      if (item.type === 'advance') await client.query(`INSERT INTO advances (id,"employeeId",amount,reason,date) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [d.id,d.employeeId,d.amount,d.reason||null,d.date]);
      if (item.type === 'overtime') await client.query(`INSERT INTO overtime (id,"employeeId",hours,rate,date) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [d.id,d.employeeId,d.hours,d.rate,d.date]);
      if (item.type === 'payment') await client.query(`INSERT INTO payments (id,"employeeId",amount,note,date,category) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`, [d.id,d.employeeId,d.amount,d.note||null,d.date,d.category||null]);
      await client.query("DELETE FROM trash WHERE id=$1", [req.params.id]);
      await client.query("COMMIT");
      res.json({ message: "Record restored successfully" });
    } catch(e) { await client.query("ROLLBACK"); res.status(500).json({ message: e.message }); }
    finally { client.release(); }
  });

  return router;
};
