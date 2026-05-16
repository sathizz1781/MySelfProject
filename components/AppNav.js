import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import ThemePicker from "./ThemePicker";

export default function AppNav({ user, title, className = "", children }) {
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <nav className={`app-nav ${className}`}>
      <Link href="/dashboard" className="app-nav-back">←</Link>
      {title && <h2>{title}</h2>}
      {children}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
        <ThemePicker />
        {user && (
          <div ref={dropRef} style={{ position: "relative" }}>
            <button
              onClick={() => setOpen(o => !o)}
              title={user.name}
              style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "var(--accent)", color: "#fff",
                border: "2px solid transparent",
                outline: open ? "2px solid var(--accent)" : "none",
                cursor: "pointer", fontWeight: 700, fontSize: "0.68rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "outline 0.15s",
              }}
            >{initials}</button>

            {open && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                minWidth: 190, background: "var(--surface2)",
                border: "1px solid var(--border)", borderRadius: "var(--radius)",
                boxShadow: "0 8px 28px rgba(0,0,0,0.35)", zIndex: 200, overflow: "hidden",
              }}>
                {/* User info header */}
                <div style={{ padding: "0.65rem 0.9rem", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.83rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                  <div style={{ fontSize: "0.69rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
                  {user.role === "admin" && (
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--accent-light)", background: "rgba(108,99,255,0.15)", borderRadius: 4, padding: "0.1rem 0.35rem", display: "inline-block", marginTop: "0.2rem" }}>ADMIN</span>
                  )}
                </div>

                {/* Menu items */}
                <Link href="/profile" onClick={() => setOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.9rem", fontSize: "0.82rem", color: "var(--text)", textDecoration: "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >Profile</Link>

                {user.role === "admin" && (
                  <Link href="/admin" onClick={() => setOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.9rem", fontSize: "0.82rem", color: "var(--accent-light)", textDecoration: "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >Admin Panel</Link>
                )}

                <button onClick={handleLogout}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "0.55rem 0.9rem", fontSize: "0.82rem",
                    background: "none", border: "none", borderTop: "1px solid var(--border)",
                    color: "var(--error)", cursor: "pointer",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                >Sign Out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
