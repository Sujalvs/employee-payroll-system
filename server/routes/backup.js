const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const DB_PATH = path.join(__dirname, "../database/payroll.db");
const BACKUP_DIR = path.join(__dirname, "../database/backups");
const SETTINGS_PATH = path.join(__dirname, "../database/backup_settings.json");

// Ensure backups dir exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Multer: accept uploaded backup files into a temp location
const upload = multer({
  dest: path.join(__dirname, "../database/temp/"),
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith(".db")) cb(null, true);
    else cb(new Error("Only .db backup files are accepted"));
  },
});

// Load/save settings
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
    }
  } catch (e) {}
  return { autoBackup: false, keepDays: 30 };
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

// Create a backup file — copies the SQLite DB file
function createBackup(label) {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `payroll_backup_${dateStr}${label ? "_" + label : ""}.db`;
  const dest = path.join(BACKUP_DIR, filename);
  fs.copyFileSync(DB_PATH, dest);
  return { filename, size: fs.statSync(dest).size, createdAt: now.toISOString() };
}

// Delete backups older than keepDays
function pruneOldBackups(keepDays) {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".db"));
  files.forEach((f) => {
    const full = path.join(BACKUP_DIR, f);
    const stat = fs.statSync(full);
    if (stat.mtimeMs < cutoff) fs.unlinkSync(full);
  });
}

module.exports = function (db, scheduleCron) {
  const router = express.Router();

  // GET settings
  router.get("/settings", (req, res) => {
    res.json(loadSettings());
  });

  // POST settings (toggle auto backup, set keepDays)
  router.post("/settings", (req, res) => {
    const { autoBackup, keepDays } = req.body;
    const settings = { autoBackup: !!autoBackup, keepDays: keepDays || 30 };
    saveSettings(settings);
    // Tell the main server to reschedule cron
    scheduleCron(settings.autoBackup);
    res.json({ message: "Settings saved", settings });
  });

  // GET list of all backups
  router.get("/list", (req, res) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
      const files = fs.readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith(".db"))
        .map((f) => {
          const full = path.join(BACKUP_DIR, f);
          const stat = fs.statSync(full);
          return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(files);
    } catch (e) {
      res.status(500).json({ message: "Could not read backups" });
    }
  });

  // POST create manual backup now
  router.post("/create", (req, res) => {
    try {
      const backup = createBackup("manual");
      const settings = loadSettings();
      pruneOldBackups(settings.keepDays || 30);
      res.json({ message: "Backup created successfully", backup });
    } catch (e) {
      res.status(500).json({ message: "Backup failed: " + e.message });
    }
  });

  // GET download a specific backup file
  router.get("/download/:filename", (req, res) => {
    const filename = path.basename(req.params.filename); // sanitize
    const full = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(full)) return res.status(404).json({ message: "Backup file not found" });
    res.download(full, filename);
  });

  // DELETE a specific backup
  router.delete("/:filename", (req, res) => {
    const filename = path.basename(req.params.filename);
    const full = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(full)) return res.status(404).json({ message: "Backup not found" });
    fs.unlinkSync(full);
    res.json({ message: "Backup deleted" });
  });

  // POST restore from uploaded .db file
  router.post("/restore", upload.single("backup"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      // First create a safety backup of current DB before overwriting
      createBackup("pre-restore");

      // Close DB connections by replacing the file
      // SQLite will reconnect on next query
      fs.copyFileSync(req.file.path, DB_PATH);
      fs.unlinkSync(req.file.path); // clean up temp

      res.json({ message: "Database restored successfully. Please restart the server for changes to take full effect." });
    } catch (e) {
      // Clean up temp file if exists
      try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch {}
      res.status(500).json({ message: "Restore failed: " + e.message });
    }
  });

  // POST reset all data to factory default (keeps admin accounts)
  router.post("/reset", (req, res) => {
    const { resetPassword } = req.body;
    // Reset password — change this to whatever you want
    const correctPassword = process.env.RESET_PASSWORD || "Admin@1234";

    if (!resetPassword || resetPassword !== correctPassword) {
      return res.status(401).json({ message: "Incorrect reset password. Access denied." });
    }

    try {
      // Create a safety backup before wiping
      createBackup("pre-reset");

      // Delete all data from every table except admins
      db.serialize(() => {
        db.run("DELETE FROM attendance");
        db.run("DELETE FROM advances");
        db.run("DELETE FROM overtime");
        db.run("DELETE FROM payments");
        db.run("DELETE FROM employees");
        // Reset auto-increment counters
        db.run("DELETE FROM sqlite_sequence WHERE name IN ('attendance','advances','overtime','payments','employees')");
        res.json({ message: "System reset successfully. All employees and records have been cleared. Admin accounts are kept." });
      });
    } catch (e) {
      res.status(500).json({ message: "Reset failed: " + e.message });
    }
  });

  // Expose createBackup and pruneOldBackups for cron use
  router.createBackup = createBackup;
  router.pruneOldBackups = pruneOldBackups;
  router.loadSettings = loadSettings;

  return router;
};
