import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Download, FileText, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { getAuthUser } from "../../../lib/auth";
import ThemePicker from "../../../components/ThemePicker";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CHART_COLORS = ["#6c63ff","#f97316","#10b981","#f59e0b","#ec4899","#0ea5e9","#8b5cf6","#ef4444","#34d399","#fbbf24"];

const fmt  = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtD = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export default function ReportsPage() {
  const [year, setYear]   = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);

  const [stats, setStats]       = useState(null);
  const [transactions, setTxns] = useState([]);
  const [opening, setOpening]   = useState(0);

  useEffect(() => { fetchAll(); }, [year, month]);

  async function fetchAll() {
    setLoading(true);
    const p = new URLSearchParams({ year: year.toString(), selectedMonth: month.toString() });
    const [sRes, tRes, oRes] = await Promise.all([
      fetch(`/api/expenses/stats?${p}`),
      fetch(`/api/expenses?${p}`),
      fetch(`/api/monthly-balance?year=${year}&month=${month}`),
    ]);
    if (sRes.ok) setStats(await sRes.json());
    if (tRes.ok) setTxns((await tRes.json()).expenses || []);
    if (oRes.ok) setOpening((await oRes.json()).openingBalance || 0);
    setLoading(false);
  }

  const incomes  = transactions.filter(t => t.type === "income");
  const expenses = transactions.filter(t => t.type === "expense");
  const closing  = opening + (stats?.totalIncome || 0) - (stats?.totalExpense || 0);

  function exportCSV() {
    const rows = [
      ["Date", "Type", "Category", "Description", "Merchant", "Amount", "Currency"],
      ...transactions.map(t => [
        fmtD(t.date), t.type, t.category, t.description || "", t.merchant || "",
        Number(t.amount).toFixed(2), t.currency || "INR",
      ]),
      [],
      ["Summary"],
      ["Opening Balance", "", "", "", "", Number(opening).toFixed(2), "INR"],
      ["Total Income",    "", "", "", "", Number(stats?.totalIncome || 0).toFixed(2), "INR"],
      ["Total Expenses",  "", "", "", "", Number(stats?.totalExpense || 0).toFixed(2), "INR"],
      ["Closing Balance", "", "", "", "", Number(closing).toFixed(2), "INR"],
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `report-${year}-${String(month).padStart(2,"0")}.csv`;
    a.click();
  }

  function printReport() {
    window.print();
  }

  const monthLabel = `${MONTHS[month - 1]} ${year}`;

  return (
    <div className="app-page">
      <nav className="app-nav no-print">
        <Link href="/dashboard" className="app-nav-back">←</Link>
        <h2>Reports</h2>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <ThemePicker />
        </div>
      </nav>

      {/* Controls */}
      <div className="tab-content no-print">
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1.25rem" }}>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="form-input" style={{ width: "auto" }}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="form-input" style={{ width: "auto" }}>
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          {loading && <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Loading…</span>}
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-ghost" style={{ width: "auto", padding: "0.42rem 0.9rem", fontSize: "0.82rem", marginTop: 0, display: "flex", gap: "0.4rem", alignItems: "center" }} onClick={exportCSV}>
              <Download size={14} /> CSV
            </button>
            <button className="btn" style={{ width: "auto", padding: "0.42rem 0.9rem", fontSize: "0.82rem", marginTop: 0, display: "flex", gap: "0.4rem", alignItems: "center" }} onClick={printReport}>
              <FileText size={14} /> Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── REPORT BODY (printed + on screen) ── */}
      <div className="tab-content report-body" id="report-body">

        {/* Report header (visible when printed) */}
        <div className="print-header">
          <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--accent)" }}>My World</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Financial Report — {monthLabel}</div>
        </div>

        {/* ── Balance Summary ── */}
        <div className="chart-card" style={{ marginBottom: "1.25rem" }}>
          <div className="chart-title">Balance Summary — {monthLabel}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
            <div style={{ background: "var(--surface2)", borderRadius: "var(--radius)", padding: "0.75rem" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Opening Balance</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{fmt(opening)}</div>
            </div>
            <div style={{ background: "rgba(52,211,153,0.1)", borderRadius: "var(--radius)", padding: "0.75rem", border: "1px solid rgba(52,211,153,0.2)" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Total Income</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--success)" }}>+ {fmt(stats?.totalIncome || 0)}</div>
            </div>
            <div style={{ background: "rgba(248,113,113,0.1)", borderRadius: "var(--radius)", padding: "0.75rem", border: "1px solid rgba(248,113,113,0.2)" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Total Expenses</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--error)" }}>− {fmt(stats?.totalExpense || 0)}</div>
            </div>
            <div style={{ background: closing >= 0 ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.1)", borderRadius: "var(--radius)", padding: "0.75rem", border: `1px solid ${closing >= 0 ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}` }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Closing Balance</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: closing >= 0 ? "var(--success)" : "var(--error)" }}>{fmt(closing)}</div>
            </div>
          </div>

          {/* Net savings row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0.75rem", background: "var(--surface2)", borderRadius: "var(--radius)", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--text-muted)" }}>Net Savings this month</span>
            <span style={{ fontWeight: 700, color: (stats?.net || 0) >= 0 ? "var(--success)" : "var(--error)" }}>
              {(stats?.net || 0) >= 0 ? "+" : ""}{fmt(stats?.net || 0)}
              {stats?.totalIncome > 0 && (
                <span style={{ fontSize: "0.72rem", fontWeight: 400, marginLeft: "0.4rem", color: "var(--text-muted)" }}>
                  ({Math.round(((stats?.net || 0) / stats.totalIncome) * 100)}% savings rate)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* ── Charts side by side ── */}
        {stats?.byCategory?.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            <div className="chart-card">
              <div className="chart-title">Spending by Category</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={stats.byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {stats.byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.8rem" }} formatter={v => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <div className="chart-title">Income vs Expense</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[{ name: monthLabel.split(" ")[0], income: stats.totalIncome, expense: stats.totalExpense }]} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.8rem" }} formatter={v => fmt(v)} />
                  <Bar dataKey="income"  fill="#34d399" radius={[4,4,0,0]} name="Income" />
                  <Bar dataKey="expense" fill="#f87171" radius={[4,4,0,0]} name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Category breakdown table ── */}
        {stats?.byCategory?.length > 0 && (
          <div className="chart-card" style={{ marginBottom: "1.25rem" }}>
            <div className="chart-title">Category Breakdown</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr>
                  {["Category", "Transactions", "Amount", "% of Expenses"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.45rem 0.6rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.byCategory.map((c, i) => {
                  const pct = stats.totalExpense > 0 ? ((c.total / stats.totalExpense) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={c.category}>
                      <td style={{ padding: "0.5rem 0.6rem", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                          <span style={{ textTransform: "capitalize" }}>{c.category}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.5rem 0.6rem", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>{c.count}</td>
                      <td style={{ padding: "0.5rem 0.6rem", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "var(--error)" }}>{fmt(c.total)}</td>
                      <td style={{ padding: "0.5rem 0.6rem", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ flex: 1, height: 6, background: "var(--surface2)", borderRadius: 99 }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", minWidth: 32 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Income table ── */}
        {incomes.length > 0 && (
          <div className="chart-card" style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div className="chart-title" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <TrendingUp size={14} color="var(--success)" /> Income
              </div>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--success)" }}>{fmt(stats?.totalIncome || 0)}</span>
            </div>
            <TxTable rows={incomes} amtColor="var(--success)" sign="+" />
          </div>
        )}

        {/* ── Expense table ── */}
        {expenses.length > 0 && (
          <div className="chart-card" style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div className="chart-title" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <TrendingDown size={14} color="var(--error)" /> Expenses
              </div>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--error)" }}>{fmt(stats?.totalExpense || 0)}</span>
            </div>
            <TxTable rows={expenses} amtColor="var(--error)" sign="−" />
          </div>
        )}

        {!loading && transactions.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><Wallet size={28} /></div>
            No transactions for {monthLabel}.<br />
            <span style={{ fontSize: "0.78rem" }}>Add some in the Expense Tracker.</span>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
          Generated on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · My World App
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-header { display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #2a2a3a; }
          body { background: #fff !important; color: #000 !important; }
          .app-page { padding: 0 !important; }
          .chart-card { break-inside: avoid; }
          table { break-inside: avoid; }
        }
        .print-header { display: none; }
        .report-body { padding-bottom: 4rem; }
      `}</style>
    </div>
  );
}

function TxTable({ rows, amtColor, sign }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
      <thead>
        <tr>
          {["Date", "Description", "Category", "Merchant", "Amount"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "0.4rem 0.6rem", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(t => (
          <tr key={t._id} style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: "0.45rem 0.6rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{fmtD(t.date)}</td>
            <td style={{ padding: "0.45rem 0.6rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description || "—"}</td>
            <td style={{ padding: "0.45rem 0.6rem", textTransform: "capitalize", color: "var(--text-muted)" }}>{t.category || "—"}</td>
            <td style={{ padding: "0.45rem 0.6rem", color: "var(--text-muted)" }}>{t.merchant || "—"}</td>
            <td style={{ padding: "0.45rem 0.6rem", fontWeight: 700, color: amtColor, whiteSpace: "nowrap" }}>{sign}{fmt(t.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export async function getServerSideProps(ctx) {
  const user = getAuthUser(ctx.req);
  if (!user) return { redirect: { destination: "/login", permanent: false } };
  return { props: {} };
}
