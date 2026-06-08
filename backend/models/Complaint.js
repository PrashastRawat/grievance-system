const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema({
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  raisedByRole: { type: String, enum: ["user", "authority"], required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["pending", "resolved", "rejected"], default: "pending" },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolvedAt: Date,
  adminNote: String,
  createdAt: { type: Date, default: Date.now },
});

const workProofSchema = new mongoose.Schema({
  description: { type: String, required: true },
  images: [{ type: String }], // file paths or URLs
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  uploadedAt: { type: Date, default: Date.now },
});

// ─── GeoJSON Point Schema ─────────────────────────────────────────────────────
const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: (v) =>
          Array.isArray(v) &&
          v.length === 2 &&
          v[0] >= -180 && v[0] <= 180 &&
          v[1] >= -90  && v[1] <= 90,
        message: "Invalid coordinates: [longitude, latitude] expected",
      },
    },
    address: { type: String, default: "" },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "in-progress",
        "work-done",
        "resolved",
        "disputed",
        "rejected",
      ],
      default: "pending",
    },
    finalStatus: {
      type: String,
      enum: ["resolved", "rejected", null],
      default: null,
    },

    // ── Location ───────────────────────────────────────────────────────────────
    location: {
      type: locationSchema,
      required: false,
    },

    // Legacy text field kept for backward compatibility
    ward: { type: String, required: true, trim: true },
    address: { type: String, trim: true }, // deprecated — use location.address

    // ── Relations ──────────────────────────────────────────────────────────────
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Authority",
    },

    // ── Work Proof ─────────────────────────────────────────────────────────────
    workProof: workProofSchema,

    // ── Disputes ───────────────────────────────────────────────────────────────
    disputes: [disputeSchema],

    // ── Timestamps ─────────────────────────────────────────────────────────────
    assignedAt: Date,
    resolvedAt: Date,
    confirmedAt: Date,
  },
  { timestamps: true }
);

// ── Geospatial Index ───────────────────────────────────────────────────────────
// Enables $near, $geoWithin, and $geoIntersects queries
complaintSchema.index({ "location": "2dsphere" });

// ── Virtual: coordinates helper ────────────────────────────────────────────────
complaintSchema.virtual("coords").get(function () {
  if (!this.location?.coordinates?.length) return null;
  const [lng, lat] = this.location.coordinates;
  return { lat, lng, address: this.location.address };
});

// ── Static: find complaints near a point ──────────────────────────────────────
complaintSchema.statics.findNear = function (lat, lng, radiusMeters = 5000) {
  return this.find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radiusMeters,
      },
    },
  });
};

// ── Static: find complaints within a bounding box ─────────────────────────────
complaintSchema.statics.findInBounds = function (swLat, swLng, neLat, neLng) {
  return this.find({
    location: {
      $geoWithin: {
        $box: [
          [swLng, swLat],
          [neLng, neLat],
        ],
      },
    },
  });
};

module.exports = mongoose.model("Complaint", complaintSchema);