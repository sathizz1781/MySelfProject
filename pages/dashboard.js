import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import {
  Hexagon,
  Wallet,
  Activity,
  CheckSquare,
  FileText,
  Target,
  Calendar,
  BarChart2,
  Calculator,
} from "lucide-react";
import { getAuthUser } from "../lib/auth";
import connectDB from "../lib/mongodb";
import User from "../models/User";
import ThemePicker from "../components/ThemePicker";

const APPS = [
  {
    key: "expenses",
    name: "Expenses",
    icon: Wallet,
    color: "#6c63ff",
    description: "Track spending & income",
    href: "/apps/expenses",
    live: true,
  },
  {
    key: "health",
    name: "Health",
    icon: Activity,
    color: "#63ffb2",
    description: "Track workouts & vitals",
    href: "/apps/health",
    live: true,
  },
  {
    key: "habits",
    name: "Habits",
    icon: CheckSquare,
    color: "#ffd43b",
    description: "Build daily routines",
    href: "/apps/habits",
    live: true,
  },
  {
    key: "notes",
    name: "Notes",
    icon: FileText,
    color: "#f783ac",
    description: "Quick notes & ideas",
    href: "/apps/notes",
    live: true,
  },
  {
    key: "goals",
    name: "Goals",
    icon: Target,
    color: "#ffa94d",
    description: "Set & track goals",
    href: "/apps/goals",
    live: true,
  },
  {
    key: "calendar",
    name: "Calendar",
    icon: Calendar,
    color: "#66d9e8",
    description: "Events & reminders",
    href: "/apps/calendar",
    live: true,
  },
  {
    key: "reports",
    name: "Reports",
    icon: BarChart2,
    color: "#a78bfa",
    description: "Monthly financial reports",
    href: "/apps/reports",
    live: true,
  },
  {
    key: "calculators",
    name: "Calculators",
    icon: Calculator,
    color: "#06b6d4",
    description: "EMI, SIP, FD & more",
    href: "/apps/calculators",
    live: true,
  },
];

export default function Dashboard({ user }) {
  const router = useRouter();
  const allowedApps = user.allowedApps || APPS.map(a => a.key);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="dashboard-wrap">
      <nav className="topbar">
        <div className="topbar-logo">
          <div className="topbar-logo-icon">
            <Hexagon size={16} color="var(--accent)" strokeWidth={2.5} />
          </div>
          My World
        </div>
        <div className="topbar-user">
          <ThemePicker />
          <div ref={dropRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropOpen(o => !o)}
              title={user.name}
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "var(--accent)", color: "#fff",
                border: "2px solid transparent",
                outline: dropOpen ? "2px solid var(--accent)" : "none",
                cursor: "pointer", fontWeight: 700, fontSize: "0.72rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "outline 0.15s",
              }}
            >{initials}</button>

            {dropOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                minWidth: 190, background: "var(--surface2)",
                border: "1px solid var(--border)", borderRadius: "var(--radius)",
                boxShadow: "0 8px 28px rgba(0,0,0,0.35)", zIndex: 200, overflow: "hidden",
              }}>
                <div style={{ padding: "0.65rem 0.9rem", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.83rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                  <div style={{ fontSize: "0.69rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
                  {user.role === "admin" && (
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--accent-light)", background: "rgba(108,99,255,0.15)", borderRadius: 4, padding: "0.1rem 0.35rem", display: "inline-block", marginTop: "0.2rem" }}>ADMIN</span>
                  )}
                </div>
                <Link href="/profile" onClick={() => setDropOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.9rem", fontSize: "0.82rem", color: "var(--text)", textDecoration: "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >Profile</Link>
                {user.role === "admin" && (
                  <Link href="/admin" onClick={() => setDropOpen(false)}
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
        </div>
      </nav>

      <main className="dashboard-content">
        {/* Welcome hero */}
        <div className="welcome-section">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent) 0%, #00875a 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", fontWeight: 800, color: "#000", flexShrink: 0, boxShadow: "0 0 24px var(--accent-glow)" }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Welcome back</div>
              <h1 style={{ margin: 0, fontSize: "1.7rem" }}>{user.name.split(" ")[0]}</h1>
            </div>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Your personal finance & life dashboard — everything in one place.</p>
        </div>

        {/* Apps */}
        <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-muted)", fontWeight: 700, marginBottom: "1rem" }}>
          My Apps
        </p>
        <div className="apps-grid">
          {APPS.map((app) => {
            const IconComponent = app.icon;
            const hasAccess = allowedApps.includes(app.key);
            return app.live && hasAccess ? (
              <Link key={app.key} href={app.href} className="app-icon-card">
                <div
                  className="app-icon"
                  style={{
                    background: `${app.color}20`,
                    border: `1.5px solid ${app.color}40`,
                  }}
                >
                  <IconComponent size={26} color={app.color} strokeWidth={2} />
                </div>
                <span className="app-icon-name">{app.name}</span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.4 }}>
                  {app.description}
                </span>
              </Link>
            ) : (
              <div key={app.key} className="app-icon-card disabled">
                <div className="app-icon" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <IconComponent size={26} color="var(--text-muted)" strokeWidth={2} />
                </div>
                <span className="app-icon-name">{app.name}</span>
                <span className="app-coming-soon">{app.live && !hasAccess ? "No access" : "Coming soon"}</span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const decoded = getAuthUser(ctx.req);
  if (!decoded)
    return { redirect: { destination: "/login", permanent: false } };

  try {
    await connectDB();
    const user = await User.findById(decoded.userId).lean();
    if (!user) return { redirect: { destination: "/login", permanent: false } };
    const ALL_APPS = ["expenses", "health", "habits", "notes", "goals", "calendar", "reports", "calculators"];
    const isAdmin = user.role === "admin";
    return {
      props: {
        user: {
          id: user._id.toString(), name: user.name, email: user.email, role: user.role || "user",
          allowedApps: isAdmin || !user.allowedApps?.length ? ALL_APPS : user.allowedApps,
        },
      },
    };
  } catch {
    return { redirect: { destination: "/login", permanent: false } };
  }
}
