const express   = require("express");
const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const User      = require("../models/User");
const Authority = require("../models/Authority");
const { protect } = require("../middleware/authMiddleware");
const { notifyWelcome } = require("../services/emailService");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, ward, department } = req.body;
    console.log(`[REGISTER] Email: ${email}, Role: ${role}`);

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Name, email and password are required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, message: "Email already registered" });

    const assignedRole = role === "authority" ? "authority" : "user";
    const hashed = await bcrypt.hash(password, 10);
    console.log(`[REGISTER] Hashed password: ${hashed.substring(0, 30)}...`);
    
    const user = await User.create({ name, email, password: hashed, role: assignedRole });
    console.log(`[REGISTER] ✅ User created: ${user._id}`);

    if (assignedRole === "authority" && ward && department) {
      let authority = await Authority.findOne({ ward, department });
      if (authority) {
        authority.officerId = user._id;
        authority.email     = email;
        authority.name      = name;
        await authority.save();
        console.log(`[REGISTER] ✅ Authority linked`);
      } else {
        await Authority.create({
          name, email, ward, department, officerId: user._id,
          stats: { totalAssigned: 0, totalResolved: 0 },
        });
        console.log(`[REGISTER] ✅ Authority created`);
      }
    }

    notifyWelcome(email, name, assignedRole).catch(() => {});

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true, token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[REGISTER] ❌ Error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`[LOGIN] Attempting: ${email}`);
    
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const user = await User.findOne({ email }).select("+password");
    console.log(`[LOGIN] User found: ${!!user}`);
    if (!user) {
      console.log(`[LOGIN] ❌ User not found`);
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    console.log(`[LOGIN] User password field: ${!!user.password}`);
    console.log(`[LOGIN] Stored hash: ${user.password ? user.password.substring(0, 30) : "NONE"}...`);
    console.log(`[LOGIN] Incoming password: ${password}`);
    
    const match = await bcrypt.compare(password, user.password);
    console.log(`[LOGIN] Password match: ${match}`);
    
    if (!match) {
      console.log(`[LOGIN] ❌ Password mismatch`);
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.reputation?.isBanned)
      return res.status(403).json({ success: false, message: "Your account has been banned" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`[LOGIN] ✅ Login successful: ${user._id}`);
    res.json({
      success: true, token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[LOGIN] ❌ Error:", err.message);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
});

module.exports = router;