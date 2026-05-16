import { useState } from "react";
import { useRouter } from "next/router";
import { getAuthUser } from "../lib/auth";
import connectDB from "../lib/mongodb";
import User from "../models/User";
import AppNav from "../components/AppNav";

export default function ProfilePage({ user: initialUser }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [name, setName] = useState(initialUser.name);
  const [nameMsg, setNameMsg] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  async function saveName(e) {
    e.preventDefault();
    if (!name.trim() || name.trim() === user.name) return;
    setNameSaving(true); setNameMsg("");
    const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    const data = await res.json();
    if (res.ok) { setUser(data.user); setNameMsg("Name updated."); setTimeout(() => setNameMsg(""), 3000); }
    else setNameMsg(data.error || "Failed to update.");
    setNameSaving(false);
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwError(""); setPwMsg("");
    if (!oldPw || !newPw || !confirmPw) return setPwError("All fields are required.");
    if (newPw !== confirmPw) return setPwError("New passwords do not match.");
    if (newPw.length < 6) return setPwError("Password must be at least 6 characters.");
    setPwSaving(true);
    const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }) });
    const data = await res.json();
    if (res.ok) { setPwMsg("Password changed."); setOldPw(""); setNewPw(""); setConfirmPw(""); setTimeout(() => setPwMsg(""), 3000); }
    else setPwError(data.error || "Failed.");
    setPwSaving(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <AppNav user={user} title="Profile" />

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem 1.25rem" }}>

        {/* Avatar */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: "var(--accent)",
            color: "#fff", fontWeight: 800, fontSize: "1.6rem",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem",
          }}>
            {user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{user.name}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{user.email}</div>
          {user.role === "admin" && (
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--accent-light)", background: "rgba(108,99,255,0.15)", borderRadius: 6, padding: "0.15rem 0.5rem", display: "inline-block", marginTop: "0.4rem" }}>ADMIN</span>
          )}
        </div>

        {/* Edit name */}
        <div className="chart-card" style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "1rem" }}>Account Info</div>
          <form onSubmit={saveName}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user.email} readOnly style={{ opacity: 0.6, cursor: "not-allowed" }} />
            </div>
            {nameMsg && <div style={{ fontSize: "0.78rem", color: "var(--success)", marginBottom: "0.5rem" }}>{nameMsg}</div>}
            <button className="btn" type="submit" disabled={nameSaving || name.trim() === user.name} style={{ width: "auto", padding: "0.42rem 1.1rem", fontSize: "0.82rem", marginTop: 0 }}>
              {nameSaving ? "Saving…" : "Save Name"}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="chart-card">
          <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "1rem" }}>Change Password</div>
          <form onSubmit={changePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" />
            </div>
            {pwError && <div className="alert alert-error">{pwError}</div>}
            {pwMsg && <div style={{ fontSize: "0.78rem", color: "var(--success)", marginBottom: "0.5rem" }}>{pwMsg}</div>}
            <button className="btn" type="submit" disabled={pwSaving} style={{ width: "auto", padding: "0.42rem 1.1rem", fontSize: "0.82rem", marginTop: 0 }}>
              {pwSaving ? "Updating…" : "Change Password"}
            </button>
          </form>
        </div>
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
    if (!user) return { redirect: { destination: "/login", permanent: false } };
    return { props: { user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role || "user" } } };
  } catch {
    return { redirect: { destination: "/login", permanent: false } };
  }
}
