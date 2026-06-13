const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports = function (pool) {
  const router = express.Router();
  const SECRET_KEY = process.env.JWT_SECRET || "fallback_secret";

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const r = await pool.query("SELECT * FROM admins WHERE username=$1", [username]);
      const admin = r.rows[0];
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
      const r = await pool.query("SELECT * FROM admins WHERE username=$1", [username]);
      const admin = r.rows[0];
      if (!admin) return res.status(404).json({ message: "Admin not found" });
      const match = await bcrypt.compare(currentPassword, admin.password);
      if (!match) return res.status(401).json({ message: "Current password is incorrect" });
      const hashed = bcrypt.hashSync(newPassword, 10);
      await pool.query("UPDATE admins SET password=$1 WHERE username=$2", [hashed, username]);
      res.json({ message: "Password changed successfully" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.post("/create-admin", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password required" });
    try {
      const hashed = bcrypt.hashSync(password, 10);
      const r = await pool.query("INSERT INTO admins (username, password) VALUES ($1,$2) RETURNING id", [username, hashed]);
      res.json({ message: "Admin created successfully", id: r.rows[0].id });
    } catch(e) { res.status(400).json({ message: "Username already exists" }); }
  });

  router.get("/admins", async (req, res) => {
    try { res.json((await pool.query("SELECT id, username FROM admins")).rows); }
    catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.delete("/admins/:id", async (req, res) => {
    try {
      if (req.params.id === "1") return res.status(400).json({ message: "Cannot delete primary admin" });
      await pool.query("DELETE FROM admins WHERE id=$1 AND id!=1", [req.params.id]);
      res.json({ message: "Admin deleted" });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  return router;
};
