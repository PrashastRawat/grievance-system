const express   = require("express");
const router    = express.Router();
const axios     = require("axios");
const Complaint = require("../models/Complaint");
const { protect } = require("../middleware/authMiddleware");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

router.use(protect);

// GET /api/complaints/:id/comments
router.get("/:id/comments", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("comments.author", "name role")
      .lean();
    if (!complaint) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: complaint.comments || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/complaints/:id/comments
router.post("/:id/comments", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: "Comment text required" });

    // ── Sentiment analysis (fire before saving) ────────────────────────────
    let sentiment      = null;
    let flaggedForAdmin = false;
    try {
      const sentRes = await axios.post(
        `${ML_URL}/sentiment`,
        { text: text.trim() },
        { timeout: 5000 }
      );
      sentiment       = sentRes.data?.label || null;      // "POSITIVE" | "NEGATIVE"
      flaggedForAdmin = sentRes.data?.flagged || false;   // true if frustrated citizen
    } catch {
      // Non-critical — comment still saves
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            text:           text.trim(),
            author:         req.user._id,
            authorRole:     req.user.role,
            sentiment,
            flaggedForAdmin,
            createdAt:      new Date(),
          },
        },
      },
      { new: true }
    ).populate("comments.author", "name role");

    if (!complaint) return res.status(404).json({ success: false, message: "Not found" });

    const newComment = complaint.comments[complaint.comments.length - 1];
    res.status(201).json({ success: true, data: newComment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;