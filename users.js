const express = require("express");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");
const db = require("../db/database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function publicUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

// Admin: list all users (optionally filter by role)
router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const { role } = req.query;
  const rows = role
    ? db.prepare("SELECT * FROM users WHERE role = ? ORDER BY created_at DESC").all(role)
    : db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
  res.json({ users: rows.map(publicUser) });
});

// Admin: create a staff or admin account
router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { full_name, email, phone, password, role } = req.body;
  if (!full_name || !email || !password || !["staff", "admin", "resident"].includes(role)) {
    return res.status(400).json({ error: "full_name, email, password, and a valid role are required." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: "An account with this email already exists." });

  const id = uuid();
  const password_hash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (id, full_name, email, phone, password_hash, role)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, full_name, email.toLowerCase(), phone || null, password_hash, role);

  res.status(201).json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id)) });
});

// Admin: change a user's role or deactivate-style edits
router.put("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { full_name, phone, address, role } = req.body;
  const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "User not found." });

  db.prepare(
    `UPDATE users SET full_name=?, phone=?, address=?, role=? WHERE id=?`
  ).run(
    full_name ?? existing.full_name,
    phone ?? existing.phone,
    address ?? existing.address,
    role ?? existing.role,
    req.params.id
  );

  res.json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id)) });
});

module.exports = router;
