const { Pool } = require("pg");

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
  }
  return pool;
}

async function initDB() {
  const client = await getPool().connect();
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
    const bcrypt = require("bcryptjs");
    const hashed = bcrypt.hashSync("admin123", 10);
    await client.query("INSERT INTO admins (username, password) VALUES ($1,$2) ON CONFLICT DO NOTHING", ["admin", hashed]);
  } finally {
    client.release();
  }
}

module.exports = { getPool, initDB };
