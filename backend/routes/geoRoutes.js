// ─── geoRoutes.js ─────────────────────────────────────────────────────────────
// Add to backend/routes/geoRoutes.js and mount in server.js:
//   const geoRoutes = require("./routes/geoRoutes");
//   app.use("/api/geo", geoRoutes);

const express = require("express");
const router = express.Router();
const Complaint = require("../models/Complaint");
const { protect } = require("../middleware/authMiddleware");

// ── GET /api/geo/nearby?lat=&lng=&radius=&status=
// Returns complaints near a coordinate (public)
router.get("/nearby", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius) || 5000; // metres, default 5km
    const status = req.query.status; // optional filter

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: "lat and lng query params required" });
    }
    if (radius > 50000) {
      return res.status(400).json({ message: "radius must be <= 50000 metres" });
    }

    const filter = {
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      },
    };
    if (status) filter.status = status;

    const complaints = await Complaint.find(filter)
      .select("title category status priority location ward createdAt submittedBy")
      .populate("submittedBy", "name")
      .limit(100);

    res.json({
      count: complaints.length,
      radius,
      center: { lat, lng },
      complaints,
    });
  } catch (err) {
    console.error("Geo nearby error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET /api/geo/bounds?swLat=&swLng=&neLat=&neLng=
// Returns complaints within a map viewport bounding box (for heatmap)
router.get("/bounds", async (req, res) => {
  try {
    const { swLat, swLng, neLat, neLng } = req.query;
    if (!swLat || !swLng || !neLat || !neLng) {
      return res.status(400).json({ message: "swLat, swLng, neLat, neLng required" });
    }

    const complaints = await Complaint.findInBounds(
      parseFloat(swLat),
      parseFloat(swLng),
      parseFloat(neLat),
      parseFloat(neLng)
    )
      .select("title category status priority location ward createdAt")
      .limit(500);

    res.json({ count: complaints.length, complaints });
  } catch (err) {
    console.error("Geo bounds error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET /api/geo/cluster?lat=&lng=&radius=
// Returns category-grouped stats for complaints near a point (for dashboard widgets)
router.get("/cluster", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = parseInt(req.query.radius) || 10000;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: "lat and lng required" });
    }

    const complaints = await Complaint.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radius,
        },
      },
    }).select("category status priority");

    // Group by category
    const byCategory = {};
    const byStatus = {};
    for (const c of complaints) {
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    }

    res.json({
      total: complaints.length,
      radius,
      center: { lat, lng },
      byCategory,
      byStatus,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;