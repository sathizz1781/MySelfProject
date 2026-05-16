import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { getAuthUser } from "../../lib/auth";
import connectDB from "../../lib/mongodb";
import User from "../../models/User";
import AppNav from "../../components/AppNav";

const ALL_APPS = [
  { key: "expenses",    label: "Expenses" },
  { key: "health",      label: "Health" },
  { key: "habits",      label: "Habits" },
  { key: "notes",       label: "Notes" },
  { key: "goals",       label: "Goals" },
  { key: "calendar",    label: "Calendar" },
  { key: "reports",     label: "Reports" },
  { key: "calculators", label: "Calculators" },
];

export default function AdminPage({ user: adminUser }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState("");
  const [expanded, setExpanded] = useState({});

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers((await res.json()).users);
    setLoading(false);
  }

  function flash(text) { setMsg(text); setTimeout(() => setMsg(""), 3000); }

  async function toggleRole(u) {
    const newRole = u.role === "admin" ? "user" : "admin";
    const res = await fetch("/api/admin/users", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, role: newRole }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
      flash(`${u.name} is now ${newRole}.`);
    }
  }

  async function toggleApp(u, appKey) {
    const current = u.allowedApps || ALL_APPS.map(a => a.key);
    const next = current.includes(appKey)
      ? current.filter(a => a !== appKey)
      : [...current, appKey];
    const res = await fetch("/api/admin/users", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, allowedApps: next }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, allowedApps: next } : x));
    }
  }

  async function grantAll(u) {
    const all = ALL_APPS.map(a => a.key);
    const res = await fetch("/api/admin/users", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, allowedApps: all }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, allowedApps: all } : x));
      flash(`All apps granted to ${u.name}.`);
    }
  }

  async function revokeAll(u) {
    const res = await fetch("/api/admin/users", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, allowedApps: [] }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, allowedApps: [] } : x));
      flash(`All apps revoked from ${u.name}.`);
    }
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AppNav user={adminUser} title="Admin Panel" />

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>Users</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{users.length} total</div>
          </div>
          {msg && <div style={{ fontSize: "0.78rem", color: "var(--success)" }}>{msg}</div>}
        </div>

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {users.map(u => {
              const isSelf = u.id === adminUser.id;
              const allowedApps = u.allowedApps || ALL_APPS.map(a => a.key);
              const isOpen = expanded[u.id];
              return (
                <div key={u.id} className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
                  {/* User row */}
                  <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: u.role === "admin" ? "var(--accent)" : "var(--surface2)",
                      color: u.role === "admin" ? "#fff" : "var(--text-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: "0.72rem",
                    }}>
                      {u.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.name}
                        {isSelf && <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginLeft: "0.4rem" }}>(you)</span>}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                        {allowedApps.length === ALL_APPS.length ? "All apps" : allowedApps.length === 0 ? "No apps" : `${allowedApps.length} of ${ALL_APPS.length} apps`}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Joined {fmtDate(u.createdAt)}</div>
                        {isSelf ? (
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--accent-light)", background: "rgba(108,99,255,0.15)", borderRadius: 4, padding: "0.15rem 0.45rem" }}>ADMIN</span>
                        ) : (
                          <button
                            onClick={() => toggleRole(u)}
                            style={{
                              fontSize: "0.68rem", fontWeight: 600, padding: "0.2rem 0.6rem",
                              borderRadius: 6, border: "1px solid", cursor: "pointer",
                              background: u.role === "admin" ? "rgba(248,113,113,0.1)" : "rgba(108,99,255,0.1)",
                              borderColor: u.role === "admin" ? "rgba(248,113,113,0.3)" : "rgba(108,99,255,0.3)",
                              color: u.role === "admin" ? "var(--error)" : "var(--accent-light)",
                            }}
                          >
                            {u.role === "admin" ? "Remove Admin" : "Make Admin"}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setExpanded(s => ({ ...s, [u.id]: !s[u.id] }))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.25rem", display: "flex", alignItems: "center" }}
                        title="App permissions"
                      >
                        <ChevronDown size={16} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                      </button>
                    </div>
                  </div>

                  {/* App permissions panel */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "0.75rem 1rem", background: "var(--surface)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>App Access</span>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button onClick={() => grantAll(u)} style={{ fontSize: "0.68rem", color: "var(--success)", background: "none", border: "1px solid var(--success)", borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer" }}>Grant All</button>
                          <button onClick={() => revokeAll(u)} style={{ fontSize: "0.68rem", color: "var(--error)", background: "none", border: "1px solid var(--error)", borderRadius: 4, padding: "0.15rem 0.5rem", cursor: "pointer" }}>Revoke All</button>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                        {ALL_APPS.map(app => {
                          const has = allowedApps.includes(app.key);
                          return (
                            <button
                              key={app.key}
                              onClick={() => toggleApp(u, app.key)}
                              style={{
                                fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.65rem",
                                borderRadius: 20, border: "1px solid", cursor: "pointer",
                                background: has ? "rgba(16,185,129,0.12)" : "var(--surface2)",
                                borderColor: has ? "rgba(16,185,129,0.4)" : "var(--border)",
                                color: has ? "var(--success)" : "var(--text-muted)",
                                transition: "all 0.15s",
                              }}
                            >
                              {has ? "✓ " : ""}{app.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const decoded = getAuthUser(ctx.req);
  if (!decoded) return { redirect: { destination: "/login", permanent: false } };
  try {
    await connectDB();
    const user = await User.findById(decoded.userId).lean();
    if (!user || user.role !== "admin") return { redirect: { destination: "/dashboard", permanent: false } };
    return { props: { user: { id: user._id.toString(), name: user.name, email: user.email, role: "admin" } } };
  } catch {
    return { redirect: { destination: "/login", permanent: false } };
  }
}
