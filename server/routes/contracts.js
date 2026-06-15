const express = require("express");

module.exports = function(db) {
  const router = express.Router();

  // ── Workers ──
  router.get("/workers", (req, res) => {
    try {
      res.json(db.prepare("SELECT * FROM contract_workers ORDER BY name").all());
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/workers", (req, res) => {
    const { name, phone, workType, unit, ratePerUnit, notes } = req.body;
    if (!name || !workType || !unit || !ratePerUnit) return res.status(400).json({ message: "Name, work type, unit and rate required" });
    try {
      const r = db.prepare("INSERT INTO contract_workers (name, phone, workType, unit, ratePerUnit, notes) VALUES (?,?,?,?,?,?)").run(name, phone||null, workType, unit, ratePerUnit, notes||null);
      res.json({ message: "Worker added", id: r.lastInsertRowid });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.put("/workers/:id", (req, res) => {
    const { name, phone, workType, unit, ratePerUnit, status, notes } = req.body;
    try {
      db.prepare("UPDATE contract_workers SET name=?, phone=?, workType=?, unit=?, ratePerUnit=?, status=?, notes=? WHERE id=?").run(name, phone||null, workType, unit, ratePerUnit, status||"Active", notes||null, req.params.id);
      res.json({ message: "Worker updated" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/workers/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM contract_workers WHERE id=?").run(req.params.id);
      res.json({ message: "Worker deleted" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  // ── Work entries ──
  router.get("/work/:workerId", (req, res) => {
    try {
      res.json(db.prepare("SELECT * FROM contract_work WHERE workerId=? ORDER BY date DESC").all(req.params.workerId));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/work", (req, res) => {
    const { workerId, description, quantity, unit, ratePerUnit, date, notes } = req.body;
    const amount = quantity * ratePerUnit;
    try {
      const r = db.prepare("INSERT INTO contract_work (workerId, description, quantity, unit, ratePerUnit, amount, date, notes) VALUES (?,?,?,?,?,?,?,?)").run(workerId, description||null, quantity, unit, ratePerUnit, amount, date, notes||null);
      res.json({ message: "Work entry added", id: r.lastInsertRowid });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/work/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM contract_work WHERE id=?").run(req.params.id);
      res.json({ message: "Work entry deleted" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  // ── Advances ──
  router.get("/advances/:workerId", (req, res) => {
    try {
      res.json(db.prepare("SELECT * FROM contract_advances WHERE workerId=? ORDER BY date DESC").all(req.params.workerId));
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/advances", (req, res) => {
    const { workerId, amount, reason, date } = req.body;
    try {
      const r = db.prepare("INSERT INTO contract_advances (workerId, amount, reason, date) VALUES (?,?,?,?)").run(workerId, amount, reason||null, date);
      res.json({ message: "Advance added", id: r.lastInsertRowid });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/advances/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM contract_advances WHERE id=?").run(req.params.id);
      res.json({ message: "Advance deleted" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  // ── Summary (total work done vs total advances) ──
  router.get("/summary/:workerId", (req, res) => {
    try {
      const worker = db.prepare("SELECT * FROM contract_workers WHERE id=?").get(req.params.workerId);
      if (!worker) return res.status(404).json({ message: "Worker not found" });
      const work = db.prepare("SELECT * FROM contract_work WHERE workerId=? ORDER BY date DESC").all(req.params.workerId);
      const advances = db.prepare("SELECT * FROM contract_advances WHERE workerId=? ORDER BY date DESC").all(req.params.workerId);
      const totalWork = work.reduce((s, w) => s + w.amount, 0);
      const totalAdvances = advances.reduce((s, a) => s + a.amount, 0);
      const balance = totalWork - totalAdvances;
      res.json({ worker, work, advances, totalWork, totalAdvances, balance });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
