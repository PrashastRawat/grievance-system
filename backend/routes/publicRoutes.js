const express   = require("express");
const router    = express.Router();
const axios     = require("axios");
const Complaint = require("../models/Complaint");
const Authority = require("../models/Authority");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// GET /api/public/stats
router.get("/stats", async (req, res) => {
  try {
    const [total, resolved, inProgress, pending, disputed] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: "resolved" }),
      Complaint.countDocuments({ status: "in-progress" }),
      Complaint.countDocuments({ status: "pending" }),
      Complaint.countDocuments({ status: "disputed" }),
    ]);
    const assigned = await Complaint.countDocuments({ status: "assigned" });
    const workDone = await Complaint.countDocuments({ status: "work-done" });
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const resolvedComplaints = await Complaint.find({ status: "resolved" }, { createdAt: 1, updatedAt: 1 }).lean();
    let avgResolutionDays = null;
    if (resolvedComplaints.length > 0) {
      const totalMs = resolvedComplaints.reduce((sum, c) => sum + (new Date(c.updatedAt) - new Date(c.createdAt)), 0);
      avgResolutionDays = (totalMs / resolvedComplaints.length / (1000 * 60 * 60 * 24)).toFixed(1);
    }
    res.json({ total, resolved, inProgress, pending, assigned, workDone, disputed, resolutionRate, avgResolutionDays });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/by-category
router.get("/by-category", async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $group: {
        _id: "$category",
        total:    { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
        pending:  { $sum: { $cond: [{ $in: ["$status", ["pending", "assigned"]] }, 1, 0] } },
      }},
      { $sort: { total: -1 } },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/by-ward
router.get("/by-ward", async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $group: {
        _id: "$ward",
        total:    { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
      }},
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/by-status
router.get("/by-status", async (req, res) => {
  try {
    const data = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/trend
router.get("/trend", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const data = await Complaint.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id:      { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count:    { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } },
    ]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/top-authorities
router.get("/top-authorities", async (req, res) => {
  try {
    const authorities = await Authority.find({}, { ward: 1, department: 1, stats: 1 }).lean();
    const withRates = authorities
      .map((a) => {
        const total    = a.stats?.totalAssigned || 0;
        const resolved = a.stats?.totalResolved || 0;
        const rate     = total > 0 ? Math.round((resolved / total) * 100) : 0;
        return { ward: a.ward, department: a.department, total, resolved, rate };
      })
      .filter((a) => a.total > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 8);
    res.json(withRates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/recent
router.get("/recent", async (req, res) => {
  try {
    const complaints = await Complaint.find(
      { status: "resolved" },
      { title: 1, category: 1, ward: 1, status: 1, createdAt: 1, updatedAt: 1 }
    ).sort({ updatedAt: -1 }).limit(10).lean();
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/geo-points
router.get("/geo-points", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ACTIVE_STATUSES = ["pending", "assigned", "in-progress", "work-done", "disputed"];
    const complaints = await Complaint.find(
      {
        "location.coordinates": { $exists: true },
        $or: [
          { status: { $in: ACTIVE_STATUSES } },
          { status: "resolved", updatedAt: { $gte: thirtyDaysAgo } },
        ],
      },
      { title: 1, category: 1, status: 1, ward: 1, "location.coordinates": 1 }
    ).limit(500).lean();
    const points = complaints.map((c) => ({
      lat: c.location.coordinates[1], lng: c.location.coordinates[0],
      title: c.title, category: c.category, status: c.status, ward: c.ward,
    }));
    res.json(points);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/check-duplicate
router.get("/check-duplicate", async (req, res) => {
  try {
    const { category, ward, text } = req.query;
    if (!category || !ward) return res.json({ existing: null });
    const ACTIVE_STATUSES = ["pending", "assigned", "in-progress", "work-done", "disputed"];
    const existing = await Complaint.find(
      { category, ward, status: { $in: ACTIVE_STATUSES } },
      { title: 1, description: 1, category: 1, ward: 1, status: 1 }
    ).limit(20).lean();
    if (!existing.length) return res.json({ existing: null, aiChecked: false });
    if (text && text.trim().length > 10) {
      try {
        const existingTexts = existing.map(c => `${c.title} ${c.description}`);
        const aiRes = await axios.post(
          `${ML_URL}/check-duplicate-ai`,
          { text: text.trim(), existing: existingTexts },
          { timeout: 6000 }
        );
        if (aiRes.data?.isDuplicate) {
          const matchIndex = existingTexts.indexOf(aiRes.data.matchedWith);
          const matchedComplaint = matchIndex >= 0 ? existing[matchIndex] : existing[0];
          return res.json({ existing: matchedComplaint, aiChecked: true, similarityScore: aiRes.data.similarityScore });
        }
        return res.json({ existing: null, aiChecked: true });
      } catch {}
    }
    res.json({ existing: existing[0] || null, aiChecked: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/public/ward-health ───────────────────────────────────────────────
// Aggregates ward stats from MongoDB, sends to ML service for scoring
router.get("/ward-health", async (req, res) => {
  try {
    // Aggregate per-ward stats from complaints
    const wardStats = await Complaint.aggregate([
      {
        $group: {
          _id:      "$ward",
          total:    { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq:  ["$status", "resolved"]  }, 1, 0] } },
          pending:  { $sum: { $cond: [{ $in:  ["$status", ["pending", "assigned"]] }, 1, 0] } },
          disputed: { $sum: { $cond: [{ $eq:  ["$status", "disputed"]  }, 1, 0] } },
        },
      },
      { $match: { total: { $gte: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 20 },
    ]);

    if (!wardStats.length) return res.json([]);

    // Compute avg resolution days per ward
    const wardDays = await Complaint.aggregate([
      { $match: { status: "resolved" } },
      {
        $group: {
          _id: "$ward",
          avgMs: { $avg: { $subtract: ["$updatedAt", "$createdAt"] } },
        },
      },
    ]);
    const daysMap = {};
    for (const w of wardDays) {
      daysMap[w._id] = parseFloat((w.avgMs / (1000 * 60 * 60 * 24)).toFixed(1));
    }

    // Build payload for ML service
    const payload = wardStats.map((w) => ({
      ward:     w._id || "Unknown",
      total:    w.total,
      resolved: w.resolved,
      pending:  w.pending,
      disputed: w.disputed,
      avgDays:  daysMap[w._id] || null,
    }));

    // Call ML service
    const mlRes = await axios.post(
      `${ML_URL}/ward-health`,
      { wards: payload },
      { timeout: 8000 }
    );

    res.json(mlRes.data || []);
  } catch (err) {
    console.error("Ward health error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;