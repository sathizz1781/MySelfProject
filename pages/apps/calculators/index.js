import { useState } from "react";
import Link from "next/link";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/mongodb";
import User from "../../../models/User";
import ThemePicker from "../../../components/ThemePicker";

function fmtINR(n) {
  if (isNaN(n) || !isFinite(n)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function calcAmortization(principal, annualRate, tenureMonths) {
  const r = annualRate / 100 / 12;
  const emi = r > 0
    ? principal * r * Math.pow(1 + r, tenureMonths) / (Math.pow(1 + r, tenureMonths) - 1)
    : principal / tenureMonths;
  let bal = principal;
  return Array.from({ length: tenureMonths }, (_, i) => {
    const interest = bal * r;
    const princ = Math.min(emi - interest, bal);
    bal = Math.max(0, bal - princ);
    return { month: i + 1, emi, principal: princ, interest, balance: bal };
  });
}

function pct(a, total) {
  return total > 0 ? Math.round((a / total) * 100) : 0;
}

function SplitBar({ leftPct, leftLabel, rightLabel, leftColor = "var(--success)", rightColor = "var(--error)" }) {
  const lp = Math.min(Math.max(leftPct, 0), 100);
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.67rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
        <span style={{ color: leftColor }}>{leftLabel} · {lp}%</span>
        <span style={{ color: rightColor }}>{rightLabel} · {100 - lp}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, overflow: "hidden", background: rightColor, display: "flex" }}>
        <div style={{ width: `${lp}%`, background: leftColor, borderRadius: "4px 0 0 4px", transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}

function ResultCard({ hero, heroLabel, rows }) {
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border-hover)", borderRadius: "var(--radius-lg)", padding: "1.25rem", marginTop: "1.25rem" }}>
      <div style={{ textAlign: "center", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{heroLabel}</div>
        <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--accent-light)", letterSpacing: "-0.04em" }}>{hero}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", ...(r.bold ? { fontWeight: 700, borderTop: "1px solid var(--border)", paddingTop: "0.5rem", marginTop: "0.25rem" } : {}) }}>
            <span style={{ color: r.bold ? "var(--text)" : "var(--text-dim)" }}>{r.label}</span>
            <span style={{ color: r.color || (r.bold ? "var(--text)" : "var(--text-dim)"), fontWeight: r.bold ? 700 : 500 }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PillRow({ values, active, onSelect, format = v => v }) {
  return (
    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
      {values.map(v => (
        <button key={v} type="button" onClick={() => onSelect(String(v))} style={{ padding: "0.2rem 0.6rem", borderRadius: 20, border: `1px solid ${String(active) === String(v) ? "var(--accent)" : "var(--border)"}`, background: String(active) === String(v) ? "var(--accent-dim)" : "none", color: String(active) === String(v) ? "var(--accent-light)" : "var(--text-muted)", fontSize: "0.67rem", cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.15s" }}>
          {format(v)}
        </button>
      ))}
    </div>
  );
}

// ── EMI ────────────────────────────────────────────────────────────────────────
function EMICalc() {
  const [p, setP] = useState("500000");
  const [r, setR] = useState("8.5");
  const [n, setN] = useState("60");
  const [showSched, setShowSched] = useState(false);

  const P = Number(p) || 0, R = Number(r) || 0, N = Number(n) || 0;
  let emi = 0, totalInterest = 0, totalPayable = 0;
  if (P > 0 && N > 0) {
    if (R > 0) {
      const mr = R / 100 / 12;
      emi = P * mr * Math.pow(1 + mr, N) / (Math.pow(1 + mr, N) - 1);
    } else {
      emi = P / N;
    }
    totalPayable = emi * N;
    totalInterest = totalPayable - P;
  }

  const rows = emi > 0 && showSched ? calcAmortization(P, R, N) : [];
  const col = { padding: "0.5rem 0.6rem", fontSize: "0.72rem", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
  const hdr = { ...col, fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", background: "var(--surface3)" };

  return (
    <div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">Loan Amount (₹)</label>
          <input className="form-input" type="number" value={p} onChange={e => setP(e.target.value)} placeholder="500000" />
        </div>
        <div className="form-group">
          <label className="form-label">Interest Rate (% p.a.)</label>
          <input className="form-input" type="number" step="0.1" value={r} onChange={e => setR(e.target.value)} placeholder="8.5" />
          <PillRow values={[6.5, 7.5, 8.5, 9.5, 10.5, 12]} active={r} onSelect={setR} format={v => `${v}%`} />
        </div>
        <div className="form-group">
          <label className="form-label">Tenure (months)</label>
          <input className="form-input" type="number" value={n} onChange={e => setN(e.target.value)} placeholder="60" />
          <PillRow values={[12, 24, 36, 60, 84, 120, 180, 240, 360]} active={n} onSelect={setN} format={v => v >= 12 ? `${v / 12}y` : `${v}m`} />
        </div>
      </div>

      {emi > 0 && (
        <>
          <ResultCard
            hero={fmtINR(emi)}
            heroLabel="Monthly EMI (Reducing Balance)"
            rows={[
              { label: "Principal",      value: fmtINR(P) },
              { label: "Total Interest", value: fmtINR(totalInterest), color: "var(--error)" },
              { label: "Total Payable",  value: fmtINR(totalPayable), bold: true },
            ]}
          />
          <SplitBar leftPct={pct(P, totalPayable)} leftLabel="Principal" rightLabel="Interest" leftColor="var(--success)" rightColor="var(--error)" />

          {/* Schedule toggle */}
          <button
            onClick={() => setShowSched(v => !v)}
            style={{ marginTop: "1rem", width: "100%", padding: "0.55rem", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text-dim)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500 }}
          >
            {showSched ? "▲ Hide" : "▼ Show"} Amortization Schedule
          </button>

          {showSched && rows.length > 0 && (
            <div style={{ marginTop: "0.75rem", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
              <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr>
                      {["#", "EMI", "Principal", "Interest", "Balance"].map(h => (
                        <th key={h} style={{ ...hdr, textAlign: h === "#" ? "left" : "right", paddingLeft: h === "#" ? "0.9rem" : col.padding, paddingRight: h === "Balance" ? "0.9rem" : col.padding }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                        <td style={{ ...col, textAlign: "left", paddingLeft: "0.9rem", color: "var(--text-muted)" }}>{row.month}</td>
                        <td style={{ ...col, textAlign: "right", fontWeight: 500 }}>{fmtINR(row.emi)}</td>
                        <td style={{ ...col, textAlign: "right", color: "var(--success)" }}>{fmtINR(row.principal)}</td>
                        <td style={{ ...col, textAlign: "right", color: "var(--error)" }}>{fmtINR(row.interest)}</td>
                        <td style={{ ...col, textAlign: "right", fontWeight: 600, paddingRight: "0.9rem" }}>{fmtINR(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── SIP ────────────────────────────────────────────────────────────────────────
function SIPCalc() {
  const [monthly, setMonthly] = useState("10000");
  const [rate, setRate] = useState("12");
  const [years, setYears] = useState("10");

  const M = Number(monthly) || 0, R = Number(rate) || 0, Y = Number(years) || 0;
  const N = Y * 12;
  const invested = M * N;
  let totalValue = invested, returns = 0;
  if (M > 0 && R > 0 && N > 0) {
    const mr = R / 100 / 12;
    totalValue = M * ((Math.pow(1 + mr, N) - 1) / mr) * (1 + mr);
    returns = totalValue - invested;
  }

  return (
    <div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">Monthly SIP (₹)</label>
          <input className="form-input" type="number" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="10000" />
          <PillRow values={[1000, 2000, 5000, 10000, 25000, 50000]} active={monthly} onSelect={setMonthly} format={v => `₹${(v / 1000).toFixed(0)}k`} />
        </div>
        <div className="form-group">
          <label className="form-label">Expected Return (% p.a.)</label>
          <input className="form-input" type="number" step="0.5" value={rate} onChange={e => setRate(e.target.value)} placeholder="12" />
          <PillRow values={[8, 10, 12, 14, 16, 18]} active={rate} onSelect={setRate} format={v => `${v}%`} />
        </div>
        <div className="form-group">
          <label className="form-label">Investment Period (years)</label>
          <input className="form-input" type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="10" />
          <PillRow values={[1, 3, 5, 7, 10, 15, 20, 25, 30]} active={years} onSelect={setYears} format={v => `${v}y`} />
        </div>
      </div>

      {invested > 0 && Y > 0 && (
        <>
          <ResultCard
            hero={fmtINR(totalValue)}
            heroLabel="Estimated Corpus"
            rows={[
              { label: "Invested Amount", value: fmtINR(invested) },
              { label: "Est. Returns",    value: `+${fmtINR(returns)}`, color: "var(--success)" },
              { label: "Total Value",     value: fmtINR(totalValue), bold: true },
            ]}
          />
          <SplitBar leftPct={pct(invested, totalValue)} leftLabel="Invested" rightLabel="Returns" leftColor="var(--text-muted)" rightColor="var(--success)" />
        </>
      )}
    </div>
  );
}

// ── Lump Sum ───────────────────────────────────────────────────────────────────
function LumpSumCalc() {
  const [amount, setAmount] = useState("100000");
  const [rate, setRate] = useState("12");
  const [years, setYears] = useState("5");

  const P = Number(amount) || 0, R = Number(rate) || 0, Y = Number(years) || 0;
  const totalValue = P > 0 && R > 0 && Y > 0 ? P * Math.pow(1 + R / 100, Y) : P;
  const returns = totalValue - P;

  return (
    <div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">Investment Amount (₹)</label>
          <input className="form-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100000" />
        </div>
        <div className="form-group">
          <label className="form-label">Expected Return (% p.a.)</label>
          <input className="form-input" type="number" step="0.5" value={rate} onChange={e => setRate(e.target.value)} placeholder="12" />
          <PillRow values={[8, 10, 12, 14, 16, 18]} active={rate} onSelect={setRate} format={v => `${v}%`} />
        </div>
        <div className="form-group">
          <label className="form-label">Investment Period (years)</label>
          <input className="form-input" type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="5" />
          <PillRow values={[1, 2, 3, 5, 7, 10, 15, 20]} active={years} onSelect={setYears} format={v => `${v}y`} />
        </div>
      </div>

      {P > 0 && Y > 0 && (
        <>
          <ResultCard
            hero={fmtINR(totalValue)}
            heroLabel="Maturity Value"
            rows={[
              { label: "Invested",     value: fmtINR(P) },
              { label: "Est. Returns", value: `+${fmtINR(returns)}`, color: "var(--success)" },
              { label: "Total Value",  value: fmtINR(totalValue), bold: true },
            ]}
          />
          <SplitBar leftPct={pct(P, totalValue)} leftLabel="Invested" rightLabel="Returns" leftColor="var(--text-muted)" rightColor="var(--success)" />
        </>
      )}
    </div>
  );
}

// ── FD ─────────────────────────────────────────────────────────────────────────
function FDCalc() {
  const [principal, setPrincipal] = useState("100000");
  const [rate, setRate] = useState("7");
  const [years, setYears] = useState("1");
  const [months, setMonths] = useState("0");
  const [freq, setFreq] = useState("4");

  const P = Number(principal) || 0, R = Number(rate) || 0;
  const Y = (Number(years) || 0) + (Number(months) || 0) / 12;
  const n = Number(freq) || 1;

  let maturity = 0, interest = 0;
  if (P > 0 && R > 0 && Y > 0) {
    maturity = P * Math.pow(1 + R / 100 / n, n * Y);
    interest = maturity - P;
  }

  return (
    <div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">Principal (₹)</label>
          <input className="form-input" type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="100000" />
        </div>
        <div className="form-group">
          <label className="form-label">Interest Rate (% p.a.)</label>
          <input className="form-input" type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} placeholder="7" />
          <PillRow values={[5.5, 6, 6.5, 7, 7.5, 8]} active={rate} onSelect={setRate} format={v => `${v}%`} />
        </div>
        <div className="form-group">
          <label className="form-label">Duration</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <div style={{ flex: 1 }}>
              <input className="form-input" type="number" min="0" value={years} onChange={e => setYears(e.target.value)} placeholder="0" />
              <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Years</div>
            </div>
            <div style={{ flex: 1 }}>
              <input className="form-input" type="number" min="0" max="11" value={months} onChange={e => setMonths(e.target.value)} placeholder="0" />
              <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Months</div>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Compounding</label>
          <select className="form-input" value={freq} onChange={e => setFreq(e.target.value)}>
            <option value="1">Annually</option>
            <option value="2">Half-Yearly</option>
            <option value="4">Quarterly</option>
            <option value="12">Monthly</option>
          </select>
        </div>
      </div>

      {maturity > 0 && (
        <ResultCard
          hero={fmtINR(maturity)}
          heroLabel="Maturity Amount"
          rows={[
            { label: "Principal",       value: fmtINR(P) },
            { label: "Interest Earned", value: `+${fmtINR(interest)}`, color: "var(--success)" },
            { label: "Maturity Amount", value: fmtINR(maturity), bold: true },
          ]}
        />
      )}
    </div>
  );
}

// ── RD ─────────────────────────────────────────────────────────────────────────
function RDCalc() {
  const [monthly, setMonthly] = useState("5000");
  const [rate, setRate] = useState("6.5");
  const [months, setMonths] = useState("12");

  const M = Number(monthly) || 0, R = Number(rate) || 0, N = Number(months) || 0;
  const invested = M * N;
  let maturity = 0;
  if (M > 0 && R > 0 && N > 0) {
    const mr = R / 400; // quarterly compounding standard for RD
    maturity = M * (Math.pow(1 + mr, N) - 1) / (1 - Math.pow(1 + mr, -1 / 3));
  }
  const interest = maturity - invested;

  return (
    <div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">Monthly Deposit (₹)</label>
          <input className="form-input" type="number" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="5000" />
          <PillRow values={[1000, 2000, 5000, 10000, 25000]} active={monthly} onSelect={setMonthly} format={v => `₹${(v / 1000).toFixed(0)}k`} />
        </div>
        <div className="form-group">
          <label className="form-label">Interest Rate (% p.a.)</label>
          <input className="form-input" type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} placeholder="6.5" />
          <PillRow values={[5.5, 6, 6.5, 7, 7.5]} active={rate} onSelect={setRate} format={v => `${v}%`} />
        </div>
        <div className="form-group">
          <label className="form-label">Tenure (months)</label>
          <input className="form-input" type="number" value={months} onChange={e => setMonths(e.target.value)} placeholder="12" />
          <PillRow values={[6, 12, 24, 36, 48, 60]} active={months} onSelect={setMonths} format={v => v >= 12 ? `${v / 12}y` : `${v}m`} />
        </div>
      </div>

      {maturity > 0 && (
        <ResultCard
          hero={fmtINR(maturity)}
          heroLabel="Maturity Amount"
          rows={[
            { label: "Total Deposited", value: fmtINR(invested) },
            { label: "Interest Earned", value: `+${fmtINR(interest)}`, color: "var(--success)" },
            { label: "Maturity Amount", value: fmtINR(maturity), bold: true },
          ]}
        />
      )}
    </div>
  );
}

// ── Gold Loan ──────────────────────────────────────────────────────────────────
function GoldLoanCalc() {
  const [grams, setGrams] = useState("10");
  const [purity, setPurity] = useState("22");
  const [ratePerGram, setRatePerGram] = useState("7500");
  const [ltv, setLtv] = useState("75");

  const G = Number(grams) || 0, P = Number(purity) || 0;
  const R = Number(ratePerGram) || 0, LTV = Number(ltv) || 75;

  const pureGrams = G * P / 24;
  const goldValue = pureGrams * R;
  const eligibleLoan = goldValue * LTV / 100;

  return (
    <div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">Gold Weight (grams)</label>
          <input className="form-input" type="number" step="0.1" value={grams} onChange={e => setGrams(e.target.value)} placeholder="10" />
        </div>
        <div className="form-group">
          <label className="form-label">Purity (karats)</label>
          <select className="form-input" value={purity} onChange={e => setPurity(e.target.value)}>
            <option value="24">24K (99.9%)</option>
            <option value="22">22K (91.7%)</option>
            <option value="20">20K (83.3%)</option>
            <option value="18">18K (75%)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Market Rate (₹ / gram 24K)</label>
          <input className="form-input" type="number" value={ratePerGram} onChange={e => setRatePerGram(e.target.value)} placeholder="7500" />
        </div>
        <div className="form-group">
          <label className="form-label">LTV Ratio (%)</label>
          <input className="form-input" type="number" min="1" max="90" value={ltv} onChange={e => setLtv(e.target.value)} placeholder="75" />
          <PillRow values={[60, 65, 70, 75]} active={ltv} onSelect={setLtv} format={v => `${v}%`} />
          <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>RBI mandated max: 75%</div>
        </div>
      </div>

      {G > 0 && R > 0 && (
        <ResultCard
          hero={fmtINR(eligibleLoan)}
          heroLabel="Eligible Loan Amount"
          rows={[
            { label: `Pure gold equivalent (${pureGrams.toFixed(2)}g @ 24K)`, value: fmtINR(goldValue) },
            { label: `LTV applied (${LTV}%)`,                                  value: "" },
            { label: "Max Loan",                                               value: fmtINR(eligibleLoan), bold: true },
          ]}
        />
      )}
    </div>
  );
}

// ── Simple Interest ────────────────────────────────────────────────────────────
function SimpleInterestCalc() {
  const [principal, setPrincipal] = useState("50000");
  const [rate, setRate] = useState("10");
  const [years, setYears] = useState("2");

  const P = Number(principal) || 0, R = Number(rate) || 0, T = Number(years) || 0;
  const interest = P * R * T / 100;
  const total = P + interest;

  return (
    <div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">Principal (₹)</label>
          <input className="form-input" type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="50000" />
        </div>
        <div className="form-group">
          <label className="form-label">Interest Rate (% p.a.)</label>
          <input className="form-input" type="number" step="0.5" value={rate} onChange={e => setRate(e.target.value)} placeholder="10" />
        </div>
        <div className="form-group">
          <label className="form-label">Time (years)</label>
          <input className="form-input" type="number" step="0.5" value={years} onChange={e => setYears(e.target.value)} placeholder="2" />
          <PillRow values={[0.5, 1, 2, 3, 5, 7, 10]} active={years} onSelect={setYears} format={v => `${v}y`} />
        </div>
      </div>

      {P > 0 && T > 0 && R > 0 && (
        <ResultCard
          hero={fmtINR(interest)}
          heroLabel="Simple Interest (P × R × T / 100)"
          rows={[
            { label: "Principal",    value: fmtINR(P) },
            { label: "Interest",     value: `+${fmtINR(interest)}`, color: "var(--error)" },
            { label: "Total Amount", value: fmtINR(total), bold: true },
          ]}
        />
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "emi",      label: "EMI" },
  { key: "sip",      label: "SIP" },
  { key: "lumpsum",  label: "Lump Sum" },
  { key: "fd",       label: "FD" },
  { key: "rd",       label: "RD" },
  { key: "gold",     label: "Gold Loan" },
  { key: "simple",   label: "Interest" },
];

export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState("emi");

  return (
    <div className="app-page">
      <nav className="app-nav">
        <Link href="/dashboard" className="app-nav-back">←</Link>
        <h2>Calculators</h2>
        <ThemePicker />
      </nav>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === "emi"     && <EMICalc />}
        {activeTab === "sip"     && <SIPCalc />}
        {activeTab === "lumpsum" && <LumpSumCalc />}
        {activeTab === "fd"      && <FDCalc />}
        {activeTab === "rd"      && <RDCalc />}
        {activeTab === "gold"    && <GoldLoanCalc />}
        {activeTab === "simple"  && <SimpleInterestCalc />}
      </div>
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const decoded = getAuthUser(ctx.req);
  if (!decoded) return { redirect: { destination: "/login", permanent: false } };
  try {
    await connectDB();
    const dbUser = await User.findById(decoded.userId).lean();
    if (!dbUser) return { redirect: { destination: "/login", permanent: false } };
    if (dbUser.role === "admin") return { props: {} };
    const ALL_APPS = ["expenses","health","habits","notes","goals","calendar","reports","calculators"];
    const allowedApps = dbUser.allowedApps?.length ? dbUser.allowedApps : ALL_APPS;
    if (!allowedApps.includes("calculators")) return { redirect: { destination: "/dashboard", permanent: false } };
    return { props: {} };
  } catch {
    return { redirect: { destination: "/login", permanent: false } };
  }
}
