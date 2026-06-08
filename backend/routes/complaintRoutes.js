const express   = require("express");
const axios     = require("axios");
const Complaint = require("../models/Complaint");
const User      = require("../models/User");
const Authority = require("../models/Authority");
const { protect } = require("../middleware/authMiddleware");
const upload    = require("../middleware/upload");
const {
  notifyComplaintSubmitted,
  notifyStatusUpdate,
  notifyAuthorityAssigned,
  notifyAdminDispute,
} = require("../services/emailService");

const router = express.Router();
const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

router.use(protect);

// ─── Email helpers ────────────────────────────────────────────────────────────
async function emailUser(userId, fn, ...args) {
  try {
    const u = await User.findById(userId, { email: 1 }).lean();
    if (u?.email) fn(u.email, ...args).catch(() => {});
  } catch {}
}
async function emailAuthority(authorityId, fn, ...args) {
  try {
    const auth = await Authority.findById(authorityId, { officerId: 1 }).lean();
    if (!auth?.officerId) return;
    const u = await User.findById(auth.officerId, { email: 1 }).lean();
    if (u?.email) fn(u.email, ...args).catch(() => {});
  } catch {}
}
async function emailAllAdmins(fn, ...args) {
  try {
    const admins = await User.find({ role: "admin" }, { email: 1 }).lean();
    for (const a of admins) {
      if (a.email) fn(a.email, ...args).catch(() => {});
    }
  } catch {}
}

// ─── ML helper: get predicted resolution time ────────────────────────────────
async function getPredictedTime(category, ward) {
  try {
    // Count open complaints in same ward+category
    const openComplaints = await Complaint.countDocuments({
      category,
      ward,
      status: { $in: ["pending", "assigned", "in-progress", "work-done"] },
    });
    const mlRes = await axios.post(
      `${ML_URL}/predict-time`,
      { category, ward, openComplaints },
      { timeout: 5000 }
    );
    return mlRes.data || null;
  } catch {
    return null;
  }
}

// ─── GET /api/complaints  (admin: fetch all) ───────────────────────────────────
router.get("/", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }
    const { status, category, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title:              { $regex: search, $options: "i" } },
        { description:        { $regex: search, $options: "i" } },
        { "location.address": { $regex: search, $options: "i" } },
      ];
    }
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Complaint.countDocuments(filter);
    const data  = await Complaint.find(filter)
      .populate("submittedBy", "name email")
      .populate("assignedTo",  "name email phone department")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    res.json({ success: true, complaints: data, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
});

// ─── POST /api/complaints  (submit new complaint) ──────────────────────────────
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, description, ward } = req.body;

    let locationData = null;
    if (req.body.location) {
      try {
        locationData = typeof req.body.location === "string"
          ? JSON.parse(req.body.location)
          : req.body.location;
      } catch { locationData = null; }
    }

    if (!title || !description) {
      return res.status(400).json({ success: false, message: "Title and description are required" });
    }
    if (!ward) {
      return res.status(400).json({ success: false, message: "Ward is required" });
    }

    const user = await User.findById(req.user._id);
    if (user.reputation?.isBanned) {
      return res.status(403).json({ success: false, message: "Your account is banned" });
    }

    // ── ML: classify category ─────────────────────────────────────────────────
    let category     = "Road";
    let mlConfidence = null;
    try {
      const mlRes = await axios.post(
        `${ML_URL}/predict`,
        { text: `${title} ${description}` },
        { timeout: 5000 }
      );
      if (mlRes.data?.category) {
        category     = mlRes.data.category;
        mlConfidence = mlRes.data.confidence;
      }
    } catch {
      console.warn("⚠️  ML classify unreachable, using default category");
    }

    // ── ML: predict resolution time ───────────────────────────────────────────
    let estimatedResolutionDays = null;
    let resolutionConfidence    = null;
    try {
      const timeData = await getPredictedTime(category, ward);
      if (timeData) {
        estimatedResolutionDays = timeData.estimatedDays;
        resolutionConfidence    = timeData.confidence;
      }
    } catch {
      console.warn("⚠️  ML predict-time failed");
    }

    // ── Auto-assign authority ─────────────────────────────────────────────────
    let assignedTo = null;
    try {
      assignedTo = await Authority.findOne({ department: category });
    } catch {}

    // ── Save complaint ────────────────────────────────────────────────────────
    const complaintData = {
      title:       title.trim(),
      description: description.trim(),
      ward,
      category,
      mlConfidence,
      estimatedResolutionDays,
      resolutionConfidence,
      status:      "pending",
      submittedBy: req.user._id,
      assignedTo:  assignedTo?._id || null,
      statusHistory: [{ status: "pending", changedBy: req.user._id }],
    };

    if (locationData?.coordinates) {
      complaintData.location = {
        type:        "Point",
        coordinates: locationData.coordinates,
        address:     locationData.address || "",
      };
    }
    if (req.file) {
      complaintData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const complaint = await Complaint.create(complaintData);

    if (assignedTo) {
      await Authority.findByIdAndUpdate(assignedTo._id, {
        $inc: { totalComplaintsAssigned: 1 },
      });
    }

    await complaint.populate("submittedBy", "name email");
    await complaint.populate("assignedTo",  "name email phone department");

    emailUser(req.user._id, notifyComplaintSubmitted, complaint);
    if (assignedTo) emailAuthority(assignedTo._id, notifyAuthorityAssigned, complaint);

    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    console.error("Submit complaint error:", err);
    res.status(500).json({ success: false, message: "Failed to submit complaint" });
  }
});

// ─── GET /api/complaints/mine ──────────────────────────────────────────────────
router.get("/mine", async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    const filter = { submittedBy: req.user._id };
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Complaint.countDocuments(filter);
    const data  = await Complaint.find(filter)
      .populate("submittedBy", "name email")
      .populate("assignedTo",  "name email phone department")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    res.json({ success: true, total, page: Number(page), data });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch complaints" });
  }
});

// ─── GET /api/complaints/authority/mine ───────────────────────────────────────
router.get("/authority/mine", async (req, res) => {
  try {
    if (req.user.role !== "authority" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Authority only" });
    }
    const { status, page = 1, limit = 20 } = req.query;
    const authority = await Authority.findOne({ officerId: req.user._id });
    if (!authority) return res.json({ success: true, data: [], total: 0 });

    const filter = { assignedTo: authority._id };
    if (status) filter.status = status;
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Complaint.countDocuments(filter);
    const data  = await Complaint.find(filter)
      .populate("submittedBy", "name email")
      .populate("assignedTo",  "name department ward")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    res.json({ success: true, data, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch complaints" });
  }
});

// ─── GET /api/complaints/stats/authority/:authorityId ─────────────────────────
router.get("/stats/authority/:authorityId", async (req, res) => {
  try {
    const authority = await Authority.findById(req.params.authorityId);
    if (!authority) return res.status(404).json({ success: false, message: "Authority not found" });
    const complaints = await Complaint.find({ assignedTo: req.params.authorityId });
    const completed  = complaints.filter(c => c.finalStatus === "resolved").length;
    const pending    = complaints.filter(c => ["pending", "in-progress"].includes(c.status)).length;
    const disputed   = complaints.filter(c => c.status === "disputed").length;
    res.json({
      success: true,
      data: {
        name: authority.name, totalAssigned: complaints.length,
        completed, pending, disputed,
        completionRate: authority.completionRate,
        disputeRate: authority.disputeRate,
        avgCompletionDays: authority.avgCompletionDays,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Stats fetch failed" });
  }
});

// ─── GET /api/complaints/:id ───────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("submittedBy", "name email")
      .populate("assignedTo",  "name email phone department completionRate disputeRate");
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
    if (
      req.user.role !== "admin" &&
      req.user.role !== "authority" &&
      String(complaint.submittedBy._id) !== String(req.user._id)
    ) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    res.json({ success: true, data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch complaint" });
  }
});

// ─── PATCH /api/complaints/:id/status ─────────────────────────────────────────
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending","assigned","in-progress","work-done","resolved","disputed","rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }
    if (req.user.role !== "admin" && req.user.role !== "authority") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    ).populate("submittedBy", "name email");
    if (!complaint) return res.status(404).json({ success: false, message: "Not found" });
    if (complaint.submittedBy?.email) {
      notifyStatusUpdate(complaint.submittedBy.email, complaint, status).catch(() => {});
    }
    res.json({ success: true, data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/complaints/:id/work-proof ──────────────────────────────────────
router.post("/:id/work-proof", upload.array("images", 5), async (req, res) => {
  try {
    if (req.user.role !== "authority" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only authorities can upload work proof" });
    }
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
    const imageUrls = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    complaint.workProof = {
      description: req.body.description || "Work completed",
      images:      imageUrls,
      uploadedBy:  req.user._id,
      uploadedAt:  new Date(),
    };
    complaint.status = "work-done";
    complaint.statusHistory.push({ status: "work-done", changedBy: req.user._id, changedAt: new Date() });
    await complaint.save();
    emailUser(complaint.submittedBy, notifyStatusUpdate, complaint, "work-done");
    res.json({ success: true, message: "Work proof uploaded", data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// ─── POST /api/complaints/:id/confirm ─────────────────────────────────────────
router.post("/:id/confirm", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
    if (String(complaint.submittedBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only complaint filer can confirm" });
    }
    await Complaint.findByIdAndUpdate(req.params.id, {
      $set: { finalStatus: "resolved", resolvedAt: new Date(), status: "resolved" }
    });
    if (complaint.assignedTo) {
      const authority = await Authority.findById(complaint.assignedTo);
      if (authority) {
        authority.totalCompleted = (authority.totalCompleted || 0) + 1;
        const daysToComplete = Math.floor(
          (new Date() - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24)
        );
        authority.avgCompletionDays = Math.round(
          ((authority.avgCompletionDays || 0) * (authority.totalCompleted - 1) + daysToComplete) /
          authority.totalCompleted
        );
        await authority.save();
      }
    }
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "reputation.validComplaintCount": 1 },
    });
    res.json({ success: true, message: "Complaint marked as resolved" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Confirmation failed" });
  }
});

// ─── POST /api/complaints/:id/dispute ─────────────────────────────────────────
router.post("/:id/dispute", async (req, res) => {
  try {
    const { reason } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
    const isOwner     = String(complaint.submittedBy._id) === String(req.user._id);
    const isAuthority = req.user.role === "authority" || req.user.role === "admin";
    if (!isOwner && !isAuthority) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    complaint.disputes.push({
      raisedBy: req.user._id,
      raisedByRole: isOwner ? "user" : "authority",
      reason,
    });
    complaint.status = "disputed";
    complaint.statusHistory.push({ status: "disputed", changedBy: req.user._id, changedAt: new Date() });
    if (isOwner) {
      const user = await User.findById(req.user._id);
      if (user.reputation) {
        user.reputation.disputedCount = (user.reputation.disputedCount || 0) + 1;
        if (typeof user.checkAndApplyBan === "function") user.checkAndApplyBan();
        await user.save();
        if (user.reputation.isBanned) {
          await complaint.save();
          return res.status(403).json({ success: false, message: "Your account has been banned due to repeated false dispute claims" });
        }
      }
    }
    if (complaint.assignedTo) {
      await Authority.findByIdAndUpdate(complaint.assignedTo, { $inc: { totalDisputed: 1 } });
    }
    await complaint.save();
    emailAllAdmins(notifyAdminDispute, complaint, reason);
    res.json({ success: true, message: "Dispute raised. Admin will review", data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: "Dispute failed" });
  }
});

// ─── PATCH /api/complaints/:id/resolve-dispute ────────────────────────────────
router.patch("/:id/resolve-dispute", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin only" });
    }
    const { decision } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: "Not found" });
    const lastDispute = complaint.disputes
      .filter(d => d.status === "pending")
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (lastDispute) {
      lastDispute.status     = decision === "resolved" ? "resolved" : "rejected";
      lastDispute.resolvedBy = req.user._id;
      lastDispute.resolvedAt = new Date();
    }
    complaint.finalStatus = decision;
    complaint.resolvedAt  = new Date();
    complaint.status      = decision === "resolved" ? "resolved" : "pending";
    complaint.statusHistory.push({ status: complaint.status, changedBy: req.user._id, changedAt: new Date() });
    await complaint.save();
    emailUser(complaint.submittedBy, notifyStatusUpdate, complaint, complaint.status);
    res.json({ success: true, message: `Dispute resolved: ${decision}`, data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: "Resolution failed" });
  }
});

module.exports = router;