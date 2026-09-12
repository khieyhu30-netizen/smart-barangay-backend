const express = require("express");
const db = require("../db/database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Summary counts by status, volume by document type, and rough avg processing time
router.get("/summary", requireAuth, requireRole("staff", "admin"), (req, res) => {
  const byStatus = db
    .prepare(`SELECT status, COUNT(*) as count FROM requests GROUP BY status`)
    .all();

  const byDocumentType = db
    .prepare(
      `SELECT dt.name as document_type, COUNT(r.id) as count
       FROM requests r
       JOIN document_types dt ON dt.id = r.document_type_id
       GROUP BY dt.name
       ORDER BY count DESC`
    )
    .all();

  const totals = db.prepare(`SELECT COUNT(*) as total FROM requests`).get();

  const last7Days = db
    .prepare(
      `SELECT date(created_at) as day, COUNT(*) as count
       FROM requests
       WHERE created_at >= datetime('now', '-7 days')
       GROUP BY day
       ORDER BY day ASC`
    )
    .all();

  // Average time (hours) from creation to Released, for released requests
  const avgProcessing = db
    .prepare(
      `SELECT AVG(
         (julianday(updated_at) - julianday(created_at)) * 24
       ) as avg_hours
       FROM requests WHERE status = 'Released'`
    )
    .get();

  res.json({
    total: totals.total,
    byStatus,
    byDocumentType,
    last7Days,
    avgProcessingHours: avgProcessing.avg_hours ? Number(avgProcessing.avg_hours.toFixed(1)) : null,
  });
});

module.exports = router;
