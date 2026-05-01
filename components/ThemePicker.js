import { useState, useEffect, useRef } from "react";
import { THEMES, getStoredTheme, applyTheme } from "../lib/themes";

export default function ThemePicker() {
  const [current, setCurrent] = useState("dark");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setCurrent(getStoredTheme());
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(key) {
    applyTheme(key);
    setCurrent(key);
    setOpen(false);
  }

  const activeTheme = THEMES.find(t => t.key === current) || THEMES[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="theme-btn" onClick={() => setOpen(v => !v)} title="Change theme" aria-label="Change theme">
        {/* Mini swatches of the active theme */}
        <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
          {activeTheme.preview.map((c, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
          ))}
        </div>
      </button>

      {open && (
        <div className="theme-popover">
          <div className="theme-popover-title">Theme</div>
          <div className="theme-list">
            {THEMES.map(t => (
              <button key={t.key} className={`theme-option ${current === t.key ? "active" : ""}`} onClick={() => select(t.key)}>
                <div className="theme-swatches">
                  {t.preview.map((c, i) => (
                    <div key={i} className="theme-swatch" style={{ background: c }} />
                  ))}
                </div>
                {t.label}
                {current === t.key && <span style={{ marginLeft: "auto", fontSize: "0.7rem" }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
