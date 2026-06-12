const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const SETTINGS_PATH = path.join(__dirname, "../backup_settings.json");
const upload = multer({ dest: "/tmp/" });

function loadSettings() {
  try { if (fs.existsSync(SETTINGS_PATH)) return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8")); }
  catch(e) {}
  return { autoBackup: false, keepDays: 30 };
}

function saveSettings(settings) {
  try { fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2)); } catch(e) {}
}

module.exports = function (pool, scheduleCron) {
  const router = express.Router();

  router.get("/settings", (req, res) => res.json(loadSettings()));

  router.post("/settings", (req, res) => {
    const { autoBackup, keepDays } = req.body;
    const settings = { autoBackup: !!autoBackup, keepDays: keepDays || 30 };
    saveSettings(settings);
    scheduleCron(settings.autoBackup);
    res.json({ message: "Settings saved", settings });
  });

  // Export all data as JSON
  router.post("/create", async (req, res) => {
    try {
      const [emp, att, adv, ot, pmt, admins] = await Promise.all([
        pool.query("SELECT * FROM employees"),
        pool.query("SELECT * FROM attendance"),
        pool.query("SELECT * FROM advances"),
        pool.query("SELECT * FROM overtime"),
        pool.query("SELECT * FROM payments"),
        pool.query("SELECT id, username FROM admins"),
      ]);
      const backup = {
        createdAt: new Date().toISOString(),
        employees: emp.rows,
        attendance: att.rows,
        advances: adv.rows,
        overtime: ot.rows,
        payments: pmt.rows,
        admins: admins.rows,
      };
      res.json({ message: "Backup created successfully", backup });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  // List — return empty for now (no file storage on Vercel)
  router.get("/list", (req, res) => res.json([]));

  // Reset
  router.post("/reset", async (req, res) => {
    const { resetPassword } = req.body;
    const correctPassword = process.env.RESET_PASSWORD || "Admin@1234";
    if (!resetPassword || resetPassword !== correctPassword)
      return res.status(401).json({ message: "Incorrect reset password. Access denied." });
    try {
      await pool.query("DELETE FROM attendance");
      await pool.query("DELETE FROM advances");
      await pool.query("DELETE FROM overtime");
      await pool.query("DELETE FROM payments");
      await pool.query("DELETE FROM employees");
      await pool.query("DELETE FROM trash");
      res.json({ message: "System reset successfully." });
    } catch(e) { res.status(500).json({ message: e.message }); }
  });

  router.createBackup = () => {};
  router.pruneOldBackups = () => {};
  router.loadSettings = loadSettings;

  return router;
};
