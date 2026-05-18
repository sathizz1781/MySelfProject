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

// ── PPF ────────────────────────────────────────────────────────────────────────
function PPFCalc() {
  const [annual, setAnnual] = useState("150000");
  const [rate, setRate]     = useState("7.1");
  const [years, setYears]   = useState("15");

  const A = Math.min(Number(annual) || 0, 150000);
  const R = (Number(rate) || 0) / 100;
  const Y = Math.max(1, Math.min(Number(years) || 15, 50));
  let balance = 0;
  const yearRows = [];
  for (let y = 1; y <= Y; y++) {
    const interest = Math.round((balance + A) * R);
    balance = balance + A + interest;
    yearRows.push({ year: y, deposit: A, interest, balance });
  }
  const totalDeposited = A * Y;
  const totalInterest  = balance - totalDeposited;

  return (
    <div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">Annual Investment (₹, max 1.5L)</label>
          <input className="form-input" type="number" value={annual} onChange={e => setAnnual(e.target.value)} placeholder="150000" />
          <PillRow values={[50000, 75000, 100000, 125000, 150000]} active={annual} onSelect={setAnnual} format={v => `₹${(v/1000).toFixed(0)}k`} />
        </div>
        <div className="form-group">
          <label className="form-label">Interest Rate (% p.a.) — current 7.1%</label>
          <input className="form-input" type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} placeholder="7.1" />
          <PillRow values={[7.1, 7.5, 8, 8.5]} active={rate} onSelect={setRate} format={v => `${v}%`} />
        </div>
        <div className="form-group">
          <label className="form-label">Tenure (years, min 15)</label>
          <input className="form-input" type="number" min="15" max="50" value={years} onChange={e => setYears(e.target.value)} placeholder="15" />
          <PillRow values={[15, 20, 25, 30]} active={years} onSelect={setYears} format={v => `${v}y`} />
        </div>
      </div>

      {A > 0 && Y >= 15 && (
        <>
          <ResultCard
            hero={fmtINR(balance)}
            heroLabel="Maturity Value"
            rows={[
              { label: "Total Deposited",  value: fmtINR(totalDeposited) },
              { label: "Total Interest",   value: `+${fmtINR(totalInterest)}`, color: "var(--success)" },
              { label: "Maturity Amount",  value: fmtINR(balance), bold: true },
              { label: "Effective Return", value: `${((totalInterest / totalDeposited) * 100).toFixed(1)}%` },
            ]}
          />
          <SplitBar leftPct={pct(totalDeposited, balance)} leftLabel="Deposited" rightLabel="Interest" leftColor="var(--accent-light)" rightColor="var(--success)" />
        </>
      )}
    </div>
  );
}

// ── Step-up SIP ────────────────────────────────────────────────────────────────
function StepUpSIPCalc() {
  const [monthly, setMonthly] = useState("5000");
  const [stepPct, setStepPct] = useState("10");
  const [rate, setRate]       = useState("12");
  const [years, setYears]     = useState("15");

  const M = Number(monthly) || 0;
  const S = (Number(stepPct) || 0) / 100;
  const R = (Number(rate) || 0) / 100 / 12;
  const Y = Number(years) || 0;

  let invested = 0, corpus = 0, currentSIP = M;
  for (let y = 0; y < Y; y++) {
    for (let m = 0; m < 12; m++) {
      corpus = (corpus + currentSIP) * (1 + R);
      invested += currentSIP;
    }
    currentSIP = Math.round(currentSIP * (1 + S));
  }
  const gain = corpus - invested;

  return (
    <div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">Starting Monthly SIP (₹)</label>
          <input className="form-input" type="number" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="5000" />
          <PillRow values={[1000, 3000, 5000, 10000, 25000]} active={monthly} onSelect={setMonthly} format={v => `₹${(v/1000).toFixed(0)}k`} />
        </div>
        <div className="form-group">
          <label className="form-label">Annual Step-up (%)</label>
          <input className="form-input" type="number" step="1" value={stepPct} onChange={e => setStepPct(e.target.value)} placeholder="10" />
          <PillRow values={[5, 10, 15, 20]} active={stepPct} onSelect={setStepPct} format={v => `${v}%`} />
        </div>
        <div className="form-group">
          <label className="form-label">Expected Return (% p.a.)</label>
          <input className="form-input" type="number" step="0.5" value={rate} onChange={e => setRate(e.target.value)} placeholder="12" />
          <PillRow values={[8, 10, 12, 15]} active={rate} onSelect={setRate} format={v => `${v}%`} />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (years)</label>
          <input className="form-input" type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="15" />
          <PillRow values={[5, 10, 15, 20, 30]} active={years} onSelect={setYears} format={v => `${v}y`} />
        </div>
      </div>

      {M > 0 && Y > 0 && (
        <>
          <ResultCard
            hero={fmtINR(corpus)}
            heroLabel="Estimated Corpus"
            rows={[
              { label: "Starting SIP",     value: fmtINR(M) + "/mo" },
              { label: `SIP after ${Y}y`,  value: fmtINR(currentSIP / (1 + S)) + "/mo" },
              { label: "Total Invested",   value: fmtINR(invested) },
              { label: "Estimated Gains",  value: `+${fmtINR(gain)}`, color: "var(--success)" },
              { label: "Corpus",           value: fmtINR(corpus), bold: true },
            ]}
          />
          <SplitBar leftPct={pct(invested, corpus)} leftLabel="Invested" rightLabel="Gains" leftColor="var(--accent-light)" rightColor="var(--success)" />
        </>
      )}
    </div>
  );
}

// ── Goal SIP ───────────────────────────────────────────────────────────────────
function GoalSIPCalc() {
  const [target, setTarget]   = useState("5000000");
  const [rate, setRate]       = useState("12");
  const [years, setYears]     = useState("15");
  const [existing, setExisting] = useState("0");

  const T = Number(target) || 0;
  const R = (Number(rate) || 0) / 100 / 12;
  const N = (Number(years) || 0) * 12;
  const E = Number(existing) || 0;
  const futureExisting = E * Math.pow(1 + R, N);
  const remaining = Math.max(0, T - futureExisting);
  const sip = R > 0 && N > 0
    ? remaining * R / (Math.pow(1 + R, N) - 1)
    : N > 0 ? remaining / N : 0;
  const totalInvested = sip * N + E;
  const gains = T - totalInvested;

  return (
    <div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">Target Amount (₹)</label>
          <input className="form-input" type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="5000000" />
          <PillRow values={[500000, 1000000, 2500000, 5000000, 10000000]} active={target} onSelect={setTarget} format={v => v >= 10000000 ? `₹${v/10000000}Cr` : `₹${v/100000}L`} />
        </div>
        <div className="form-group">
          <label className="form-label">Expected Return (% p.a.)</label>
          <input className="form-input" type="number" step="0.5" value={rate} onChange={e => setRate(e.target.value)} placeholder="12" />
          <PillRow values={[8, 10, 12, 15]} active={rate} onSelect={setRate} format={v => `${v}%`} />
        </div>
        <div className="form-group">
          <label className="form-label">Time to Goal (years)</label>
          <input className="form-input" type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="15" />
          <PillRow values={[5, 10, 15, 20, 25, 30]} active={years} onSelect={setYears} format={v => `${v}y`} />
        </div>
        <div className="form-group">
          <label className="form-label">Existing Savings (₹) — optional</label>
          <input className="form-input" type="number" value={existing} onChange={e => setExisting(e.target.value)} placeholder="0" />
        </div>
      </div>

      {T > 0 && N > 0 && (
        <ResultCard
          hero={fmtINR(sip)}
          heroLabel="Monthly SIP Required"
          rows={[
            { label: "Target Corpus",    value: fmtINR(T) },
            { label: "Existing savings", value: fmtINR(E) },
            { label: "Future value of existing", value: fmtINR(futureExisting) },
            { label: "SIP needed",       value: fmtINR(sip) + "/mo", bold: true },
            { label: "Total you invest", value: fmtINR(totalInvested) },
            { label: "Estimated gains",  value: `+${fmtINR(Math.max(0, gains))}`, color: "var(--success)" },
          ]}
        />
      )}
    </div>
  );
}

// ── CAGR ───────────────────────────────────────────────────────────────────────
function CAGRCalc() {
  const [initial, setInitial] = useState("100000");
  const [final, setFinal]     = useState("250000");
  const [years, setYears]     = useState("5");

  const I = Number(initial) || 0;
  const F = Number(final) || 0;
  const Y = Number(years) || 0;
  const cagr = I > 0 && Y > 0 && F > 0 ? (Math.pow(F / I, 1 / Y) - 1) * 100 : 0;
  const absoluteReturn = I > 0 ? ((F - I) / I) * 100 : 0;
  const gain = F - I;

  return (
    <div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">Initial Investment (₹)</label>
          <input className="form-input" type="number" value={initial} onChange={e => setInitial(e.target.value)} placeholder="100000" />
        </div>
        <div className="form-group">
          <label className="form-label">Final Value (₹)</label>
          <input className="form-input" type="number" value={final} onChange={e => setFinal(e.target.value)} placeholder="250000" />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (years)</label>
          <input className="form-input" type="number" step="0.5" value={years} onChange={e => setYears(e.target.value)} placeholder="5" />
          <PillRow values={[1, 2, 3, 5, 7, 10, 15]} active={years} onSelect={setYears} format={v => `${v}y`} />
        </div>
      </div>

      {I > 0 && F > 0 && Y > 0 && (
        <ResultCard
          hero={`${cagr.toFixed(2)}%`}
          heroLabel="CAGR (Compound Annual Growth Rate)"
          rows={[
            { label: "Initial Investment",  value: fmtINR(I) },
            { label: "Final Value",         value: fmtINR(F) },
            { label: "Gain / Loss",         value: `${gain >= 0 ? "+" : ""}${fmtINR(gain)}`, color: gain >= 0 ? "var(--success)" : "var(--error)" },
            { label: "Absolute Return",     value: `${absoluteReturn.toFixed(2)}%`, color: absoluteReturn >= 0 ? "var(--success)" : "var(--error)" },
            { label: "CAGR",               value: `${cagr.toFixed(2)}%`, bold: true, color: cagr >= 0 ? "var(--success)" : "var(--error)" },
          ]}
        />
      )}
    </div>
  );
}

// ── Inflation ──────────────────────────────────────────────────────────────────
function InflationCalc() {
  const [amount, setAmount]     = useState("100000");
  const [rate, setRate]         = useState("6");
  const [years, setYears]       = useState("10");
  const [mode, setMode]         = useState("future"); // future | present

  const A = Number(amount) || 0;
  const R = (Number(rate) || 0) / 100;
  const Y = Number(years) || 0;
  const futureValue   = A * Math.pow(1 + R, Y);
  const presentValue  = A / Math.pow(1 + R, Y);
  const result = mode === "future" ? futureValue : presentValue;
  const diff   = mode === "future" ? futureValue - A : A - presentValue;

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {[{ v: "future", label: "Future Cost" }, { v: "present", label: "Present Value" }].map(({ v, label }) => (
          <button key={v} type="button" onClick={() => setMode(v)}
            style={{ flex: 1, padding: "0.4rem", borderRadius: "var(--radius)", border: `1.5px solid ${mode === v ? "var(--accent)" : "var(--border)"}`, background: mode === v ? "var(--accent-dim)" : "var(--surface2)", color: mode === v ? "var(--accent-light)" : "var(--text-muted)", fontSize: "0.82rem", cursor: "pointer", fontWeight: 700, transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">{mode === "future" ? "Today's Cost (₹)" : "Future Amount (₹)"}</label>
          <input className="form-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100000" />
        </div>
        <div className="form-group">
          <label className="form-label">Inflation Rate (% p.a.)</label>
          <input className="form-input" type="number" step="0.5" value={rate} onChange={e => setRate(e.target.value)} placeholder="6" />
          <PillRow values={[4, 5, 6, 7, 8]} active={rate} onSelect={setRate} format={v => `${v}%`} />
        </div>
        <div className="form-group">
          <label className="form-label">Years</label>
          <input className="form-input" type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="10" />
          <PillRow values={[5, 10, 15, 20, 25, 30]} active={years} onSelect={setYears} format={v => `${v}y`} />
        </div>
      </div>

      {A > 0 && Y > 0 && (
        <ResultCard
          hero={fmtINR(result)}
          heroLabel={mode === "future" ? `Cost after ${Y} years at ${rate}% inflation` : `Today's worth of that amount`}
          rows={[
            { label: mode === "future" ? "Today's Cost" : "Future Amount",   value: fmtINR(A) },
            { label: mode === "future" ? "Inflation Impact" : "Purchasing Power Lost", value: fmtINR(diff), color: "var(--error)" },
            { label: mode === "future" ? `Future Cost (${Y}y)` : `Present Value (${Y}y ago)`, value: fmtINR(result), bold: true },
          ]}
        />
      )}
    </div>
  );
}

// ── Income Tax ─────────────────────────────────────────────────────────────────
function IncomeTaxCalc() {
  const [income, setIncome]   = useState("1200000");
  const [regime, setRegime]   = useState("new");
  const [deductions, setDeductions] = useState("150000"); // 80C etc. for old regime

  const gross = Number(income) || 0;
  const ded   = Number(deductions) || 0;

  function calcNew(gross) {
    const std = 75000; // standard deduction FY 2025-26
    const taxable = Math.max(0, gross - std);
    if (taxable <= 1200000) return 0; // rebate u/s 87A for new regime
    const slabs = [[400000,0],[400000,0.05],[400000,0.1],[400000,0.15],[400000,0.2],[Infinity,0.3]];
    let tax = 0, remaining = taxable;
    for (const [limit, rate] of slabs) {
      const chunk = Math.min(remaining, limit);
      tax += chunk * rate;
      remaining -= chunk;
      if (remaining <= 0) break;
    }
    return tax * 1.04; // 4% cess
  }

  function calcOld(gross, ded) {
    const std = 50000;
    const taxable = Math.max(0, gross - std - ded);
    if (taxable <= 500000) return 0; // rebate u/s 87A
    const slabs = [[250000,0],[250000,0.05],[500000,0.2],[Infinity,0.3]];
    let tax = 0, remaining = taxable;
    for (const [limit, rate] of slabs) {
      const chunk = Math.min(remaining, limit);
      tax += chunk * rate;
      remaining -= chunk;
      if (remaining <= 0) break;
    }
    return tax * 1.04;
  }

  const taxNew     = calcNew(gross);
  const taxOld     = calcOld(gross, ded);
  const tax        = regime === "new" ? taxNew : taxOld;
  const stdDed     = regime === "new" ? 75000 : 50000;
  const taxable    = Math.max(0, gross - stdDed - (regime === "old" ? ded : 0));
  const effective  = gross > 0 ? (tax / gross) * 100 : 0;
  const inHand     = gross - tax;
  const better     = taxNew <= taxOld ? "new" : "old";

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {[{ v: "new", label: "New Regime" }, { v: "old", label: "Old Regime" }].map(({ v, label }) => (
          <button key={v} type="button" onClick={() => setRegime(v)}
            style={{ flex: 1, padding: "0.4rem", borderRadius: "var(--radius)", border: `1.5px solid ${regime === v ? "var(--accent)" : "var(--border)"}`, background: regime === v ? "var(--accent-dim)" : "var(--surface2)", color: regime === v ? "var(--accent-light)" : "var(--text-muted)", fontSize: "0.82rem", cursor: "pointer", fontWeight: 700, transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>
      <div className="calc-grid">
        <div className="form-group">
          <label className="form-label">Annual Gross Income (₹)</label>
          <input className="form-input" type="number" value={income} onChange={e => setIncome(e.target.value)} placeholder="1200000" />
          <PillRow values={[600000, 900000, 1200000, 1500000, 2000000, 3000000]} active={income} onSelect={setIncome} format={v => `₹${v/100000}L`} />
        </div>
        {regime === "old" && (
          <div className="form-group">
            <label className="form-label">Deductions (80C, 80D, HRA, etc. ₹)</label>
            <input className="form-input" type="number" value={deductions} onChange={e => setDeductions(e.target.value)} placeholder="150000" />
            <PillRow values={[50000, 100000, 150000, 200000, 300000]} active={deductions} onSelect={setDeductions} format={v => `₹${v/1000}k`} />
          </div>
        )}
      </div>

      {gross > 0 && (
        <>
          <ResultCard
            hero={fmtINR(tax)}
            heroLabel={`Tax Payable — ${regime === "new" ? "New" : "Old"} Regime (FY 2025-26)`}
            rows={[
              { label: "Gross Income",       value: fmtINR(gross) },
              { label: "Standard Deduction", value: `−${fmtINR(stdDed)}` },
              ...(regime === "old" ? [{ label: "Other Deductions", value: `−${fmtINR(ded)}` }] : []),
              { label: "Taxable Income",     value: fmtINR(taxable) },
              { label: "Tax + 4% Cess",      value: fmtINR(tax), color: "var(--error)" },
              { label: "Effective Rate",     value: `${effective.toFixed(2)}%` },
              { label: "In-hand (annual)",   value: fmtINR(inHand), bold: true },
              { label: "In-hand (monthly)",  value: fmtINR(inHand / 12), bold: true },
            ]}
          />
          <div style={{ marginTop: "0.75rem", padding: "0.65rem 0.85rem", background: better === regime ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.07)", border: `1px solid ${better === regime ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`, borderRadius: "var(--radius)", fontSize: "0.78rem" }}>
            <strong style={{ color: better === regime ? "var(--success)" : "var(--error)" }}>
              {better === regime ? "✓ You are on the better regime." : `Switch to ${better === "new" ? "New" : "Old"} Regime to save ${fmtINR(Math.abs(taxNew - taxOld))}.`}
            </strong>
            <div style={{ color: "var(--text-muted)", marginTop: "0.2rem", fontSize: "0.72rem" }}>New: {fmtINR(taxNew)} &nbsp;·&nbsp; Old: {fmtINR(taxOld)}</div>
          </div>
        </>
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
  { key: "ppf",      label: "PPF" },
  { key: "stepup",   label: "Step-up SIP" },
  { key: "goal",     label: "Goal SIP" },
  { key: "cagr",     label: "CAGR" },
  { key: "inflation",label: "Inflation" },
  { key: "tax",      label: "Tax" },
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

      {/* Custom scrollable tab bar — NOT using .tabs/.tab so it stays visible on mobile */}
      <div style={{
        display: "flex", overflowX: "auto", gap: "0.35rem",
        padding: "0.6rem 1rem", borderBottom: "1px solid var(--border)",
        background: "rgba(8,8,8,0.8)", flexShrink: 0,
        scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "0.35rem 0.85rem", borderRadius: 20, border: "1.5px solid",
              whiteSpace: "nowrap", fontSize: "0.78rem", cursor: "pointer",
              fontFamily: "var(--font)", fontWeight: activeTab === t.key ? 700 : 500,
              transition: "all 0.15s", flexShrink: 0,
              borderColor: activeTab === t.key ? "var(--accent)" : "var(--border)",
              background:  activeTab === t.key ? "rgba(108,99,255,0.15)" : "transparent",
              color:       activeTab === t.key ? "var(--accent-light)" : "var(--text-muted)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === "emi"       && <EMICalc />}
        {activeTab === "sip"       && <SIPCalc />}
        {activeTab === "lumpsum"   && <LumpSumCalc />}
        {activeTab === "fd"        && <FDCalc />}
        {activeTab === "rd"        && <RDCalc />}
        {activeTab === "gold"      && <GoldLoanCalc />}
        {activeTab === "simple"    && <SimpleInterestCalc />}
        {activeTab === "ppf"       && <PPFCalc />}
        {activeTab === "stepup"    && <StepUpSIPCalc />}
        {activeTab === "goal"      && <GoalSIPCalc />}
        {activeTab === "cagr"      && <CAGRCalc />}
        {activeTab === "inflation" && <InflationCalc />}
        {activeTab === "tax"       && <IncomeTaxCalc />}
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
