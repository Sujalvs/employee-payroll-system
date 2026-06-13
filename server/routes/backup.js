const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const DB_PATH = path.join(__dirname, "../database/payroll.db");
const BACKUP_DIR = path.join(__dirname, "../database/backups");
const SETTINGS_PATH = path.join(__dirname, "../database/backup_settings.json");

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const upload = multer({
  dest: path.join(__dirname, "../database/temp/"),
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith(".db")) cb(null, true);
    else cb(new Error("Only .db backup files are accepted"));
  },
});

function loadSettings() {
  try { if (fs.existsSync(SETTINGS_PATH)) return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8")); }
  catch(e) {}
  return { autoBackup: false, keepDays: 30 };
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

function createBackup(label) {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `payroll_backup_${dateStr}${label ? "_" + label : ""}.db`;
  const dest = path.join(BACKUP_DIR, filename);
  fs.copyFileSync(DB_PATH, dest);
  return { filename, size: fs.statSync(dest).size, createdAt: now.toISOString() };
}

function pruneOldBackups(keepDays) {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(".db")).forEach(f => {
    const full = path.join(BACKUP_DIR, f);
    if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
  });
}

module.exports = function (db, scheduleCron) {
  const router = express.Router();

  router.get("/settings", (req, res) => res.json(loadSettings()));

  router.post("/settings", (req, res) => {
    const { autoBackup, keepDays } = req.body;
    const settings = { autoBackup: !!autoBackup, keepDays: keepDays || 30 };
    saveSettings(settings);
    if (scheduleCron) scheduleCron(settings.autoBackup);
    res.json({ message: "Settings saved", settings });
  });

  router.get("/list", (req, res) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) return res.json([]);
      const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(".db"))
        .map(f => { const full = path.join(BACKUP_DIR, f); const stat = fs.statSync(full); return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() }; })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(files);
    } catch(e) { res.status(500).json({ message: "Could not read backups" }); }
  });

  router.post("/create", (req, res) => {
    try {
      const backup = createBackup("manual");
      pruneOldBackups(loadSettings().keepDays || 30);
      res.json({ message: "Backup created successfully", backup });
    } catch(e) { res.status(500).json({ message: "Backup failed: " + e.message }); }
  });

  router.get("/download/:filename", (req, res) => {
    const filename = path.basename(req.params.filename);
    const full = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(full)) return res.status(404).json({ message: "Backup file not found" });
    res.download(full, filename);
  });

  router.delete("/:filename", (req, res) => {
    const filename = path.basename(req.params.filename);
    const full = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(full)) return res.status(404).json({ message: "Backup not found" });
    fs.unlinkSync(full);
    res.json({ message: "Backup deleted" });
  });

  router.post("/restore", upload.single("backup"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    try {
      createBackup("pre-restore");
      fs.copyFileSync(req.file.path, DB_PATH);
      fs.unlinkSync(req.file.path);
      res.json({ message: "Database restored successfully." });
    } catch(e) {
      try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch {}
      res.status(500).json({ message: "Restore failed: " + e.message });
    }
  });

  router.post("/reset", (req, res) => {
    const { resetPassword } = req.body;
    const correctPassword = process.env.RESET_PASSWORD || "Admin@1234";
    if (!resetPassword || resetPassword !== correctPassword)
      return res.status(401).json({ message: "Incorrect reset password." });
    try {
      createBackup("pre-reset");
      db.exec(`
        DELETE FROM attendance;
        DELETE FROM advances;
        DELETE FROM overtime;
        DELETE FROM payments;
        DELETE FROM employees;
        DELETE FROM trash;
      `);
      res.json({ message: "System reset successfully." });
    } catch(e) { res.status(500).json({ message: "Reset failed: " + e.message }); }
  });

  router.createBackup = createBackup;
  router.pruneOldBackups = pruneOldBackups;
  router.loadSettings = loadSettings;

  return router;
};
