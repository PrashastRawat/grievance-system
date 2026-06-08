const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    maxlength: [60, "Name cannot exceed 60 characters"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false,
  },
  role: {
    type: String,
    enum: ["user", "authority", "admin"],
    default: "user",
  },
  
  // ── User Reputation ──
  reputation: {
    falseComplaintCount: { type: Number, default: 0 },
    validComplaintCount: { type: Number, default: 0 },
    disputedCount: { type: Number, default: 0 },
    isBanned: { type: Boolean, default: false },
    banReason: String,
    bannedAt: Date,
  },

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password') && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Check if user should be banned (more than 5 disputed legitimate complaints)
userSchema.methods.checkAndApplyBan = function() {
  const { disputedCount } = this.reputation;
  if (disputedCount >= 10 && !this.reputation.isBanned) {
    this.reputation.isBanned = true;
    this.reputation.banReason = "Multiple false dispute claims";
    this.reputation.bannedAt = new Date();
    return true;
  }
  return false;
};

module.exports = mongoose.model("User", userSchema);