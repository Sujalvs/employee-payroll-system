const express = require("express");
const { getPool, initDB } = require("./db");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

let initialized = false;
app.use(async (req, res, next) => {
  if (!initialized) {
    try { await initDB(); initialized = true; } catch(e) { console.error("DB init:", e.message); }
  }
  next();
});

const pool = getPool();

// Mount routes at both /api/X and /X so Vercel routing works either way
const employeesRouter = require("./routes/employees")(pool);
const attendanceRouter = require("./routes/attendance")(pool);
const advancesRouter = require("./routes/advances")(pool);
const overtimeRouter = require("./routes/overtime")(pool);
const paymentsRouter = require("./routes/payments")(pool);
const authRouter = require("./routes/auth")(pool);
const dashboardRouter = require("./routes/dashboard")(pool);
const payrollRouter = require("./routes/payroll")(pool);
const reportsRouter = require("./routes/reports")(pool);
const backupRouter = require("./routes/backup")(pool);
const trashRouter = require("./routes/trash")(pool);

app.use("/api/employees", employeesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/advances", advancesRouter);
app.use("/api/overtime", overtimeRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/backup", backupRouter);
app.use("/api/trash", trashRouter);

// Also mount without /api prefix in case Vercel strips it
app.use("/employees", employeesRouter);
app.use("/attendance", attendanceRouter);
app.use("/advances", advancesRouter);
app.use("/overtime", overtimeRouter);
app.use("/payments", paymentsRouter);
app.use("/auth", authRouter);
app.use("/dashboard", dashboardRouter);
app.use("/payroll", payrollRouter);
app.use("/reports", reportsRouter);
app.use("/backup", backupRouter);
app.use("/trash", trashRouter);

app.get("/", (req, res) => res.send("Payroll Backend Running"));
app.get("/api", (req, res) => res.send("Payroll Backend Running"));

module.exports = app;
