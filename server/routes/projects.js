const express = require("express");
module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    try { res.json(db.prepare("SELECT * FROM projects ORDER BY name").all()); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/", (req, res) => {
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ message: "Project name required" });
    try {
      const r = db.prepare("INSERT INTO projects (name, location, status) VALUES (?,?,'Active')").run(name, location||null);
      res.json({ message: "Project added", id: r.lastInsertRowid });
    } catch(e) { res.status(400).json({ message: "Project name already exists" }); }
  });

  router.put("/:id", (req, res) => {
    const { name, location, status } = req.body;
    try {
      db.prepare("UPDATE projects SET name=?, location=?, status=? WHERE id=?").run(name, location||null, status||"Active", req.params.id);
      res.json({ message: "Project updated" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM projects WHERE id=?").run(req.params.id);
      res.json({ message: "Project deleted" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
