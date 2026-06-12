require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bcrypt = require("bcryptjs");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(cors());

// Ensure database directory exists
const DB_DIR = path.join(__dirname, "database");
const BACKUP_DIR = path.join(DB_DIR, "backups");
const TEMP_DIR = path.join(DB_DIR, "temp");
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const db = new sqlite3.Database(path.join(DB_DIR, "payroll.db"), (err) => {
  if (err) { console.log(err); return; }
  console.log("SQLite connected");

  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, department TEXT NOT NULL,
    wage REAL NOT NULL, status TEXT DEFAULT 'Active',
    phone TEXT, notes TEXT
  )`);

  db.run(`ALTER TABLE employees ADD COLUMN phone TEXT`, () => {});
  db.run(`ALTER TABLE employees ADD COLUMN notes TEXT`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL, date TEXT NOT NULL, status TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS advances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL, amount REAL NOT NULL, reason TEXT, date TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS overtime (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL, hours REAL NOT NULL, rate REAL NOT NULL, date TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL, amount REAL NOT NULL, note TEXT, date TEXT NOT NULL, category TEXT
  )`);
  db.run(`ALTER TABLE payments ADD COLUMN category TEXT`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE, password TEXT
  )`);

  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.run(`INSERT OR IGNORE INTO admins (id, username, password) VALUES (1, 'admin', ?)`, [hashedPassword]);

  console.log("Tables ready");
});

// ── Cron setup ─────────────────────────────────────────────
let cronJob = null;

function scheduleCron(enabled) {
  if (cronJob) { cronJob.stop(); cronJob = null; }
  if (!enabled) {
    console.log("Auto backup disabled");
    return;
  }
  // Run every day at 2:00 AM
  cronJob = cron.schedule("0 2 * * *", () => {
    try {
      const settings = backupRouter.loadSettings();
      backupRouter.createBackup("auto");
      backupRouter.pruneOldBackups(settings.keepDays || 30);
      console.log(`[${new Date().toISOString()}] Auto backup completed`);
    } catch (e) {
      console.error("Auto backup failed:", e.message);
    }
  });
  console.log("Auto backup scheduled — runs daily at 2:00 AM");
}

// Routes
const employeeRoutes = require("./routes/employees")(db);
const attendanceRoutes = require("./routes/attendance")(db);
const payrollRoutes = require("./routes/payroll")(db);
const dashboardRoutes = require("./routes/dashboard")(db);
const advancesRoutes = require("./routes/advances")(db);
const overtimeRoutes = require("./routes/overtime")(db);
const paymentsRoutes = require("./routes/payments")(db);
const authRoutes = require("./routes/auth")(db);
const reportsRoutes = require("./routes/reports")(db);
const backupRouter = require("./routes/backup")(db, scheduleCron);

app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/advances", advancesRoutes);
app.use("/api/overtime", overtimeRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/backup", backupRouter);

// Start cron if previously enabled
const { autoBackup } = backupRouter.loadSettings();
if (autoBackup) scheduleCron(true);

app.get("/", (req, res) => res.send("Payroll Backend Running"));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
