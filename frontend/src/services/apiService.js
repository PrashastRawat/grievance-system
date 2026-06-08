import axios from "axios";
import { API_BASE } from "../utils/constants";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login    = (data) => api.post("/auth/login", data);
export const register = (data) => api.post("/auth/register", data);
export const getMe    = ()     => api.get("/auth/me");

// ── Complaints ────────────────────────────────────────────────────────────────
export const getComplaints   = (params) => api.get("/complaints", { params });
export const getMyComplaints = (params) => api.get("/complaints/mine", { params });
export const submitComplaint = (data)   => api.post("/complaints", data, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const getComplaintById = (id)         => api.get(`/complaints/${id}`);
export const updateStatus     = (id, status) => api.patch(`/complaints/${id}/status`, { status });

// ── Work Proof ────────────────────────────────────────────────────────────────
export const uploadWorkProof = (id, formData) =>
  api.post(`/complaints/${id}/work-proof`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// ── Confirmation & Disputes ───────────────────────────────────────────────────
export const confirmWorkDone = (id)           => api.post(`/complaints/${id}/confirm`);
export const raiseDispute    = (id, reason)   => api.post(`/complaints/${id}/dispute`, { reason });
export const resolveDispute  = (id, decision) => api.patch(`/complaints/${id}/resolve-dispute`, { decision });

// ── Authority ─────────────────────────────────────────────────────────────────
export const getMyAssignedComplaints = ()            => api.get("/complaints/authority/mine");
export const getAuthorityStats       = (authorityId) => api.get(`/complaints/stats/authority/${authorityId}`);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const getAdminStats = () => api.get("/admin/stats");
export const getUsers      = () => api.get("/admin/users");

// ── Geo / Location ────────────────────────────────────────────────────────────
export const getNearbyComplaints = ({ lat, lng, radius = 5000, status } = {}) => {
  const params = { lat, lng, radius };
  if (status) params.status = status;
  return api.get("/geo/nearby", { params });
};

export const getComplaintsInBounds = ({ swLat, swLng, neLat, neLng }) =>
  api.get("/geo/bounds", { params: { swLat, swLng, neLat, neLng } });

export const getGeoCluster = ({ lat, lng, radius = 10000 }) =>
  api.get("/geo/cluster", { params: { lat, lng, radius } });

export default api;