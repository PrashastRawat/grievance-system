const mongoose = require("mongoose");
const Authority = require("./models/Authority");
require("dotenv").config();

const authorities = [
  // ── Dehradun Wards ──────────────────────────────────────────────────────────
  {
    name: "Dehradun Road & Infrastructure Dept",
    email: "road.dehradun@gov.in",
    phone: "0135-2710001",
    ward: "Rajpur Road",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Road",
    officerName: "Ramesh Kumar",
    isActive: true,
  },
  {
    name: "Dehradun Jal Sansthan",
    email: "water.dehradun@gov.in",
    phone: "0135-2710002",
    ward: "Rajpur Road",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Water",
    officerName: "Suresh Negi",
    isActive: true,
  },
  {
    name: "UPCL Dehradun Division",
    email: "electricity.dehradun@gov.in",
    phone: "0135-2710003",
    ward: "Rajpur Road",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Electricity",
    officerName: "Mohan Singh",
    isActive: true,
  },
  {
    name: "Dehradun Sanitation Dept",
    email: "sanitation.dehradun@gov.in",
    phone: "0135-2710004",
    ward: "Rajpur Road",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Sanitation",
    officerName: "Anita Rawat",
    isActive: true,
  },
  // ── Patel Nagar ─────────────────────────────────────────────────────────────
  {
    name: "Patel Nagar Road Dept",
    email: "road.patelnagar@gov.in",
    phone: "0135-2710011",
    ward: "Patel Nagar",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Road",
    officerName: "Vijay Bhatt",
    isActive: true,
  },
  {
    name: "Patel Nagar Water Dept",
    email: "water.patelnagar@gov.in",
    phone: "0135-2710012",
    ward: "Patel Nagar",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Water",
    officerName: "Kavita Sharma",
    isActive: true,
  },
  {
    name: "Patel Nagar Electricity Dept",
    email: "electricity.patelnagar@gov.in",
    phone: "0135-2710013",
    ward: "Patel Nagar",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Electricity",
    officerName: "Deepak Joshi",
    isActive: true,
  },
  {
    name: "Patel Nagar Sanitation Dept",
    email: "sanitation.patelnagar@gov.in",
    phone: "0135-2710014",
    ward: "Patel Nagar",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Sanitation",
    officerName: "Rekha Bisht",
    isActive: true,
  },
  // ── Dalanwala ────────────────────────────────────────────────────────────────
  {
    name: "Dalanwala Road Dept",
    email: "road.dalanwala@gov.in",
    phone: "0135-2710021",
    ward: "Dalanwala",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Road",
    officerName: "Harish Panwar",
    isActive: true,
  },
  {
    name: "Dalanwala Water Dept",
    email: "water.dalanwala@gov.in",
    phone: "0135-2710022",
    ward: "Dalanwala",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Water",
    officerName: "Sunita Chauhan",
    isActive: true,
  },
  // ── Catch-all fallback for any unrecognised ward ───────────────────────────
  {
    name: "DMC General Road Dept",
    email: "road.general@gov.in",
    phone: "0135-2710099",
    ward: "Unknown Area",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Road",
    officerName: "General Officer",
    isActive: true,
  },
  {
    name: "DMC General Water Dept",
    email: "water.general@gov.in",
    phone: "0135-2710098",
    ward: "Unknown Area",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Water",
    officerName: "General Officer",
    isActive: true,
  },
  {
    name: "DMC General Electricity Dept",
    email: "electricity.general@gov.in",
    phone: "0135-2710097",
    ward: "Unknown Area",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Electricity",
    officerName: "General Officer",
    isActive: true,
  },
  {
    name: "DMC General Sanitation Dept",
    email: "sanitation.general@gov.in",
    phone: "0135-2710096",
    ward: "Unknown Area",
    municipality: "Dehradun Municipal Corporation",
    district: "Dehradun",
    state: "Uttarakhand",
    department: "Sanitation",
    officerName: "General Officer",
    isActive: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/grievance_system");
    console.log("✅ MongoDB connected");

    await Authority.deleteMany({});
    console.log("🗑️  Cleared existing authorities");

    const inserted = await Authority.insertMany(authorities);
    console.log(`✅ Inserted ${inserted.length} authorities`);

    // Print summary
    const byWard = {};
    inserted.forEach(a => {
      byWard[a.ward] = byWard[a.ward] || [];
      byWard[a.ward].push(`${a.department}`);
    });
    console.log("\n📋 Authorities by ward:");
    Object.entries(byWard).forEach(([ward, depts]) => {
      console.log(`  ${ward}: ${depts.join(", ")}`);
    });

    console.log("\n🎉 Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seed();