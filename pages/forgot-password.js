import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Hexagon } from "lucide-react";
import { getAuthUser } from "../lib/auth";

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter OTP + new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setSuccess(
          data.otp
            ? `Dev mode — your OTP is: ${data.otp}`
            : "OTP sent! Check your inbox.",
        );
        setStep(2);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      return setError("Passwords do not match.");
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setSuccess(data.message);
        setTimeout(() => router.push("/login"), 2000);
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

        {step === 1 ? (
          <>
            <h1 className="auth-title">Forgot password?</h1>
            <p className="auth-subtitle">
              Enter your email and we&apos;ll send you a 6-digit OTP to reset
              your password.
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  name="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Sending OTP…" : "Send OTP"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="auth-title">Enter your OTP</h1>
            <p className="auth-subtitle">
              We sent a 6-digit code to{" "}
              <strong style={{ color: "var(--text)" }}>{email}</strong>. Enter
              it below along with your new password.
            </p>

            {error && <div className="alert alert-error">{error}</div>}
            {success && !error && (
              <div className="alert alert-success">{success}</div>
            )}

            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">OTP Code</label>
                <input
                  className="form-input"
                  type="text"
                  name="otp"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  style={{ letterSpacing: "0.3em", fontSize: "1.2rem" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  className="form-input"
                  type="password"
                  name="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  className="form-input"
                  type="password"
                  name="confirm"
                  placeholder="Repeat new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </form>

            <p className="auth-divider">
              Didn&apos;t receive it?{" "}
              <button
                onClick={() => {
                  setStep(1);
                  setError("");
                  setSuccess("");
                  setOtp("");
                  setPassword("");
                  setConfirm("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-light)",
                  cursor: "pointer",
                  font: "inherit",
                  padding: 0,
                }}
              >
                Resend OTP
              </button>
            </p>
          </>
        )}

        <p className="auth-divider">
          <Link href="/login">Back to sign in</Link>
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
