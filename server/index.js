require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const cron = require("node-cron");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(cors({ origin: "*", credentials: false }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        wage REAL NOT NULL,
        status TEXT DEFAULT 'Active',
        phone TEXT,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        "employeeId" INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS advances (
        id SERIAL PRIMARY KEY,
        "employeeId" INTEGER NOT NULL,
        amount REAL NOT NULL,
        reason TEXT,
        date TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS overtime (
        id SERIAL PRIMARY KEY,
        "employeeId" INTEGER NOT NULL,
        hours REAL NOT NULL,
        rate REAL NOT NULL,
        date TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        "employeeId" INTEGER NOT NULL,
        amount REAL NOT NULL,
        note TEXT,
        date TEXT NOT NULL,
        category TEXT
      );
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT
      );
      CREATE TABLE IF NOT EXISTS trash (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        data TEXT NOT NULL,
        "deletedAt" TEXT NOT NULL
      );
    `);

    // Default admin
    const existing = await client.query("SELECT id FROM admins WHERE id=1");
    if (existing.rows.length === 0) {
      const hashed = bcrypt.hashSync("admin123", 10);
      await client.query("INSERT INTO admins (username, password) VALUES ($1, $2) ON CONFLICT DO NOTHING", ["admin", hashed]);
    }

    console.log("PostgreSQL connected — Tables ready");
  } finally {
    client.release();
  }
}

initDB().catch(console.error);

// ── Cron ──────────────────────────────────────────────────
let cronJob = null;
function scheduleCron(enabled) {
  if (cronJob) { cronJob.stop(); cronJob = null; }
  if (!enabled) return;
  cronJob = cron.schedule("0 2 * * *", () => {
    console.log(`[${new Date().toISOString()}] Auto backup — PostgreSQL data is always persisted`);
  });
}

// Routes
const employeeRoutes = require("./routes/employees")(pool);
const attendanceRoutes = require("./routes/attendance")(pool);
const payrollRoutes = require("./routes/payroll")(pool);
const dashboardRoutes = require("./routes/dashboard")(pool);
const advancesRoutes = require("./routes/advances")(pool);
const overtimeRoutes = require("./routes/overtime")(pool);
const paymentsRoutes = require("./routes/payments")(pool);
const authRoutes = require("./routes/auth")(pool);
const reportsRoutes = require("./routes/reports")(pool);
const backupRouter = require("./routes/backup")(pool, scheduleCron);
const trashRouter = require("./routes/trash")(pool);

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
app.use("/api/trash", trashRouter);

app.get("/", (req, res) => res.send("Payroll Backend Running"));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
