const mongoose = require("mongoose");

const authoritySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Authority name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
  },
  phone: String,
  website: String,
  
  // Area it covers
  ward: String,
  municipality: String,
  district: String,
  state: String,
  
  // Department
  department: {
    type: String,
    enum: ["Road", "Water", "Electricity", "Sanitation", "Public Safety", "Street Lights", "Other"],
  },
  
  // Officer assigned
  officerName: String,
  officerId: mongoose.Schema.Types.ObjectId,
  
  // Reputation
  totalComplaintsAssigned: { type: Number, default: 0 },
  totalCompleted: { type: Number, default: 0 },
  totalDisputed: { type: Number, default: 0 },
  avgCompletionDays: { type: Number, default: 0 },
  
  isActive: { type: Boolean, default: true },
  
}, { timestamps: true });

// Calculated field
authoritySchema.virtual("completionRate").get(function() {
  if (this.totalComplaintsAssigned === 0) return 0;
  return Math.round((this.totalCompleted / this.totalComplaintsAssigned) * 100);
});

authoritySchema.virtual("disputeRate").get(function() {
  if (this.totalComplaintsAssigned === 0) return 0;
  return Math.round((this.totalDisputed / this.totalComplaintsAssigned) * 100);
});

module.exports = mongoose.model("Authority", authoritySchema);