import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import * as api from "../../services/apiService";
import LocationPicker from "../shared/LocationPicker";
import { CATEGORIES as COMPLAINT_CATEGORIES } from "../../utils/constants";
import axios from "axios";

const API    = "http://localhost:5000/api";
const ML_URL = "http://localhost:8000";

export default function SubmitComplaint() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: "", description: "", category: "",
    priority: "medium", ward: "", location: null,
  });
  const [errors,       setErrors]       = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicate,    setDuplicate]    = useState(null);
  const [checkingDup,  setCheckingDup]  = useState(false);

  // AI rewrite state
  const [rewriting,    setRewriting]    = useState(false);
  const [rewriteShown, setRewriteShown] = useState(false);
  const [originalDesc, setOriginalDesc] = useState("");

  if (user?.reputation?.isBanned) {
    return (
      <div className="max-w-2xl mx-auto mt-10 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <div className="text-4xl mb-3">🚫</div>
        <h2 className="text-xl font-semibold text-red-700 mb-2">Account Suspended</h2>
        <p className="text-red-600 text-sm">
          Your account has been suspended due to repeated false disputes. Contact support to appeal.
        </p>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    if (!formData.title.trim())              e.title       = "Title is required";
    if (formData.title.length > 100)         e.title       = "Max 100 characters";
    if (!formData.description.trim())        e.description = "Description is required";
    if (formData.description.length < 20)    e.description = "At least 20 characters required";
    if (!formData.category)                  e.category    = "Select a category";
    if (!formData.ward.trim())               e.ward        = "Ward/Area is required";
    if (!formData.location)                  e.location    = "Please pin the complaint location on the map";
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: undefined }));
    if (name === "category" || name === "ward") setDuplicate(null);
    // If user edits description after rewrite, show revert option
    if (name === "description") setRewriteShown(false);
  };

  const handleLocationChange = (loc) => {
    setFormData(p => ({ ...p, location: loc }));
    if (errors.location) setErrors(p => ({ ...p, location: undefined }));
  };

  const checkDuplicate = async (category, ward, text = "") => {
    if (!category || !ward) return;
    setCheckingDup(true);
    try {
      const res = await axios.get(`${API}/public/check-duplicate`, {
        params: { category, ward, text },
      });
      setDuplicate(res.data?.existing || null);
    } catch {}
    finally { setCheckingDup(false); }
  };

  const handleCategoryChange = (e) => {
    const { value } = e.target;
    setFormData(p => ({ ...p, category: value }));
    setErrors(p => ({ ...p, category: undefined }));
    setDuplicate(null);
    checkDuplicate(value, formData.ward, formData.description);
  };

  // ── AI Rewrite handler ────────────────────────────────────────────────────
  const handleAIRewrite = async () => {
    if (!formData.description.trim() || formData.description.length < 10) {
      showToast("Write at least 10 characters before rewriting", "error");
      return;
    }
    setRewriting(true);
    try {
      const res = await axios.post(`${ML_URL}/rewrite-complaint`, {
        text: formData.description,
      });
      if (res.data?.rewritten) {
        setOriginalDesc(formData.description);   // save original for revert
        setFormData(p => ({ ...p, description: res.data.rewritten }));
        setRewriteShown(true);
        showToast("✨ Description rewritten by AI!", "success");
      }
    } catch {
      showToast("AI rewrite failed. Try again.", "error");
    } finally {
      setRewriting(false);
    }
  };

  const handleRevertDescription = () => {
    setFormData(p => ({ ...p, description: originalDesc }));
    setRewriteShown(false);
    setOriginalDesc("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title:       formData.title.trim(),
        description: formData.description.trim(),
        category:    formData.category,
        priority:    formData.priority,
        ward:        formData.ward.trim(),
        location: formData.location
          ? {
              type:        "Point",
              coordinates: [formData.location.lng, formData.location.lat],
              address:     formData.location.address,
            }
          : undefined,
      };
      await api.submitComplaint(payload);
      showToast("Complaint submitted successfully!", "success");
      navigate("/my-complaints");
    } catch (err) {
      showToast(err.message || "Failed to submit complaint", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit a Complaint</h1>
        <p className="text-gray-500 text-sm mt-1">
          Describe the issue and pin its exact location on the map.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            name="title" value={formData.title} onChange={handleChange}
            placeholder="e.g. Broken street light near main road"
            className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.title ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        {/* Category + Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category" value={formData.category} onChange={handleCategoryChange}
              className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                errors.category ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            >
              <option value="">Select category</option>
              {(COMPLAINT_CATEGORIES || ["Road", "Water", "Electricity", "Sanitation"]).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
            <select
              name="priority" value={formData.priority} onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {["low", "medium", "high", "urgent"].map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Duplicate warning */}
        {checkingDup && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-500">
            🔍 Checking for similar complaints…
          </div>
        )}
        {duplicate && !checkingDup && (
          <div className="rounded-lg bg-amber-50 border border-amber-300 px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Similar complaint already exists</p>
                <p className="text-xs text-amber-700 mt-1">
                  A <strong>{duplicate.category}</strong> complaint in <strong>{duplicate.ward}</strong> is
                  currently <strong>{duplicate.status}</strong> — "{duplicate.title}".
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  You can still submit if your issue is different, but duplicate complaints may be rejected.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Ward */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Ward / Area <span className="text-red-500">*</span>
          </label>
          <input
            name="ward" value={formData.ward} onChange={handleChange}
            placeholder="e.g. Rajpur Road, Dehradun"
            className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.ward ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
          />
          {errors.ward && <p className="text-xs text-red-500 mt-1">{errors.ward}</p>}
        </div>

        {/* Description + AI Rewrite */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {rewriteShown && (
                <button
                  type="button"
                  onClick={handleRevertDescription}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  ↩ Revert to original
                </button>
              )}
              <button
                type="button"
                onClick={handleAIRewrite}
                disabled={rewriting || formData.description.length < 10}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg
                  bg-violet-50 text-violet-700 border border-violet-200
                  hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {rewriting ? (
                  <>
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Rewriting…
                  </>
                ) : (
                  <>✨ AI Rewrite</>
                )}
              </button>
            </div>
          </div>
          {rewriteShown && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-700">
              ✨ AI has rewritten your description for clarity. You can edit it further or revert above.
            </div>
          )}
          <textarea
            name="description" value={formData.description} onChange={handleChange}
            rows={4}
            placeholder="Describe the issue in detail — what's wrong, since when, impact on residents..."
            className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.description ? "border-red-400 bg-red-50" : rewriteShown ? "border-violet-300 bg-violet-50/30" : "border-gray-300"
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.description
              ? <p className="text-xs text-red-500">{errors.description}</p>
              : <span />
            }
            <span className="text-xs text-gray-400">{formData.description.length} chars</span>
          </div>
        </div>

        {/* Location Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Pin Location on Map <span className="text-red-500">*</span>
          </label>
          <LocationPicker
            value={formData.location}
            onChange={handleLocationChange}
            onWardChange={(ward) => {
              setFormData(p => ({ ...p, ward }));
              checkDuplicate(formData.category, ward, formData.description);
            }}
            error={errors.location}
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit" disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Submitting...
              </>
            ) : (
              <>{duplicate ? "Submit Anyway" : "Submit Complaint"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}