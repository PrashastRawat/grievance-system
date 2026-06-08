export const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const initials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
export const genId = () => "GR-" + String(Math.floor(Math.random() * 9000) + 1000);
export const truncate = (text, len = 100) =>
  text && text.length > len ? text.slice(0, len) + "…" : text;