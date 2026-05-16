export const THEMES = [
  { key: "dark",     label: "Dark",     preview: ["#07070f", "#6c63ff", "#34d399"] },
  { key: "light",    label: "Light",    preview: ["#f0f0f8", "#6c63ff", "#10b981"] },
  { key: "ocean",    label: "Ocean",    preview: ["#060d1a", "#0ea5e9", "#34d399"] },
  { key: "forest",   label: "Forest",   preview: ["#060f0c", "#10b981", "#34d399"] },
  { key: "sunset",   label: "Sunset",   preview: ["#140a06", "#f97316", "#f59e0b"] },
  { key: "midnight", label: "Midnight", preview: ["#0d1117", "#58a6ff", "#3fb950"] },
  { key: "rose",     label: "Rose",     preview: ["#12060a", "#fb7185", "#fda4af"] },
  { key: "nord",     label: "Nord",     preview: ["#1e2430", "#88c0d0", "#a3be8c"] },
  { key: "amber",    label: "Amber",    preview: ["#100c00", "#f59e0b", "#fbbf24"] },
  { key: "violet",   label: "Violet",   preview: ["#0d0818", "#8b5cf6", "#a78bfa"] },
  { key: "cyber",    label: "Cyber",    preview: ["#050508", "#00ffc8", "#40ffda"] },
  { key: "slate",    label: "Slate",    preview: ["#0a0c10", "#94a3b8", "#cbd5e1"] },
];

export const DEFAULT_THEME = "dark";

export function getStoredTheme() {
  if (typeof window === "undefined") return DEFAULT_THEME;
  return localStorage.getItem("theme") || DEFAULT_THEME;
}

export function applyTheme(key) {
  document.documentElement.setAttribute("data-theme", key);
  localStorage.setItem("theme", key);
}
