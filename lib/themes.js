export const THEMES = [
  { key: "dark",     label: "Dark",     preview: ["#07070f", "#6c63ff", "#34d399"] },
  { key: "light",    label: "Light",    preview: ["#f0f0f8", "#6c63ff", "#10b981"] },
  { key: "ocean",    label: "Ocean",    preview: ["#060d1a", "#0ea5e9", "#34d399"] },
  { key: "forest",   label: "Forest",   preview: ["#060f0c", "#10b981", "#34d399"] },
  { key: "sunset",   label: "Sunset",   preview: ["#140a06", "#f97316", "#f59e0b"] },
  { key: "midnight", label: "Midnight", preview: ["#0d1117", "#58a6ff", "#3fb950"] },
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
