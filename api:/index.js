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

app.use("/api/employees", require("./routes/employees")(pool));
app.use("/api/attendance", require("./routes/attendance")(pool));
app.use("/api/advances", require("./routes/advances")(pool));
app.use("/api/overtime", require("./routes/overtime")(pool));
app.use("/api/payments", require("./routes/payments")(pool));
app.use("/api/auth", require("./routes/auth")(pool));
app.use("/api/dashboard", require("./routes/dashboard")(pool));
app.use("/api/payroll", require("./routes/payroll")(pool));
app.use("/api/reports", require("./routes/reports")(pool));
app.use("/api/backup", require("./routes/backup")(pool));
app.use("/api/trash", require("./routes/trash")(pool));

app.get("/api", (req, res) => res.send("Payroll Backend Running"));

// Export for Vercel serverless
module.exports = app;
