import Link from "next/link";
import { useRouter } from "next/router";
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
          <button
            className="btn btn-ghost"
            style={{ width: "auto", padding: "0.38rem 0.85rem", marginTop: 0, fontSize: "0.8rem" }}
            onClick={handleLogout}
          >
            Sign out
          </button>
          <div className="avatar">{initials}</div>
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
            return app.live ? (
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
                <span className="app-coming-soon">Coming soon</span>
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
    return {
      props: {
        user: { id: user._id.toString(), name: user.name, email: user.email },
      },
    };
  } catch {
    return { redirect: { destination: "/login", permanent: false } };
  }
}
