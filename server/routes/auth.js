const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports = function (db) {
  const router = express.Router();
  const SECRET_KEY = process.env.JWT_SECRET || "fallback_secret";

  // Login
  router.post("/login", (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM admins WHERE username=?", [username], async (err, admin) => {
      if (err) return res.status(500).json(err);
      if (!admin) return res.status(401).json({ message: "Invalid username or password" });
      const match = await bcrypt.compare(password, admin.password);
      if (!match) return res.status(401).json({ message: "Invalid username or password" });
      const token = jwt.sign({ id: admin.id, username: admin.username }, SECRET_KEY, { expiresIn: "1d" });
      res.json({ message: "Login successful", token });
    });
  });

  // Change password
  router.post("/change-password", (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    if (!username || !currentPassword || !newPassword)
      return res.status(400).json({ message: "All fields required" });
    db.get("SELECT * FROM admins WHERE username=?", [username], async (err, admin) => {
      if (err) return res.status(500).json(err);
      if (!admin) return res.status(404).json({ message: "Admin not found" });
      const match = await bcrypt.compare(currentPassword, admin.password);
      if (!match) return res.status(401).json({ message: "Current password is incorrect" });
      const hashed = bcrypt.hashSync(newPassword, 10);
      db.run("UPDATE admins SET password=? WHERE username=?", [hashed, username], function (err) {
        if (err) return res.status(500).json(err);
        res.json({ message: "Password changed successfully" });
      });
    });
  });

  // Create new admin user
  router.post("/create-admin", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "Username and password required" });
    const hashed = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO admins (username, password) VALUES (?, ?)", [username, hashed], function (err) {
      if (err) return res.status(400).json({ message: "Username already exists" });
      res.json({ message: "Admin created successfully", id: this.lastID });
    });
  });

  // Get all admins
  router.get("/admins", (req, res) => {
    db.all("SELECT id, username FROM admins", [], (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    });
  });

  // Delete admin
  router.delete("/admins/:id", (req, res) => {
    db.run("DELETE FROM admins WHERE id=? AND id != 1", [req.params.id], function (err) {
      if (err) return res.status(500).json(err);
      if (this.changes === 0) return res.status(400).json({ message: "Cannot delete primary admin" });
      res.json({ message: "Admin deleted" });
    });
  });

  return router;
};
