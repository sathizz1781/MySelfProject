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
    href: null,
    live: false,
  },
  {
    key: "habits",
    name: "Habits",
    icon: CheckSquare,
    color: "#ffd43b",
    description: "Build daily routines",
    href: null,
    live: false,
  },
  {
    key: "notes",
    name: "Notes",
    icon: FileText,
    color: "#f783ac",
    description: "Quick notes & ideas",
    href: null,
    live: false,
  },
  {
    key: "goals",
    name: "Goals",
    icon: Target,
    color: "#ffa94d",
    description: "Set & track goals",
    href: null,
    live: false,
  },
  {
    key: "calendar",
    name: "Calendar",
    icon: Calendar,
    color: "#66d9e8",
    description: "Events & reminders",
    href: null,
    live: false,
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
            <Hexagon size={24} color="#6c63ff" strokeWidth={2} />
          </div>
          My World
        </div>
        <div className="topbar-user">
          <ThemePicker />
          <div className="avatar">{initials}</div>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {user.name}
          </span>
          <button
            className="btn btn-ghost"
            style={{ width: "auto", padding: "0.45rem 1rem", marginTop: 0 }}
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="dashboard-content">
        <div className="welcome-section">
          <h1>Hey, {user.name.split(" ")[0]} 👋</h1>
          <p>Your personal space — all your apps in one place.</p>
        </div>

        <div style={{ marginTop: "0.5rem" }}>
          <p
            style={{
              fontSize: "0.78rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              fontWeight: 600,
              marginBottom: "1rem",
            }}
          >
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
                      background: `${app.color}22`,
                      border: `1px solid ${app.color}44`,
                    }}
                  >
                    <IconComponent
                      size={24}
                      color={app.color}
                      strokeWidth={2}
                    />
                  </div>
                  <span className="app-icon-name">{app.name}</span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      textAlign: "center",
                    }}
                  >
                    {app.description}
                  </span>
                </Link>
              ) : (
                <div key={app.key} className="app-icon-card disabled">
                  <div
                    className="app-icon"
                    style={{
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <IconComponent
                      size={24}
                      color="var(--text-muted)"
                      strokeWidth={2}
                    />
                  </div>
                  <span className="app-icon-name">{app.name}</span>
                  <span className="app-coming-soon">Coming soon</span>
                </div>
              );
            })}
          </div>
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
