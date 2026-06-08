const nodemailer = require("nodemailer");

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    console.log("📧 Email: using configured SMTP");
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email", port: 587, secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log("📧 Email: using Ethereal →", testAccount.user);
    console.log("📧 Preview emails at: https://ethereal.email");
  }
  return transporter;
}

const FROM    = process.env.EMAIL_FROM || '"GrievanceHub" <no-reply@grievancehub.in>';
const APP_URL = process.env.APP_URL    || "http://localhost:3000";

async function sendMail({ to, subject, html }) {
  try {
    const t    = await getTransporter();
    const info = await t.sendMail({ from: FROM, to, subject, html });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log(`📧 Email preview: ${preview}`);
    return { success: true, messageId: info.messageId, preview };
  } catch (err) {
    console.error("📧 Email send error:", err.message);
    return { success: false, error: err.message };
  }
}

function baseTemplate(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6f9;margin:0;padding:0}
    .wrapper{max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
    .header{background:linear-gradient(135deg,#1a56db 0%,#0e9f6e 100%);padding:32px 40px;color:#fff}
    .header h1{margin:0;font-size:22px;font-weight:700}
    .header p{margin:4px 0 0;opacity:.85;font-size:13px}
    .body{padding:32px 40px;color:#374151;line-height:1.6}
    .body h2{font-size:18px;margin:0 0 12px;color:#111827}
    .body p{margin:0 0 16px}
    .badge{display:inline-block;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;letter-spacing:.5px}
    .badge-pending{background:#fef3c7;color:#92400e}
    .badge-assigned{background:#dbeafe;color:#1e40af}
    .badge-in-progress{background:#e0e7ff;color:#3730a3}
    .badge-work-done{background:#d1fae5;color:#065f46}
    .badge-resolved{background:#bbf7d0;color:#14532d}
    .badge-disputed{background:#fee2e2;color:#991b1b}
    .badge-rejected{background:#f3f4f6;color:#374151}
    .info-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:16px 0}
    .info-box table{width:100%;border-collapse:collapse}
    .info-box td{padding:4px 0;font-size:14px}
    .info-box td:first-child{color:#6b7280;width:120px;font-weight:500}
    .btn{display:inline-block;background:#1a56db;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:8px}
    .footer{padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center}
  </style></head><body>
  <div class="wrapper">
    <div class="header"><h1>🏛️ GrievanceHub</h1><p>Dehradun Municipal Grievance System</p></div>
    <div class="body">${content}</div>
    <div class="footer">This is an automated message. Do not reply.<br/>GrievanceHub · Dehradun, Uttarakhand</div>
  </div></body></html>`;
}

function statusBadge(status) {
  return `<span class="badge badge-${status}">${status.toUpperCase()}</span>`;
}

// ── Welcome email ─────────────────────────────────────────────────────────────
async function notifyWelcome(userEmail, name, role) {
  const subject = `👋 Welcome to GrievanceHub, ${name}!`;
  const roleMsg = role === "authority"
    ? "Your authority account is being reviewed by an admin. You'll be able to manage complaints once activated."
    : "You can now submit complaints, track their status, and help make Dehradun better.";

  const html = baseTemplate(`
    <h2>Welcome, ${name}! 🎉</h2>
    <p>${roleMsg}</p>
    <div class="info-box">
      <table>
        <tr><td>Name</td><td><strong>${name}</strong></td></tr>
        <tr><td>Email</td><td>${userEmail}</td></tr>
        <tr><td>Role</td><td><strong style="text-transform:capitalize">${role}</strong></td></tr>
      </table>
    </div>
    ${role === "user" ? `<a class="btn" href="${APP_URL}/submit">Submit Your First Complaint</a>` : ""}
    ${role === "authority" ? `<a class="btn" href="${APP_URL}/authority">Go to Authority Dashboard</a>` : ""}
  `);
  return sendMail({ to: userEmail, subject, html });
}

// ── Complaint submitted ───────────────────────────────────────────────────────
async function notifyComplaintSubmitted(userEmail, complaint) {
  const subject = `✅ Complaint Received — #${complaint._id.toString().slice(-6).toUpperCase()}`;
  const html = baseTemplate(`
    <h2>Your complaint has been received!</h2>
    <p>We've logged your complaint and it will be assigned to the relevant authority shortly.</p>
    <div class="info-box">
      <table>
        <tr><td>ID</td><td><strong>#${complaint._id.toString().slice(-6).toUpperCase()}</strong></td></tr>
        <tr><td>Title</td><td>${complaint.title}</td></tr>
        <tr><td>Category</td><td>${complaint.category}</td></tr>
        <tr><td>Ward</td><td>${complaint.ward || "Detecting…"}</td></tr>
        <tr><td>Status</td><td>${statusBadge("pending")}</td></tr>
        <tr><td>Submitted</td><td>${new Date(complaint.createdAt).toLocaleString("en-IN")}</td></tr>
      </table>
    </div>
    <a class="btn" href="${APP_URL}/complaints/${complaint._id}">Track Your Complaint</a>
  `);
  return sendMail({ to: userEmail, subject, html });
}

// ── Status update ─────────────────────────────────────────────────────────────
async function notifyStatusUpdate(userEmail, complaint, newStatus) {
  const messages = {
    assigned:      "Your complaint has been assigned to the concerned authority.",
    "in-progress": "The authority has started working on your complaint.",
    "work-done":   "The authority has marked the work as done. Please review and confirm or dispute.",
    resolved:      "Your complaint has been marked as resolved. Thank you for your patience!",
    disputed:      "Your dispute has been recorded. An admin will review it shortly.",
    rejected:      "Your complaint has been reviewed and rejected by the admin.",
  };
  const subject = `📋 Complaint Update — Status: ${newStatus.toUpperCase()}`;
  const html = baseTemplate(`
    <h2>Complaint Status Updated</h2>
    <p>${messages[newStatus] || "Your complaint status has been updated."}</p>
    <div class="info-box">
      <table>
        <tr><td>ID</td><td><strong>#${complaint._id.toString().slice(-6).toUpperCase()}</strong></td></tr>
        <tr><td>Title</td><td>${complaint.title}</td></tr>
        <tr><td>New Status</td><td>${statusBadge(newStatus)}</td></tr>
        <tr><td>Updated</td><td>${new Date().toLocaleString("en-IN")}</td></tr>
      </table>
    </div>
    ${newStatus === "work-done" ? "<p><strong>Action required:</strong> Please confirm or dispute within 7 days.</p>" : ""}
    <a class="btn" href="${APP_URL}/complaints/${complaint._id}">View Complaint</a>
  `);
  return sendMail({ to: userEmail, subject, html });
}

// ── Authority assigned ────────────────────────────────────────────────────────
async function notifyAuthorityAssigned(authorityEmail, complaint) {
  const subject = `🔔 New Complaint Assigned — ${complaint.category} in ${complaint.ward}`;
  const html = baseTemplate(`
    <h2>A new complaint has been assigned to you</h2>
    <div class="info-box">
      <table>
        <tr><td>ID</td><td><strong>#${complaint._id.toString().slice(-6).toUpperCase()}</strong></td></tr>
        <tr><td>Title</td><td>${complaint.title}</td></tr>
        <tr><td>Category</td><td>${complaint.category}</td></tr>
        <tr><td>Ward</td><td>${complaint.ward}</td></tr>
        <tr><td>Priority</td><td>${complaint.priority || "medium"}</td></tr>
        <tr><td>Submitted</td><td>${new Date(complaint.createdAt).toLocaleString("en-IN")}</td></tr>
      </table>
    </div>
    <a class="btn" href="${APP_URL}/authority/complaints/${complaint._id}">View & Take Action</a>
  `);
  return sendMail({ to: authorityEmail, subject, html });
}

// ── Dispute raised ────────────────────────────────────────────────────────────
async function notifyAdminDispute(adminEmail, complaint, reason) {
  const subject = `⚠️ Dispute Raised — Complaint #${complaint._id.toString().slice(-6).toUpperCase()}`;
  const html = baseTemplate(`
    <h2>A user has raised a dispute</h2>
    <div class="info-box">
      <table>
        <tr><td>ID</td><td><strong>#${complaint._id.toString().slice(-6).toUpperCase()}</strong></td></tr>
        <tr><td>Title</td><td>${complaint.title}</td></tr>
        <tr><td>Category</td><td>${complaint.category}</td></tr>
        <tr><td>Ward</td><td>${complaint.ward}</td></tr>
        <tr><td>Dispute Reason</td><td>${reason || "No reason provided"}</td></tr>
        <tr><td>Disputed At</td><td>${new Date().toLocaleString("en-IN")}</td></tr>
      </table>
    </div>
    <a class="btn" href="${APP_URL}/admin/disputes">Review Dispute</a>
  `);
  return sendMail({ to: adminEmail, subject, html });
}

module.exports = {
  notifyWelcome,
  notifyComplaintSubmitted,
  notifyStatusUpdate,
  notifyAuthorityAssigned,
  notifyAdminDispute,
};