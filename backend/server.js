require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const morgan   = require("morgan");
const path     = require("path");

const authRoutes      = require("./routes/authRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const adminRoutes     = require("./routes/adminRoutes");
const publicRoutes    = require("./routes/publicRoutes");
const commentRoutes   = require("./routes/commentRoutes");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth",       authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/complaints", commentRoutes);   // comments nested under complaints
app.use("/api/admin",      adminRoutes);
app.use("/api/public",     publicRoutes);

app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date() }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || "Internal server error" });
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => { console.error("❌ MongoDB error:", err); process.exit(1); });