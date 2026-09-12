const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("../db/database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Anyone logged in can view the active catalog (needed to submit a request)
router.get("/", requireAuth, (req, res) => {
  const includeInactive = req.query.all === "1" && ["staff", "admin"].includes(req.user.role);
  const rows = includeInactive
    ? db.prepare("SELECT * FROM document_types ORDER BY name").all()
    : db.prepare("SELECT * FROM document_types WHERE is_active = 1 ORDER BY name").all();
  res.json({ documentTypes: rows });
});

// Only admin manages the catalog
router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name, description, fee, requirements } = req.body;
  if (!name) return res.status(400).json({ error: "name is required." });

  const id = uuid();
  db.prepare(
    `INSERT INTO document_types (id, name, description, fee, requirements)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, name, description || "", fee || 0, requirements || "");

  res.status(201).json({ documentType: db.prepare("SELECT * FROM document_types WHERE id = ?").get(id) });
});

router.put("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { name, description, fee, requirements, is_active } = req.body;
  const existing = db.prepare("SELECT * FROM document_types WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Document type not found." });

  db.prepare(
    `UPDATE document_types SET name=?, description=?, fee=?, requirements=?, is_active=? WHERE id=?`
  ).run(
    name ?? existing.name,
    description ?? existing.description,
    fee ?? existing.fee,
    requirements ?? existing.requirements,
    is_active ?? existing.is_active,
    req.params.id
  );

  res.json({ documentType: db.prepare("SELECT * FROM document_types WHERE id = ?").get(req.params.id) });
});

module.exports = router;
