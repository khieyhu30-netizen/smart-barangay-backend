const path = require("path");
const Database = require("better-sqlite3");

const dbFile = process.env.DB_FILE || path.join(__dirname, "barangay.sqlite");
const db = new Database(dbFile);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------------------------------------------------------------------------
// Schema
// NOTE: This file uses SQLite for zero-config local development. The
// proposal's Technology Stack lists MySQL / PostgreSQL for production -
// the SQL below uses portable syntax that maps closely to both; swap the
// `db/database.js` connector for a `mysql2` or `pg` pool when deploying.
// ---------------------------------------------------------------------------

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('resident','staff','admin')) DEFAULT 'resident',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_types (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  fee REAL NOT NULL DEFAULT 0,
  requirements TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  tracking_code TEXT UNIQUE NOT NULL,
  resident_id TEXT NOT NULL REFERENCES users(id),
  document_type_id TEXT NOT NULL REFERENCES document_types(id),
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('Pending','Processing','Ready for Pickup','Released','Rejected')
  ) DEFAULT 'Pending',
  remarks TEXT,
  handled_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS request_status_history (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id),
  status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  request_id TEXT REFERENCES requests(id),
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','in_app')) DEFAULT 'in_app',
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_requests_resident ON requests(resident_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`);

module.exports = db;
