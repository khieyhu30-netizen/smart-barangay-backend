const express = require("express");
const { v4: uuid } = require("uuid");
const db = require("../db/database");
const { requireAuth, requireRole } = require("../middleware/auth");
const { notify } = require("../services/notify");

const router = express.Router();

function generateTrackingCode() {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SB-${year}-${rand}`;
}

function attachDocType(request) {
  const docType = db.prepare("SELECT * FROM document_types WHERE id = ?").get(request.document_type_id);
  const resident = db.prepare("SELECT id, full_name, email, phone FROM users WHERE id = ?").get(request.resident_id);
  return { ...request, document_type: docType, resident };
}

// Resident: submit a new request
router.post("/", requireAuth, requireRole("resident"), (req, res) => {
  const { document_type_id, purpose } = req.body;
  if (!document_type_id || !purpose) {
    return res.status(400).json({ error: "document_type_id and purpose are required." });
  }

  const docType = db.prepare("SELECT * FROM document_types WHERE id = ? AND is_active = 1").get(document_type_id);
  if (!docType) return res.status(404).json({ error: "Document type not found or inactive." });

  const id = uuid();
  let tracking_code = generateTrackingCode();
  while (db.prepare("SELECT id FROM requests WHERE tracking_code = ?").get(tracking_code)) {
    tracking_code = generateTrackingCode();
  }

  db.prepare(
    `INSERT INTO requests (id, tracking_code, resident_id, document_type_id, purpose, status)
     VALUES (?, ?, ?, ?, ?, 'Pending')`
  ).run(id, tracking_code, req.user.id, document_type_id, purpose);

  db.prepare(
    `INSERT INTO request_status_history (id, request_id, status, note, changed_by)
     VALUES (?, ?, 'Pending', 'Request submitted.', ?)`
  ).run(uuid(), id, req.user.id);

  notify({
    userId: req.user.id,
    requestId: id,
    message: `Your request ${tracking_code} for ${docType.name} has been received and is Pending.`,
  });

  const request = db.prepare("SELECT * FROM requests WHERE id = ?").get(id);
  res.status(201).json({ request: attachDocType(request) });
});

// Resident: list own requests
router.get("/mine", requireAuth, requireRole("resident"), (req, res) => {
  const rows = db
    .prepare("SELECT * FROM requests WHERE resident_id = ? ORDER BY created_at DESC")
    .all(req.user.id);
  res.json({ requests: rows.map(attachDocType) });
});

// Anyone: track by tracking code (public-ish, but still requires login to reduce enumeration)
router.get("/track/:code", requireAuth, (req, res) => {
  const request = db.prepare("SELECT * FROM requests WHERE tracking_code = ?").get(req.params.code);
  if (!request) return res.status(404).json({ error: "No request found with that tracking code." });

  if (req.user.role === "resident" && request.resident_id !== req.user.id) {
    return res.status(403).json({ error: "This request does not belong to your account." });
  }

  const history = db
    .prepare("SELECT * FROM request_status_history WHERE request_id = ? ORDER BY created_at ASC")
    .all(request.id);

  res.json({ request: attachDocType(request), history });
});

// Staff/Admin: list all requests, with optional status filter
router.get("/", requireAuth, requireRole("staff", "admin"), (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare("SELECT * FROM requests WHERE status = ? ORDER BY created_at DESC").all(status)
    : db.prepare("SELECT * FROM requests ORDER BY created_at DESC").all();
  res.json({ requests: rows.map(attachDocType) });
});

// Staff/Admin: get single request with history
router.get("/:id", requireAuth, requireRole("staff", "admin"), (req, res) => {
  const request = db.prepare("SELECT * FROM requests WHERE id = ?").get(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found." });
  const history = db
    .prepare("SELECT * FROM request_status_history WHERE request_id = ? ORDER BY created_at ASC")
    .all(request.id);
  res.json({ request: attachDocType(request), history });
});

// Staff/Admin: update status
const VALID_STATUSES = ["Pending", "Processing", "Ready for Pickup", "Released", "Rejected"];

router.patch("/:id/status", requireAuth, requireRole("staff", "admin"), (req, res) => {
  const { status, note } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  const request = db.prepare("SELECT * FROM requests WHERE id = ?").get(req.params.id);
  if (!request) return res.status(404).json({ error: "Request not found." });

  db.prepare(
    `UPDATE requests SET status = ?, remarks = ?, handled_by = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(status, note || request.remarks, req.user.id, req.params.id);

  db.prepare(
    `INSERT INTO request_status_history (id, request_id, status, note, changed_by)
     VALUES (?, ?, ?, ?, ?)`
  ).run(uuid(), req.params.id, status, note || null, req.user.id);

  const docType = db.prepare("SELECT * FROM document_types WHERE id = ?").get(request.document_type_id);
  notify({
    userId: request.resident_id,
    requestId: request.id,
    message: `Your request ${request.tracking_code} for ${docType.name} is now: ${status}.`,
  });

  const updated = db.prepare("SELECT * FROM requests WHERE id = ?").get(req.params.id);
  res.json({ request: attachDocType(updated) });
});

module.exports = router;
