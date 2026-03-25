const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDb() {
  // Tabellen erstellen
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      hourly_rate REAL NOT NULL DEFAULT 0,
      km_rate REAL NOT NULL DEFAULT 0.30,
      travel_flat_rate REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT,
      street TEXT,
      city TEXT,
      zip TEXT,
      phone TEXT,
      email TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS client_assignments (
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (client_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_minutes INTEGER NOT NULL DEFAULT 0,
      hours_worked REAL NOT NULL DEFAULT 0,
      kilometers REAL NOT NULL DEFAULT 0,
      parking_fees REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: neue Spalten hinzufügen falls noch nicht vorhanden
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS km_rate REAL NOT NULL DEFAULT 0.30;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS travel_flat_rate REAL NOT NULL DEFAULT 0;
    ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS kilometers REAL NOT NULL DEFAULT 0;
  `);

  // Admin anlegen falls nicht vorhanden
  const { rows } = await pool.query("SELECT id FROM users WHERE role = 'admin'");
  if (rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role, hourly_rate, km_rate, travel_flat_rate) VALUES ($1, $2, $3, 'admin', 0, 0.30, 0)",
      ['Administrator', 'admin@firma.de', hash]
    );
    console.log('✅ Admin-Account angelegt: admin@firma.de / admin123');
  }
}

module.exports = { pool, initDb };
