export const CATEGORIES = ["Road", "Water", "Electricity", "Sanitation"];
export const STATUSES = ["Pending", "In Progress", "Resolved"];
export const CAT_META = {
  Road:        { bg: "#FFF7ED", color: "#9A3412", icon: "🚧", dot: "#F97316" },
  Water:       { bg: "#EFF6FF", color: "#1E40AF", icon: "💧", dot: "#3B82F6" },
  Electricity: { bg: "#FEFCE8", color: "#854D0E", icon: "⚡", dot: "#EAB308" },
  Sanitation:  { bg: "#F0FDF4", color: "#166534", icon: "🧹", dot: "#22C55E" },
};
export const STATUS_META = {
  Pending:         { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  "In Progress":   { bg: "#EFF6FF", color: "#1E40AF", dot: "#3B82F6" },
  Resolved:        { bg: "#F0FDF4", color: "#166534", dot: "#22C55E" },
};
export const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
export const ML_BASE  = process.env.REACT_APP_ML_URL  || "http://localhost:8000";
export const PRIORITY_LEVELS = ["low", "medium", "high", "urgent"];