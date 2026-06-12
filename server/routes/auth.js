const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports = function (db) {
  const router = express.Router();
  const SECRET_KEY = process.env.JWT_SECRET || "fallback_secret";

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const admin = db.prepare("SELECT * FROM admins WHERE username=?").get(username);
      if (!admin) return res.status(401).json({ message: "Invalid username or password" });
      const match = await bcrypt.compare(password, admin.password);
      if (!match) return res.status(401).json({ message: "Invalid username or password" });
      const token = jwt.sign({ id: admin.id, username: admin.username }, SECRET_KEY, { expiresIn: "1d" });
      res.json({ message: "Login successful", token });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/change-password", async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    if (!username || !currentPassword || !newPassword) return res.status(400).json({ message: "All fields required" });
    try {
      const admin = db.prepare("SELECT * FROM admins WHERE username=?").get(username);
      if (!admin) return res.status(404).json({ message: "Admin not found" });
      const match = await bcrypt.compare(currentPassword, admin.password);
      if (!match) return res.status(401).json({ message: "Current password is incorrect" });
      const hashed = bcrypt.hashSync(newPassword, 10);
      db.prepare("UPDATE admins SET password=? WHERE username=?").run(hashed, username);
      res.json({ message: "Password changed successfully" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/create-admin", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password required" });
    try {
      const hashed = bcrypt.hashSync(password, 10);
      const result = db.prepare("INSERT INTO admins (username, password) VALUES (?,?)").run(username, hashed);
      res.json({ message: "Admin created successfully", id: result.lastInsertRowid });
    } catch(e) { res.status(400).json({ message: "Username already exists" }); }
  });

  router.get("/admins", (req, res) => {
    try { res.json(db.prepare("SELECT id, username FROM admins").all()); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/admins/:id", (req, res) => {
    try {
      const result = db.prepare("DELETE FROM admins WHERE id=? AND id != 1").run(req.params.id);
      if (result.changes === 0) return res.status(400).json({ message: "Cannot delete primary admin" });
      res.json({ message: "Admin deleted" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
