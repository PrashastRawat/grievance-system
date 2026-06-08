from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer, util
from transformers import pipeline
import os
import re
from groq import Groq

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

app = Flask(__name__)
CORS(app)

# ── Load Models (once at startup) ─────────────────────────────────────────────
print("⏳  Loading AI models...")
embedder       = SentenceTransformer("all-MiniLM-L6-v2")       # semantic similarity
sentiment_pipe = pipeline("sentiment-analysis",
                           model="distilbert-base-uncased-finetuned-sst-2-english")
groq_client    = Groq(api_key=GROQ_API_KEY)
print("✅  Models loaded!\n")

# ── Keyword-based classifier ──────────────────────────────────────────────────
KEYWORDS = {
    "Road":        ["road", "pothole", "street", "highway", "bridge",
                    "pavement", "crack", "footpath", "signal", "divider"],
    "Water":       ["water", "pipe", "leak", "flood", "drainage", "tap",
                    "supply", "drain", "pipeline", "sewage", "overflow"],
    "Electricity": ["electricity", "power", "light", "wire", "voltage",
                    "transformer", "outage", "electric", "pole", "blackout"],
    "Sanitation":  ["garbage", "waste", "trash", "clean", "sanitation",
                    "toilet", "dustbin", "litter", "sewage", "smell", "stench"],
}

# ── Resolution time rules (days) ─────────────────────────────────────────────
RESOLUTION_DAYS = {
    "Road":        { "base": 7,  "per_complaint": 0.5 },
    "Water":       { "base": 3,  "per_complaint": 0.3 },
    "Electricity": { "base": 2,  "per_complaint": 0.2 },
    "Sanitation":  { "base": 4,  "per_complaint": 0.4 },
}

# ── Health check ──────────────────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "GrievanceHub ML"})


# ── 1. Keyword classifier (existing) ─────────────────────────────────────────
@app.route('/predict', methods=['POST'])
def predict():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    text = data.get('text', '').strip()

    if not text:
        return jsonify({"error": "Field 'text' is required and cannot be empty"}), 400
    if len(text) > 2000:
        return jsonify({"error": "Text too long (max 2000 characters)"}), 400

    text_lower = text.lower()
    scores = {cat: 0 for cat in KEYWORDS}

    for cat, words in KEYWORDS.items():
        for w in words:
            if w in text_lower:
                scores[cat] += 1

    max_score = max(scores.values())

    if max_score == 0:
        return jsonify({
            "category":   "Road",
            "confidence": 0.40,
            "matched":    False,
            "scores":     scores
        })

    category   = max(scores, key=scores.get)
    confidence = round(min(0.97, 0.62 + (max_score * 0.09)), 2)

    return jsonify({
        "category":   category,
        "confidence": confidence,
        "matched":    True,
        "scores":     scores
    })


# ── 2. Predicted Resolution Time ─────────────────────────────────────────────
# POST /predict-time
# Body: { "category": "Road", "ward": "Rajpur Road", "openComplaints": 12 }
# Returns: { "estimatedDays": 13, "confidence": "medium", "breakdown": {...} }
@app.route('/predict-time', methods=['POST'])
def predict_time():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data            = request.get_json()
    category        = data.get('category', 'Road')
    open_complaints = int(data.get('openComplaints', 0))

    rule = RESOLUTION_DAYS.get(category, RESOLUTION_DAYS["Road"])

    estimated = round(rule["base"] + (open_complaints * rule["per_complaint"]))

    # Confidence based on how many open complaints we have (more data = more confident)
    if open_complaints > 10:
        confidence = "high"
    elif open_complaints > 3:
        confidence = "medium"
    else:
        confidence = "low"

    return jsonify({
        "estimatedDays": estimated,
        "confidence":    confidence,
        "breakdown": {
            "baseDays":          rule["base"],
            "openComplaints":    open_complaints,
            "delayPerComplaint": rule["per_complaint"],
            "category":          category,
        }
    })


# ── 3. Sentiment Analysis on Comments ────────────────────────────────────────
# POST /sentiment
# Body: { "text": "This has been pending for 3 months, nobody cares!" }
# Returns: { "label": "NEGATIVE", "score": 0.98, "frustrated": true, "flagged": true }
@app.route('/sentiment', methods=['POST'])
def sentiment():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    text = data.get('text', '').strip()

    if not text:
        return jsonify({"error": "Field 'text' is required"}), 400

    # Truncate to 512 tokens (model limit)
    truncated = text[:512]

    result = sentiment_pipe(truncated)[0]
    label  = result['label']    # "POSITIVE" or "NEGATIVE"
    score  = round(result['score'], 3)

    # Flag if strongly negative (frustrated citizen)
    frustrated = label == "NEGATIVE" and score > 0.85
    flagged    = frustrated  # admin should review

    return jsonify({
        "label":      label,
        "score":      score,
        "frustrated": frustrated,
        "flagged":    flagged,
        "message":    "Citizen may be frustrated — review recommended" if flagged else "Sentiment normal"
    })


# ── 4. Smart Duplicate Detection (semantic similarity) ───────────────────────
# POST /check-duplicate-ai
# Body: { "text": "water leaking on main road", "existing": ["pipe burst near park", ...] }
# Returns: { "isDuplicate": true, "similarityScore": 0.87, "matchedWith": "pipe burst near park" }
@app.route('/check-duplicate-ai', methods=['POST'])
def check_duplicate_ai():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data     = request.get_json()
    new_text = data.get('text', '').strip()
    existing = data.get('existing', [])   # list of existing complaint texts

    if not new_text:
        return jsonify({"error": "Field 'text' is required"}), 400
    if not existing:
        return jsonify({"isDuplicate": False, "similarityScore": 0, "matchedWith": None})

    # Encode all texts
    new_embedding      = embedder.encode(new_text, convert_to_tensor=True)
    existing_embeddings = embedder.encode(existing, convert_to_tensor=True)

    # Cosine similarity
    scores     = util.cos_sim(new_embedding, existing_embeddings)[0]
    max_score  = float(scores.max())
    max_index  = int(scores.argmax())

    THRESHOLD = 0.75   # above this → likely duplicate

    return jsonify({
        "isDuplicate":    max_score >= THRESHOLD,
        "similarityScore": round(max_score, 3),
        "matchedWith":    existing[max_index] if max_score >= THRESHOLD else None,
        "threshold":      THRESHOLD
    })


# ── 5. AI Complaint Assistant (Groq) ─────────────────────────────────────────
# POST /rewrite-complaint
# Body: { "text": "bhai road toot gayi hai bahut bura haal hai" }
# Returns: { "rewritten": "The road surface... has deteriorated significantly..." }
@app.route('/rewrite-complaint', methods=['POST'])
def rewrite_complaint():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    text = data.get('text', '').strip()

    if not text:
        return jsonify({"error": "Field 'text' is required"}), 400

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a civic complaint assistant. "
                        "Rewrite the citizen's complaint in clear, formal English "
                        "suitable for a municipal authority. "
                        "Keep it concise (2-3 sentences). "
                        "Do NOT add any preamble — just output the rewritten complaint."
                    )
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            max_tokens=200,
            temperature=0.4,
        )

        rewritten = response.choices[0].message.content.strip()
        return jsonify({
            "original":  text,
            "rewritten": rewritten,
            "success":   True
        })

    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500


# ── 6. Weekly AI Report for Admin (Groq) ─────────────────────────────────────
# POST /weekly-report
# Body: { "stats": { "total": 120, "resolved": 80, "pending": 40,
#          "byWard": {...}, "byCategory": {...}, "avgResolutionDays": 5.2 } }
# Returns: { "report": "This week, GrievanceHub recorded..." }
@app.route('/weekly-report', methods=['POST'])
def weekly_report():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data  = request.get_json()
    stats = data.get('stats', {})

    if not stats:
        return jsonify({"error": "Field 'stats' is required"}), 400

    # Build a readable summary to send to Groq
    stats_text = f"""
Total complaints this week: {stats.get('total', 0)}
Resolved: {stats.get('resolved', 0)}
Pending: {stats.get('pending', 0)}
Average resolution time: {stats.get('avgResolutionDays', 'N/A')} days
Complaints by ward: {stats.get('byWard', {})}
Complaints by category: {stats.get('byCategory', {})}
Top performing ward: {stats.get('topWard', 'N/A')}
Most common issue: {stats.get('topCategory', 'N/A')}
    """.strip()

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an AI analyst for a municipal grievance system called GrievanceHub in Dehradun, India. "
                        "Write a concise weekly performance report (4-6 sentences) for the admin. "
                        "Mention what went well, what needs attention, and one actionable recommendation. "
                        "Write in a professional tone. No bullet points — plain paragraphs only."
                    )
                },
                {
                    "role": "user",
                    "content": f"Here are this week's stats:\n{stats_text}"
                }
            ],
            max_tokens=400,
            temperature=0.5,
        )

        report = response.choices[0].message.content.strip()
        return jsonify({
            "report":  report,
            "success": True
        })

    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("🚀  ML Service running at http://localhost:8000")
    print("    GET  /health             →  health check")
    print("    POST /predict            →  keyword category classifier")
    print("    POST /predict-time       →  predicted resolution time")
    print("    POST /sentiment          →  sentiment analysis on comments")
    print("    POST /check-duplicate-ai →  semantic duplicate detection")
    print("    POST /rewrite-complaint  →  AI complaint assistant (Groq)")
    print("    POST /weekly-report      →  weekly AI report for admin (Groq)\n")
    app.run(host='0.0.0.0', port=8000, debug=True)

# ── 7. Ward Health Score ──────────────────────────────────────────────────────
# GET /ward-health
# Body: { "wards": [ { "ward": "Rajpur Road", "total": 20, "resolved": 14,
#                      "pending": 3, "disputed": 1, "avgDays": 4.2 }, ... ] }
# Returns: [ { "ward": "Rajpur Road", "score": 82, "grade": "Healthy",
#              "color": "#22c55e", "breakdown": {...} }, ... ]
@app.route('/ward-health', methods=['POST'])
def ward_health():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data  = request.get_json()
    wards = data.get('wards', [])

    if not wards:
        return jsonify([])

    results = []

    for w in wards:
        total    = w.get('total', 0)
        resolved = w.get('resolved', 0)
        pending  = w.get('pending', 0)
        disputed = w.get('disputed', 0)
        avg_days = w.get('avgDays', None)

        if total == 0:
            continue

        # ── Factor 1: Resolution Rate (40%) ──────────────────────────────────
        resolution_rate  = resolved / total
        resolution_score = round(resolution_rate * 100)   # 0-100

        # ── Factor 2: Speed Score (25%) ──────────────────────────────────────
        # avg_days: 0-2 = 100, 3-5 = 80, 6-10 = 60, 11-20 = 40, >20 = 20
        if avg_days is None:
            speed_score = 50   # unknown = neutral
        elif avg_days <= 2:
            speed_score = 100
        elif avg_days <= 5:
            speed_score = 80
        elif avg_days <= 10:
            speed_score = 60
        elif avg_days <= 20:
            speed_score = 40
        else:
            speed_score = 20

        # ── Factor 3: Load Score (20%) ────────────────────────────────────────
        # fewer pending relative to total = better
        pending_rate = pending / total
        if pending_rate <= 0.1:
            load_score = 100
        elif pending_rate <= 0.25:
            load_score = 80
        elif pending_rate <= 0.5:
            load_score = 60
        elif pending_rate <= 0.75:
            load_score = 40
        else:
            load_score = 20

        # ── Factor 4: Dispute Rate (15%) ──────────────────────────────────────
        dispute_rate = disputed / total
        if dispute_rate == 0:
            dispute_score = 100
        elif dispute_rate <= 0.05:
            dispute_score = 80
        elif dispute_rate <= 0.15:
            dispute_score = 60
        elif dispute_rate <= 0.3:
            dispute_score = 40
        else:
            dispute_score = 20

        # ── Weighted total ────────────────────────────────────────────────────
        score = round(
            (resolution_score * 0.40) +
            (speed_score      * 0.25) +
            (load_score       * 0.20) +
            (dispute_score    * 0.15)
        )

        # ── Grade + color ─────────────────────────────────────────────────────
        if score >= 80:
            grade = "Healthy"
            color = "#22c55e"
            emoji = "🟢"
        elif score >= 60:
            grade = "Moderate"
            color = "#f59e0b"
            emoji = "🟡"
        elif score >= 40:
            grade = "Needs Attention"
            color = "#f97316"
            emoji = "🟠"
        else:
            grade = "Critical"
            color = "#ef4444"
            emoji = "🔴"

        results.append({
            "ward":  w.get('ward', 'Unknown'),
            "score": score,
            "grade": grade,
            "color": color,
            "emoji": emoji,
            "breakdown": {
                "resolutionScore": resolution_score,
                "speedScore":      speed_score,
                "loadScore":       load_score,
                "disputeScore":    dispute_score,
                "resolutionRate":  round(resolution_rate * 100),
                "avgDays":         avg_days,
                "pendingRate":     round(pending_rate * 100),
                "disputeRate":     round(dispute_rate * 100),
            }
        })

    # Sort by score descending
    results.sort(key=lambda x: x['score'], reverse=True)
    return jsonify(results)