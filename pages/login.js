import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Hexagon } from "lucide-react";
import { getAuthUser } from "../lib/auth";

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Hexagon size={24} color="#6c63ff" strokeWidth={2} />
          </div>
          <span className="auth-logo-name">BaseApp</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account to continue.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              name="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.45rem",
              }}
            >
              <label className="form-label" style={{ margin: 0 }}>
                Password
              </label>
              <Link
                href="/forgot-password"
                style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
              >
                Forgot password?
              </Link>
            </div>
            <input
              className="form-input"
              type="password"
              name="password"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="auth-divider">
          No account yet? <Link href="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const user = getAuthUser(ctx.req);
  if (user)
    return { redirect: { destination: "/dashboard", permanent: false } };
  return { props: {} };
}
