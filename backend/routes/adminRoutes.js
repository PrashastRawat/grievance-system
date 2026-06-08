const express   = require("express");
const router    = express.Router();
const axios     = require("axios");
const User      = require("../models/User");
const Complaint = require("../models/Complaint");
const Authority = require("../models/Authority");
const { protect, restrictTo } = require("../middleware/authMiddleware");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

router.use(protect);
router.use(restrictTo("admin"));

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role)   filter.role = role;
    if (search) filter.$or = [
      { name:  { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).select("-password")
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    res.json({ success: true, data: users, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id, { $set: { role } }, { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/users/:id/ban
router.patch("/users/:id/ban", async (req, res) => {
  try {
    const { ban } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id, { $set: { "reputation.isBanned": ban } }, { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/authorities
router.get("/authorities", async (req, res) => {
  try {
    const authorities = await Authority.find().populate("officerId", "name email").lean();
    res.json({ success: true, data: authorities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/stats  ← THIS is what AdminAnalytics calls
router.get("/stats", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [total, resolved, inProgress, pending, disputed, trend, byCat, byWard] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: "resolved" }),
      Complaint.countDocuments({ status: "in-progress" }),
      Complaint.countDocuments({ status: "pending" }),
      Complaint.countDocuments({ status: "disputed" }),
      Complaint.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: {
          _id:   { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),
      Complaint.aggregate([
        { $group: {
          _id:      "$category",
          total:    { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
        }},
        { $sort: { total: -1 } },
      ]),
      Complaint.aggregate([
        { $group: {
          _id:      "$ward",
          total:    { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
        }},
        { $sort: { total: -1 } },
        { $limit: 8 },
      ]),
    ]);

    res.json({ success: true, data: { total, resolved, inProgress, pending, disputed, trend, byCat, byWard } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/scorecard-stats
router.get("/scorecard-stats", async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      {
        $group: {
          _id:        { ward: "$ward", category: "$category" },
          total:      { $sum: 1 },
          resolved:   { $sum: { $cond: [{ $eq: ["$status", "resolved"]  }, 1, 0] } },
          pending:    { $sum: { $cond: [{ $in: ["$status", ["pending", "assigned"]] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
          disputed:   { $sum: { $cond: [{ $eq: ["$status", "disputed"]  }, 1, 0] } },
          avgResMs:   { $avg: { $cond: [{ $eq: ["$status", "resolved"] }, { $subtract: ["$updatedAt", "$createdAt"] }, null] } },
        },
      },
      { $match: { total: { $gte: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const data = stats.map((s) => ({
      key:              `${s._id.ward}__${s._id.category}`,
      ward:             s._id.ward     || "Unknown",
      department:       s._id.category || "Unknown",
      total:            s.total,
      resolved:         s.resolved,
      pending:          s.pending,
      inProgress:       s.inProgress,
      disputed:         s.disputed,
      completionRate:   s.total > 0 ? Math.round((s.resolved   / s.total) * 100) : 0,
      disputeRate:      s.total > 0 ? Math.round((s.disputed   / s.total) * 100) : 0,
      inProgressRate:   s.total > 0 ? Math.round((s.inProgress / s.total) * 100) : 0,
      avgResolutionDays: s.avgResMs ? parseFloat((s.avgResMs / (1000*60*60*24)).toFixed(1)) : null,
    })).sort((a, b) => b.completionRate - a.completionRate);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/weekly-report
router.get("/weekly-report", async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [total, resolved, disputed, byCat] = await Promise.all([
      Complaint.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Complaint.countDocuments({ status: "resolved", updatedAt: { $gte: sevenDaysAgo } }),
      Complaint.countDocuments({ status: "disputed", updatedAt: { $gte: sevenDaysAgo } }),
      Complaint.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const summary = {
      weeklyNew:      total,
      weeklyResolved: resolved,
      weeklyDisputed: disputed,
      topCategory:    byCat[0]?._id || "N/A",
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    };

    // Try Groq via ML service
    try {
      const mlRes = await axios.post(
        `${ML_URL}/weekly-report`,
        { stats: summary },
        { timeout: 15000 }
      );
      return res.json({ success: true, report: mlRes.data?.report, stats: summary });
    } catch {
      // ML unavailable — return just stats
      return res.json({
        success: true,
        report: `Weekly Summary: ${total} new complaints, ${resolved} resolved (${summary.resolutionRate}% rate), ${disputed} disputed. Top category: ${summary.topCategory}.`,
        stats: summary,
        aiUnavailable: true,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;