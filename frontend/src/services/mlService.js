import axios from "axios";
import { ML_BASE } from "../utils/constants";

const KEYWORDS = {
  Road:        ["road","pothole","street","highway","bridge","pavement","crack","bump","lane"],
  Water:       ["water","pipe","leak","flood","drainage","tap","supply","pipeline","drain","overflow"],
  Electricity: ["electricity","power","light","wire","electric","voltage","transformer","outage","bulb","dark"],
  Sanitation:  ["garbage","waste","trash","clean","sanitation","toilet","dustbin","litter","dump","smell"],
};

function keywordClassify(text) {
  const t = text.toLowerCase();
  const scores = { Road: 0, Water: 0, Electricity: 0, Sanitation: 0 };
  for (const [cat, words] of Object.entries(KEYWORDS))
    for (const w of words) if (t.includes(w)) scores[cat]++;
  const max = Math.max(...Object.values(scores));
  if (max === 0) return { category: "Road", confidence: 58, source: "keyword" };
  const cat = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  return { category: cat, confidence: Math.min(96, 62 + max * 9), source: "keyword" };
}

export async function classifyComplaint(title, description) {
  const text = `${title} ${description}`.trim();
  if (text.length < 5) return null;
  try {
    const { data } = await axios.post(`${ML_BASE}/predict`, { text }, { timeout: 3000 });
    return { category: data.category, confidence: Math.round((data.confidence || 0.75) * 100), source: "ml" };
  } catch {
    return keywordClassify(text);
  }
}