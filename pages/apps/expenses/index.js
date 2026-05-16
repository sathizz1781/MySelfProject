import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  UtensilsCrossed, ShoppingCart, Car, Film, Pill, Lightbulb,
  Home, Plane, BookOpen, Package, Briefcase, Laptop, TrendingUp,
  Gift, DollarSign, Users, Package2, Target, RefreshCw, Search,
  Download, Upload, Copy, X, ChevronLeft, ChevronRight,
  CreditCard, TrendingDown, PiggyBank, BarChart2, Landmark,
} from "lucide-react";
import { getAuthUser } from "../../../lib/auth";
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryMeta, CHART_COLORS,
} from "../../../lib/categories";
import ThemePicker from "../../../components/ThemePicker";

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICON_MAP = {
  UtensilsCrossed, ShoppingCart, Car, Film, Pill, Lightbulb,
  Home, Plane, BookOpen, Package, Briefcase, Laptop, TrendingUp,
  Gift, DollarSign,
};
function getCategoryIcon(iconName, size = 16, color = "#8888aa") {
  const I = ICON_MAP[iconName];
  return I ? <I size={size} color={color} /> : <Package2 size={size} color={color} />;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AED", "SGD"];
const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AED: "د.إ", SGD: "S$" };
const GOAL_ICONS = ["Target", "Home", "Plane", "Car", "Laptop", "Gift", "Briefcase", "BookOpen"];
const GOAL_COLORS = ["#6c63ff", "#ff6b6b", "#63ffb2", "#ffd43b", "#f783ac", "#66d9e8", "#ffa94d", "#748ffc"];
const FREQ_LABELS = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

const sym = (currency) => CURRENCY_SYMBOLS[currency] || currency;
const fmt = (n, currency = "INR") =>
  sym(currency) + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function todayISO() { return new Date().toISOString().slice(0, 10); }
function currentMonth() { return new Date().toISOString().slice(0, 7); }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function initForm() {
  return {
    amount: "", type: "expense", category: "food", description: "",
    merchant: "", tags: "", currency: "INR", date: todayISO(),
    isShared: false, paidBy: "", splitType: "equal", splitDetails: "",
  };
}

function initGoalForm() {
  return { name: "", targetAmount: "", savedAmount: "0", deadline: "", currency: "INR", icon: "Target", color: "#6c63ff", notes: "" };
}

function initRecurringForm() {
  return { amount: "", type: "expense", category: "food", description: "", merchant: "", currency: "INR", frequency: "monthly", startDate: todayISO() };
}

function initLoanForm() {
  return { type: "borrowed", party: "", principal: "", alreadyPaid: "0", interestRate: "0", interestType: "none", emiAmount: "", purpose: "personal", currency: "INR", startDate: todayISO(), dueDate: "", notes: "" };
}

function initInvestForm() {
  return { name: "", type: "mutual_fund", investedAmount: "", currentValue: "", units: "", avgPrice: "", currency: "INR", startDate: todayISO(), maturityDate: "", notes: "", schemeCode: "", stockSymbol: "", stockExchange: "NS" };
}

const INVEST_TYPES = [
  { key: "mutual_fund",  label: "Mutual Fund",   color: "#6c63ff" },
  { key: "stocks",       label: "Stocks",         color: "#f59e0b" },
  { key: "fd",           label: "Fixed Deposit",  color: "#10b981" },
  { key: "ppf",          label: "PPF",            color: "#3b82f6" },
  { key: "nps",          label: "NPS",            color: "#8b5cf6" },
  { key: "gold",         label: "Gold",           color: "#f7c948" },
  { key: "crypto",       label: "Crypto",         color: "#f97316" },
  { key: "bonds",        label: "Bonds",          color: "#06b6d4" },
  { key: "real_estate",  label: "Real Estate",    color: "#ec4899" },
  { key: "other",        label: "Other",          color: "#6b7280" },
];

const LOAN_PURPOSES = ["home", "car", "personal", "education", "business", "other"];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExpenseApp() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState("day");

  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Transactions
  const [expenses, setExpenses] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txView, setTxView] = useState("all");
  const [txCategory, setTxCategory] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [txTag, setTxTag] = useState("");
  const [txMerchant, setTxMerchant] = useState("");
  const searchTimeout = useRef(null);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [form, setForm] = useState(initForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // CSV
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  // Budgets
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [overallInput, setOverallInput] = useState("");
  const [editingOverall, setEditingOverall] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState([]);

  // Goals
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [goalForm, setGoalForm] = useState(initGoalForm);
  const [goalError, setGoalError] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);

  // Recurring
  const [recurrings, setRecurrings] = useState([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editRecurring, setEditRecurring] = useState(null);
  const [recurringForm, setRecurringForm] = useState(initRecurringForm);
  const [recurringError, setRecurringError] = useState("");
  const [recurringSaving, setRecurringSaving] = useState(false);

  // Group
  const [groupData, setGroupData] = useState({ group: null, pendingInvite: null });
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupMsg, setGroupMsg] = useState({ type: "", text: "" });
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [settlements, setSettlements] = useState([]);
  const [balances, setBalances] = useState([]);
  const [activity, setActivity] = useState([]);

  // Loans
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editLoan, setEditLoan] = useState(null);
  const [loanForm, setLoanForm] = useState(initLoanForm);
  const [loanError, setLoanError] = useState("");
  const [loanSaving, setLoanSaving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoan, setPaymentLoan] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Investments
  const [investments, setInvestments] = useState([]);
  const [investSummary, setInvestSummary] = useState(null);
  const [investLoading, setInvestLoading] = useState(false);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [editInvest, setEditInvest] = useState(null);
  const [investForm, setInvestForm] = useState(initInvestForm);
  const [investError, setInvestError] = useState("");
  const [investSaving, setInvestSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");
  // MF search
  const [mfQuery, setMfQuery] = useState("");
  const [mfResults, setMfResults] = useState([]);
  const [mfSearching, setMfSearching] = useState(false);
  const mfTimer = useRef(null);
  // Stock price fetch
  const [stockFetching, setStockFetching] = useState(false);

  // Opening Balance
  const [openingBalance, setOpeningBalance] = useState(0);
  const [editingOpening, setEditingOpening] = useState(false);
  const [openingInput, setOpeningInput] = useState("");

  // Analytics
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => { fetchStats(); }, [selectedYear, selectedMonth]);
  useEffect(() => { fetchExpenses(); }, [selectedYear, selectedMonth, txView, txCategory, txTag, txMerchant]);
  useEffect(() => { fetchOpeningBalance(); }, [selectedYear, selectedMonth]);
  useEffect(() => {
    if (activeTab === "group") { fetchGroup(); fetchSettle(); fetchActivity(); }
    if (activeTab === "goals") fetchGoals();
    if (activeTab === "recurring") fetchRecurrings();
    if (activeTab === "budgets") fetchTemplates();
    if (activeTab === "loans") fetchLoans();
    if (activeTab === "investments") fetchInvestments();
    if (activeTab === "analytics") fetchAnalytics();
  }, [activeTab]);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(fetchExpenses, 350);
    return () => clearTimeout(searchTimeout.current);
  }, [txSearch]);

  // ── Data Fetching ─────────────────────────────────────────────────────────────
  async function fetchStats() {
    setStatsLoading(true);
    try {
      const p = new URLSearchParams({ year: selectedYear.toString(), selectedMonth: selectedMonth.toString() });
      const res = await fetch(`/api/expenses/stats?${p}`);
      if (res.ok) setStats(await res.json());
    } finally { setStatsLoading(false); }
  }

  async function fetchExpenses() {
    setTxLoading(true);
    try {
      const p = new URLSearchParams({ year: selectedYear.toString(), selectedMonth: selectedMonth.toString(), view: txView });
      if (txCategory) p.set("category", txCategory);
      if (txTag)      p.set("tag", txTag);
      if (txMerchant) p.set("merchant", txMerchant);
      if (txSearch)   p.set("search", txSearch);
      const res = await fetch(`/api/expenses?${p}`);
      if (res.ok) setExpenses((await res.json()).expenses);
    } finally { setTxLoading(false); }
  }

  async function fetchGroup() {
    const res = await fetch("/api/groups");
    if (res.ok) setGroupData(await res.json());
  }
  async function fetchSettle() {
    const month = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
    const res = await fetch(`/api/groups/settle?month=${month}`);
    if (res.ok) { const d = await res.json(); setSettlements(d.settlements); setBalances(d.balances); }
  }
  async function fetchActivity() {
    const res = await fetch("/api/groups/activity");
    if (res.ok) setActivity((await res.json()).activity);
  }
  async function fetchGoals() {
    setGoalsLoading(true);
    const res = await fetch("/api/goals");
    if (res.ok) setGoals((await res.json()).goals);
    setGoalsLoading(false);
  }
  async function fetchRecurrings() {
    setRecurringLoading(true);
    const res = await fetch("/api/recurring");
    if (res.ok) setRecurrings((await res.json()).recurrings);
    setRecurringLoading(false);
  }
  async function fetchTemplates() {
    const res = await fetch("/api/budgets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "listTemplates" }) });
    if (res.ok) setTemplates((await res.json()).templates || []);
  }
  async function fetchLoans() {
    setLoansLoading(true);
    const res = await fetch("/api/loans");
    if (res.ok) setLoans((await res.json()).loans);
    setLoansLoading(false);
  }
  async function fetchInvestments() {
    setInvestLoading(true);
    const res = await fetch("/api/investments");
    if (res.ok) { const d = await res.json(); setInvestments(d.investments); setInvestSummary(d.summary); }
    setInvestLoading(false);
  }

  async function fetchOpeningBalance() {
    const res = await fetch(`/api/monthly-balance?year=${selectedYear}&month=${selectedMonth}`);
    if (res.ok) { const d = await res.json(); setOpeningBalance(d.openingBalance); }
  }

  async function saveOpeningBalance() {
    const val = parseFloat(openingInput);
    if (isNaN(val)) return;
    const res = await fetch("/api/monthly-balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year: selectedYear, month: selectedMonth, openingBalance: val }) });
    if (res.ok) { setOpeningBalance(val); setEditingOpening(false); }
  }

  async function fetchAnalytics() {
    setAnalyticsLoading(true);
    const res = await fetch(`/api/expenses/stats?year=${selectedYear}&selectedMonth=${selectedMonth}`);
    if (res.ok) setAnalytics(await res.json());
    setAnalyticsLoading(false);
  }

  async function downloadReport() {
    const p = new URLSearchParams({ year: selectedYear.toString(), selectedMonth: selectedMonth.toString() });
    const [expRes, statsRes] = await Promise.all([
      fetch(`/api/expenses?${p}`),
      fetch(`/api/expenses/stats?${p}`),
    ]);
    if (!expRes.ok || !statsRes.ok) return alert("Failed to fetch report data.");
    const { expenses: txns } = await expRes.json();
    const s = await statsRes.json();
    const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
    const closingBalance = openingBalance + s.totalIncome - s.totalExpense;
    const incomes  = txns.filter(t => t.type === "income");
    const expenses = txns.filter(t => t.type === "expense");
    const fmtAmt   = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
    const fmtDate  = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const row = (cells, bold = false) => `<tr>${cells.map(c => `<td style="padding:6px 10px;border-bottom:1px solid #2a2a3a;${bold?"font-weight:700;background:#1a1a2a":""}">${c}</td>`).join("")}</tr>`;
    const section = (title, color, rows, total) => `
      <h3 style="color:${color};font-size:13px;margin:20px 0 6px;text-transform:uppercase;letter-spacing:.06em">${title}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;background:#111118;border-radius:8px;overflow:hidden">
        <thead><tr style="background:#1e1e2e">${["Date","Description","Category","Merchant","Amount"].map(h=>`<th style="padding:7px 10px;text-align:left;color:#8888aa;font-weight:600">${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map(t => row([fmtDate(t.date), t.description||"—", t.category||"—", t.merchant||"—", `<span style="color:${color};font-weight:600">${fmtAmt(t.amount)}</span>`])).join("")}
          ${row(["","","","<b>Total</b>", `<span style="color:${color};font-weight:700">${fmtAmt(total)}</span>`], true)}
        </tbody>
      </table>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report — ${monthName}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#0d0d1a;color:#f0f0f8;padding:32px}@media print{body{background:#fff;color:#000}}</style>
      </head><body>
      <div style="max-width:780px;margin:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #2a2a3a">
          <div>
            <div style="font-size:22px;font-weight:700;color:#8b85ff">My World</div>
            <div style="font-size:13px;color:#8888aa">Financial Report — ${monthName}</div>
          </div>
          <button onclick="window.print()" style="background:#6c63ff;color:#fff;border:none;padding:8px 18px;border-radius:8px;cursor:pointer;font-size:13px">Print / Save PDF</button>
        </div>

        <h2 style="font-size:15px;margin-bottom:12px;color:#c0bfff">Summary</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;background:#111118;border-radius:8px;overflow:hidden">
          <tbody>
            ${row(["Opening Balance", `<span style="font-weight:600">${fmtAmt(openingBalance)}</span>`])}
            ${row(["Total Income", `<span style="color:#34d399;font-weight:600">+ ${fmtAmt(s.totalIncome)}</span>`])}
            ${row(["Total Expenses", `<span style="color:#f87171;font-weight:600">− ${fmtAmt(s.totalExpense)}</span>`])}
            ${row(["Net Savings", `<span style="color:${s.net>=0?"#34d399":"#f87171"};font-weight:600">${s.net>=0?"+":""}${fmtAmt(s.net)}</span>`])}
            ${row(["Closing Balance", `<span style="font-weight:700;font-size:14px;color:${closingBalance>=0?"#34d399":"#f87171"}">${fmtAmt(closingBalance)}</span>`], true)}
          </tbody>
        </table>

        ${incomes.length > 0  ? section("Income",  "#34d399", incomes,  s.totalIncome)  : ""}
        ${expenses.length > 0 ? section("Expenses", "#f87171", expenses, s.totalExpense) : ""}

        ${s.byCategory?.length > 0 ? `
        <h3 style="color:#8888aa;font-size:13px;margin:20px 0 6px;text-transform:uppercase;letter-spacing:.06em">Spending by Category</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;background:#111118;border-radius:8px;overflow:hidden">
          <tbody>${s.byCategory.map(c => row([c.category.charAt(0).toUpperCase()+c.category.slice(1), `${c.count} transaction${c.count!==1?"s":""}`, `<span style="color:#f87171;font-weight:600">${fmtAmt(c.total)}</span>`, `${s.totalExpense>0?Math.round((c.total/s.totalExpense)*100):0}%`])).join("")}</tbody>
        </table>` : ""}

        <div style="margin-top:28px;font-size:11px;color:#555;text-align:center">Generated on ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})} · My World App</div>
      </div></body></html>`;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  }

  // ── Loan CRUD ─────────────────────────────────────────────────────────────────
  function openAddLoan() { setEditLoan(null); setLoanForm(initLoanForm()); setLoanError(""); setShowLoanModal(true); }
  function openEditLoan(l) {
    setEditLoan(l);
    const paid = Math.max(0, (l.principal || 0) - (l.outstanding || 0));
    setLoanForm({
      type: l.type, party: l.party, principal: String(l.principal),
      alreadyPaid: String(paid),
      interestRate: String(l.interestRate || 0), interestType: l.interestType || "none",
      emiAmount: String(l.emiAmount || ""), purpose: l.purpose || "personal",
      currency: l.currency || "INR", startDate: l.startDate?.slice(0, 10) || todayISO(),
      dueDate: l.dueDate?.slice(0, 10) || "", notes: l.notes || "",
    });
    setLoanError(""); setShowLoanModal(true);
  }
  async function saveLoan() {
    if (!loanForm.party || !loanForm.principal) return setLoanError("Party name and principal are required.");
    if (Number(loanForm.principal) <= 0) return setLoanError("Principal must be greater than 0.");
    const principal   = Number(loanForm.principal);
    const alreadyPaid = Math.min(Number(loanForm.alreadyPaid || 0), principal);
    const outstanding = principal - alreadyPaid;
    setLoanSaving(true);
    try {
      const url = editLoan ? `/api/loans/${editLoan._id}` : "/api/loans";
      const method = editLoan ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...loanForm, principal, outstanding, interestRate: Number(loanForm.interestRate || 0), emiAmount: Number(loanForm.emiAmount || 0) }) });
      if (res.ok) { setShowLoanModal(false); fetchLoans(); }
      else setLoanError((await res.json()).error || "Failed.");
    } finally { setLoanSaving(false); }
  }
  async function deleteLoan(id) {
    if (!confirm("Delete this loan?")) return;
    await fetch(`/api/loans/${id}`, { method: "DELETE" });
    fetchLoans();
  }
  async function closeLoan(l) {
    await fetch(`/api/loans/${l._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: l.status === "active" ? "closed" : "active" }) });
    fetchLoans();
  }
  function openPayment(l) { setPaymentLoan(l); setPaymentAmount(""); setPaymentNote(""); setPaymentDate(todayISO()); setShowPaymentModal(true); }
  async function savePayment() {
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    setPaymentSaving(true);
    try {
      const res = await fetch(`/api/loans/${paymentLoan._id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(paymentAmount), date: paymentDate, note: paymentNote }) });
      if (res.ok) { setShowPaymentModal(false); fetchLoans(); }
    } finally { setPaymentSaving(false); }
  }

  // ── Investment CRUD ───────────────────────────────────────────────────────────
  function openAddInvest() {
    setEditInvest(null); setInvestForm(initInvestForm());
    setInvestError(""); setMfQuery(""); setMfResults([]); setShowInvestModal(true);
  }
  function openEditInvest(inv) {
    setEditInvest(inv);
    setInvestForm({
      name: inv.name, type: inv.type, investedAmount: String(inv.investedAmount),
      currentValue: String(inv.currentValue), units: String(inv.units || ""),
      avgPrice: String(inv.avgPrice || ""), currency: inv.currency || "INR",
      startDate: inv.startDate?.slice(0, 10) || todayISO(),
      maturityDate: inv.maturityDate?.slice(0, 10) || "", notes: inv.notes || "",
      schemeCode: inv.schemeCode || "", stockSymbol: inv.stockSymbol || "",
      stockExchange: inv.stockExchange || "NS",
    });
    setMfQuery(inv.schemeCode ? inv.name : ""); setMfResults([]);
    setInvestError(""); setShowInvestModal(true);
  }
  async function saveInvest() {
    if (!investForm.name || !investForm.investedAmount) return setInvestError("Name and invested amount are required.");
    setInvestSaving(true);
    try {
      const url = editInvest ? `/api/investments/${editInvest._id}` : "/api/investments";
      const method = editInvest ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        ...investForm,
        investedAmount: Number(investForm.investedAmount),
        currentValue:   Number(investForm.currentValue || investForm.investedAmount),
        units:          Number(investForm.units || 0),
        avgPrice:       Number(investForm.avgPrice || 0),
      }) });
      if (res.ok) { setShowInvestModal(false); fetchInvestments(); }
      else setInvestError((await res.json()).error || "Failed.");
    } finally { setInvestSaving(false); }
  }

  // MF search with debounce
  function onMfQueryChange(val) {
    setMfQuery(val);
    clearTimeout(mfTimer.current);
    if (val.trim().length < 2) { setMfResults([]); return; }
    setMfSearching(true);
    mfTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/investments/mf-search?q=${encodeURIComponent(val)}`);
        if (res.ok) setMfResults((await res.json()).results || []);
      } finally { setMfSearching(false); }
    }, 350);
  }

  async function selectMf(scheme) {
    setMfQuery(scheme.schemeName);
    setMfResults([]);
    setInvestForm(f => ({ ...f, name: scheme.schemeName, schemeCode: scheme.schemeCode }));
    // fetch NAV to pre-fill current value
    try {
      const res = await fetch(`/api/investments/mf-nav?code=${scheme.schemeCode}`);
      if (res.ok) {
        const { nav } = await res.json();
        if (nav) {
          const units = Number(investForm.units) || 0;
          setInvestForm(f => ({ ...f, currentValue: units > 0 ? String((units * nav).toFixed(2)) : String(nav.toFixed(4)), avgPrice: String(nav.toFixed(4)) }));
        }
      }
    } catch { /* ignore */ }
  }

  async function fetchStockPrice() {
    if (!investForm.stockSymbol.trim()) return;
    setStockFetching(true);
    try {
      const res = await fetch(`/api/investments/stock-price?symbol=${encodeURIComponent(investForm.stockSymbol.trim())}&exchange=${investForm.stockExchange}`);
      if (res.ok) {
        const { price, name } = await res.json();
        if (price) {
          const units = Number(investForm.units) || 0;
          setInvestForm(f => ({
            ...f,
            name: f.name || name || f.stockSymbol.toUpperCase(),
            currentValue: units > 0 ? String((units * price).toFixed(2)) : String(price.toFixed(2)),
            avgPrice: f.avgPrice || String(price.toFixed(2)),
          }));
        }
      } else setInvestError("Could not fetch price. Check the symbol.");
    } catch { setInvestError("Failed to fetch stock price."); }
    finally { setStockFetching(false); }
  }

  async function refreshAllPrices() {
    setRefreshing(true); setRefreshMsg("");
    try {
      const res = await fetch("/api/investments/refresh-prices", { method: "POST" });
      if (res.ok) {
        const { updated, skipped, failed } = await res.json();
        setRefreshMsg(`✓ ${updated} updated${skipped > 0 ? `, ${skipped} skipped` : ""}${failed > 0 ? `, ${failed} failed` : ""}`);
        fetchInvestments();
        setTimeout(() => setRefreshMsg(""), 4000);
      }
    } finally { setRefreshing(false); }
  }
  async function deleteInvest(id) {
    if (!confirm("Delete this investment?")) return;
    await fetch(`/api/investments/${id}`, { method: "DELETE" });
    fetchInvestments();
  }

  // ── Expense CRUD ──────────────────────────────────────────────────────────────
  function openAdd() { setEditExpense(null); setForm(initForm()); setFormError(""); setShowModal(true); }
  function openEdit(exp) {
    setEditExpense(exp);
    setForm({
      amount: String(exp.amount), type: exp.type, category: exp.category,
      description: exp.description || "", merchant: exp.merchant || "",
      tags: (exp.tags || []).join(", "), currency: exp.currency || "INR",
      date: exp.date.slice(0, 10), isShared: exp.isShared,
      paidBy: exp.paidBy || "", splitType: exp.splitType || "equal",
      splitDetails: exp.splitDetails ? JSON.stringify(exp.splitDetails) : "",
    });
    setFormError(""); setShowModal(true);
  }

  async function saveExpense() {
    if (!form.amount || !form.category) return setFormError("Amount and category are required.");
    if (Number(form.amount) <= 0) return setFormError("Amount must be greater than 0.");
    setFormLoading(true); setFormError("");
    try {
      const url    = editExpense ? `/api/expenses/${editExpense._id}` : "/api/expenses";
      const method = editExpense ? "PUT" : "POST";
      const tags   = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount), tags }),
      });
      if (res.ok) { setShowModal(false); fetchStats(); fetchExpenses(); }
      else setFormError((await res.json()).error || "Failed to save.");
    } catch { setFormError("Network error."); }
    finally { setFormLoading(false); }
  }

  async function deleteExpense(id) {
    if (!confirm("Delete this transaction?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    fetchStats(); fetchExpenses();
  }

  async function duplicateExpense(id) {
    const res = await fetch("/api/expenses/duplicate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { fetchExpenses(); fetchStats(); }
  }

  // ── CSV ───────────────────────────────────────────────────────────────────────
  function exportCSV() {
    const month = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
    window.open(`/api/expenses/export?year=${selectedYear}&month=${selectedMonth}`, "_blank");
  }

  async function importCSV() {
    if (!importText.trim()) return;
    setImportLoading(true); setImportMsg("");
    try {
      const res = await fetch("/api/expenses/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: importText }),
      });
      const d = await res.json();
      if (res.ok) {
        setImportMsg(`Imported ${d.imported} transactions.${d.errors?.length ? ` (${d.errors.length} skipped)` : ""}`);
        setImportText(""); fetchExpenses(); fetchStats();
      } else { setImportMsg(d.error || "Import failed."); }
    } catch { setImportMsg("Network error."); }
    finally { setImportLoading(false); }
  }

  // ── Budgets ───────────────────────────────────────────────────────────────────
  const month = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  async function saveBudget(cat) {
    setBudgetSaving(true);
    try {
      if (!budgetInput || Number(budgetInput) <= 0) {
        await fetch("/api/budgets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: cat, month }) });
      } else {
        await fetch("/api/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: cat, amount: Number(budgetInput), month }) });
      }
      fetchStats();
    } finally { setBudgetSaving(false); setEditingBudget(null); }
  }

  async function saveOverallBudget() {
    setBudgetSaving(true);
    try {
      if (!overallInput || Number(overallInput) <= 0) {
        await fetch("/api/budgets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: "__overall__", month }) });
      } else {
        await fetch("/api/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: "__overall__", amount: Number(overallInput), month, isOverall: true }) });
      }
      fetchStats();
    } finally { setBudgetSaving(false); setEditingOverall(false); }
  }

  async function saveTemplate() {
    if (!templateName.trim()) return;
    const res = await fetch("/api/budgets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveTemplate", month, templateName }) });
    if (res.ok) { fetchTemplates(); setTemplateName(""); }
  }

  async function loadTemplate(name) {
    await fetch("/api/budgets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "loadTemplate", month, templateName: name }) });
    fetchStats();
  }

  async function deleteTemplate(name) {
    await fetch("/api/budgets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteTemplate", templateName: name }) });
    fetchTemplates();
  }

  // ── Goals ─────────────────────────────────────────────────────────────────────
  function openAddGoal() { setEditGoal(null); setGoalForm(initGoalForm()); setGoalError(""); setShowGoalModal(true); }
  function openEditGoal(g) {
    setEditGoal(g);
    setGoalForm({ name: g.name, targetAmount: String(g.targetAmount), savedAmount: String(g.savedAmount), deadline: g.deadline ? g.deadline.slice(0, 10) : "", currency: g.currency || "INR", icon: g.icon || "Target", color: g.color || "#6c63ff", notes: g.notes || "" });
    setGoalError(""); setShowGoalModal(true);
  }
  async function saveGoal() {
    if (!goalForm.name || !goalForm.targetAmount) return setGoalError("Name and target amount are required.");
    setGoalSaving(true);
    try {
      const url = editGoal ? `/api/goals/${editGoal._id}` : "/api/goals";
      const res = await fetch(url, { method: editGoal ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...goalForm, targetAmount: Number(goalForm.targetAmount), savedAmount: Number(goalForm.savedAmount || 0) }) });
      if (res.ok) { setShowGoalModal(false); fetchGoals(); }
      else setGoalError((await res.json()).error || "Failed.");
    } finally { setGoalSaving(false); }
  }
  async function deleteGoal(id) {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    fetchGoals();
  }
  async function toggleGoalComplete(g) {
    await fetch(`/api/goals/${g._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isCompleted: !g.isCompleted }) });
    fetchGoals();
  }

  // ── Recurring ─────────────────────────────────────────────────────────────────
  function openAddRecurring() { setEditRecurring(null); setRecurringForm(initRecurringForm()); setRecurringError(""); setShowRecurringModal(true); }
  function openEditRecurring(r) {
    setEditRecurring(r);
    setRecurringForm({ amount: String(r.amount), type: r.type, category: r.category, description: r.description || "", merchant: r.merchant || "", currency: r.currency || "INR", frequency: r.frequency, startDate: r.startDate?.slice(0, 10) || todayISO() });
    setRecurringError(""); setShowRecurringModal(true);
  }
  async function saveRecurring() {
    if (!recurringForm.amount || !recurringForm.category || !recurringForm.frequency) return setRecurringError("Amount, category and frequency are required.");
    setRecurringSaving(true);
    try {
      const url = editRecurring ? `/api/recurring/${editRecurring._id}` : "/api/recurring";
      const res = await fetch(url, { method: editRecurring ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...recurringForm, amount: Number(recurringForm.amount) }) });
      if (res.ok) { setShowRecurringModal(false); fetchRecurrings(); }
      else setRecurringError((await res.json()).error || "Failed.");
    } finally { setRecurringSaving(false); }
  }
  async function toggleRecurring(r) {
    await fetch(`/api/recurring/${r._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !r.isActive }) });
    fetchRecurrings();
  }
  async function deleteRecurring(id) {
    if (!confirm("Delete this recurring transaction?")) return;
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    fetchRecurrings();
  }

  // ── Group ─────────────────────────────────────────────────────────────────────
  async function createGroup() {
    if (!newGroupName.trim()) return;
    setGroupLoading(true); setGroupMsg({ type: "", text: "" });
    const res = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newGroupName }) });
    const d = await res.json();
    if (res.ok) { setGroupMsg({ type: "success", text: "Group created!" }); setNewGroupName(""); fetchGroup(); }
    else setGroupMsg({ type: "error", text: d.error });
    setGroupLoading(false);
  }
  async function inviteMember() {
    if (!inviteEmail.trim()) return;
    setGroupLoading(true); setGroupMsg({ type: "", text: "" });
    const res = await fetch("/api/groups/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail }) });
    const d = await res.json();
    if (res.ok) { setGroupMsg({ type: "success", text: "Invite sent!" }); setInviteEmail(""); fetchGroup(); }
    else setGroupMsg({ type: "error", text: d.error });
    setGroupLoading(false);
  }
  async function acceptInvite(groupId) {
    setGroupLoading(true);
    const res = await fetch("/api/groups/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId }) });
    const d = await res.json();
    if (res.ok) { setGroupMsg({ type: "success", text: "Joined group!" }); fetchGroup(); fetchStats(); }
    else setGroupMsg({ type: "error", text: d.error });
    setGroupLoading(false);
  }
  async function leaveGroup() {
    if (!confirm("Leave this group?")) return;
    await fetch("/api/groups/leave", { method: "POST" });
    setGroupMsg({ type: "success", text: "Left group." }); fetchGroup(); fetchStats();
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const inGroup    = stats?.groupId;
  const overallBudget = stats?.budgets?.find(b => b.category === "__overall__");
  const cats       = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const allTags    = [...new Set(expenses.flatMap(e => e.tags || []))];

  // Budget vs actual data for chart
  const budgetChartData = (stats?.byCategory || []).map(c => {
    const bud = stats?.budgets?.find(b => b.category === c.category);
    return { category: c.category, spent: c.total, budget: bud?.amount || 0 };
  }).filter(d => d.budget > 0 || d.spent > 0).slice(0, 8);

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  const TABS = [
    { key: "overview",     label: "Overview" },
    { key: "transactions", label: "Transactions" },
    { key: "budgets",      label: "Budgets" },
    { key: "goals",        label: "Goals" },
    { key: "recurring",    label: "Recurring" },
    { key: "loans",        label: "Loans" },
    { key: "investments",  label: "Investments" },
    { key: "analytics",   label: "Analytics" },
    { key: "group",        label: "Group" },
  ];

  return (
    <div className="app-page">
      {/* Nav */}
      <nav className="app-nav">
        <Link href="/dashboard" className="app-nav-back">←</Link>
        <h2>Expense Tracker</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
          {inGroup && (
            <span className="group-badge">
              <Users size={11} /> {stats.groupName}
            </span>
          )}
          <ThemePicker />
        </div>
      </nav>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="tab-content">
          {/* Year / Month filters */}
          <div className="filter-row" style={{ marginBottom: "1.25rem" }}>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="form-input" style={{ width: "auto" }}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="form-input" style={{ width: "auto" }}>
              {["January","February","March","April","May","June","July","August","September","October","November","December"]
                .map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
            </select>
            {statsLoading && <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Loading…</span>}
          </div>

          {/* Summary cards */}
          <div className="stat-grid" style={{ marginBottom: "1rem" }}>
            <div className="stat-card">
              <div className="stat-card-label">Expenses</div>
              <div className="stat-card-value c-expense">{statsLoading ? "—" : fmt(stats?.totalExpense)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Income</div>
              <div className="stat-card-value c-income">{statsLoading ? "—" : fmt(stats?.totalIncome)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Net Savings</div>
              <div className={`stat-card-value ${(stats?.net || 0) >= 0 ? "c-pos" : "c-neg"}`}>{statsLoading ? "—" : fmt(stats?.net)}</div>
            </div>
          </div>

          {/* Opening / Closing Balance card */}
          <div className="chart-card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Month Balance</div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {!editingOpening ? (
                  <button className="btn btn-ghost" style={{ width: "auto", padding: "0.28rem 0.65rem", fontSize: "0.72rem", marginTop: 0 }} onClick={() => { setOpeningInput(String(openingBalance)); setEditingOpening(true); }}>✏️ Opening Balance</button>
                ) : (
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <input className="form-input" type="number" value={openingInput} onChange={e => setOpeningInput(e.target.value)} style={{ width: 110, padding: "0.3rem 0.5rem", fontSize: "0.82rem" }} autoFocus onKeyDown={e => e.key === "Enter" && saveOpeningBalance()} placeholder="Opening balance" />
                    <button className="btn" style={{ width: "auto", padding: "0.3rem 0.65rem", fontSize: "0.78rem", marginTop: 0 }} onClick={saveOpeningBalance}>Save</button>
                    <button className="icon-btn" onClick={() => setEditingOpening(false)}>✕</button>
                  </div>
                )}
                <button className="btn btn-ghost" style={{ width: "auto", padding: "0.28rem 0.65rem", fontSize: "0.72rem", marginTop: 0 }} onClick={downloadReport}>⬇ Report</button>
              </div>
            </div>
            <div className="balance-4col">
              <div>
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Opening</div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{fmt(openingBalance)}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>+ Income</div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--success)" }}>{statsLoading ? "—" : fmt(stats?.totalIncome || 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>− Expenses</div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--error)" }}>{statsLoading ? "—" : fmt(stats?.totalExpense || 0)}</div>
              </div>
              <div>
                {(() => { const bal = openingBalance + (stats?.totalIncome || 0) - (stats?.totalExpense || 0); return <>
                  <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Closing</div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: bal >= 0 ? "var(--success)" : "var(--error)" }}>{fmt(bal)}</div>
                </>; })()}
              </div>
            </div>
          </div>

          {/* Overall budget progress */}
          {overallBudget && (
            <div className="chart-card" style={{ marginBottom: "1rem" }}>
              <div className="chart-title">Monthly Budget</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "0.5rem" }}>
                <span>{fmt(stats?.totalExpense)} spent</span>
                <span style={{ color: "var(--text-muted)" }}>{fmt(overallBudget.amount)} limit</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{
                  width: `${Math.min((stats?.totalExpense / overallBudget.amount) * 100, 100)}%`,
                  background: stats?.totalExpense > overallBudget.amount ? "var(--error)" : stats?.totalExpense > overallBudget.amount * 0.8 ? "#ffd43b" : "var(--success)",
                }} />
              </div>
            </div>
          )}

          {/* Insights */}
          {!statsLoading && stats?.insights?.length > 0 && (
            <div style={{ marginBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {stats.insights.map((ins, i) => (
                <div key={i} className={`alert alert-${ins.type === "error" ? "error" : ins.type === "success" ? "success" : "info"}`} style={{ marginBottom: 0 }}>
                  {ins.text}
                </div>
              ))}
            </div>
          )}

          {/* View mode */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {["day", "month", "year"].map(m => (
              <button key={m} className={`btn ${viewMode === m ? "" : "btn-ghost"}`} style={{ width: "auto", padding: "0.42rem 0.85rem", fontSize: "0.8rem", marginTop: 0 }} onClick={() => setViewMode(m)}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* 6-month Income vs Expense trend */}
          <div className="chart-card" style={{ marginBottom: "1rem" }}>
            <div className="chart-title">6-Month Trend</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats?.byMonth || []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.8rem" }} />
                <Bar dataKey="expense" fill="#f87171" radius={[3, 3, 0, 0]} name="Expense" />
                <Bar dataKey="income"  fill="#34d399" radius={[3, 3, 0, 0]} name="Income" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category donut + top merchants side by side */}
          <div className="two-col-charts">
            {/* Category donut */}
            <div className="chart-card">
              <div className="chart-title">By Category</div>
              {!statsLoading && stats?.byCategory?.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={stats.byCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                        {stats.byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.8rem" }} formatter={(v) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-legend">
                    {stats.byCategory.slice(0, 5).map((c, i) => (
                      <div key={c.category} className="donut-legend-item">
                        <span className="donut-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="donut-label">{c.category}</span>
                        <span className="donut-value">{fmt(c.total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state" style={{ padding: "2rem 0.5rem" }}>No data</div>
              )}
            </div>

            {/* Top merchants */}
            <div className="chart-card">
              <div className="chart-title">Top Merchants</div>
              {!statsLoading && stats?.topMerchants?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {stats.topMerchants.map((m, i) => (
                    <div key={m.merchant} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#000", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.merchant}</span>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--error)" }}>{fmt(m.total)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "2rem 0.5rem", fontSize: "0.8rem" }}>Add merchant names to transactions to see them here.</div>
              )}
            </div>
          </div>

          {/* Net worth line chart */}
          <div className="chart-card" style={{ marginTop: "1rem" }}>
            <div className="chart-title">Net Worth Trend</div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={stats?.netWorth || []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.8rem" }} formatter={(v) => fmt(v)} />
                <Line type="monotone" dataKey="net" stroke="var(--accent-light)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} name="Net Worth" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Day / Month / Year calendar views */}
          {viewMode === "day" && (
            <div className="chart-card" style={{ marginTop: "1rem" }}>
              <div className="chart-title">Daily — {new Date(selectedYear, selectedMonth - 1, 1).toLocaleString("default", { month: "long", year: "numeric" })}</div>
              {statsLoading ? <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Loading…</div> : (
                <>
                  <div className="calendar-weekdays">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} className="calendar-weekday">{d}</div>)}</div>
                  <div className="calendar-grid">
                    {Array.from({ length: (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7 }).map((_, i) => (
                      <div key={`e${i}`} className="calendar-day empty" />
                    ))}
                    {stats?.calendarDays?.map(day => (
                      <div key={day.day} className={`calendar-day ${day.total > 0 ? "has-expenses" : ""}`}>
                        <div className="calendar-day-number">{day.day}</div>
                        {day.total > 0 && <div className="calendar-day-amount">{fmt(day.total)}</div>}
                        {day.count > 0 && <div className="calendar-day-count">{day.count} tx</div>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {viewMode === "month" && (
            <div className="chart-card" style={{ marginTop: "1rem" }}>
              <div className="chart-title">{selectedYear} Monthly Overview</div>
              <div className="year-months-grid">
                {stats?.yearMonths?.map(m => (
                  <div key={m.month} className={`year-month-card ${m.month === selectedMonth ? "selected" : ""}`} onClick={() => setSelectedMonth(m.month)}>
                    <div className="year-month-name">{m.name}</div>
                    <div className="year-month-total">{fmt(m.total)}</div>
                    <div className="year-month-count">{m.count} tx</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === "year" && (
            <div className="chart-card" style={{ marginTop: "1rem" }}>
              <div className="chart-title">Last 5 Years</div>
              <div className="year-months-grid">
                {stats?.yearTotals?.map(y => (
                  <div key={y.year} className="year-month-card">
                    <div className="year-month-name">{y.year}</div>
                    <div className="year-month-total">{fmt(y.total)}</div>
                    <div className="year-month-count">{y.count} tx</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TRANSACTIONS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "transactions" && (
        <div className="tab-content tx-section">
          {/* Opening Balance Card */}
          <div className="chart-card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
              <div className="chart-title" style={{ marginBottom: 0 }}>Month Balance</div>
              {!editingOpening ? (
                <button className="icon-btn" style={{ fontSize: "0.75rem" }} onClick={() => { setOpeningInput(String(openingBalance)); setEditingOpening(true); }}>✏️ Set Opening</button>
              ) : (
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <input className="form-input" type="number" value={openingInput} onChange={e => setOpeningInput(e.target.value)} style={{ width: 110, padding: "0.3rem 0.5rem", fontSize: "0.82rem" }} autoFocus onKeyDown={e => e.key === "Enter" && saveOpeningBalance()} />
                  <button className="btn" style={{ width: "auto", padding: "0.3rem 0.65rem", fontSize: "0.78rem", marginTop: 0 }} onClick={saveOpeningBalance}>Save</button>
                  <button className="icon-btn" onClick={() => setEditingOpening(false)}>✕</button>
                </div>
              )}
            </div>
            <div className="balance-4col">
              <div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Opening</div>
                <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{fmt(openingBalance)}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>+ Income</div>
                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--success)" }}>+{fmt(stats?.totalIncome || 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>− Expense</div>
                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--error)" }}>−{fmt(stats?.totalExpense || 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Balance</div>
                {(() => { const bal = openingBalance + (stats?.totalIncome || 0) - (stats?.totalExpense || 0); return <div style={{ fontWeight: 700, fontSize: "0.82rem", color: bal >= 0 ? "var(--success)" : "var(--error)" }}>{fmt(bal)}</div>; })()}
              </div>
            </div>
          </div>

          {/* Month / Year picker */}
          <div className="filter-row" style={{ marginBottom: "0.75rem" }}>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="form-input" style={{ width: "auto" }}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="form-input" style={{ width: "auto" }}>
              {["January","February","March","April","May","June","July","August","September","October","November","December"]
                .map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
            </select>
            {txLoading && <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Loading…</span>}
          </div>

          {/* Search bar */}
          <div className="search-bar" style={{ marginBottom: "0.75rem" }}>
            <Search size={15} color="var(--text-muted)" />
            <input className="search-input" placeholder="Search description, merchant, tag…" value={txSearch} onChange={e => setTxSearch(e.target.value)} />
            {txSearch && <button className="icon-btn" onClick={() => setTxSearch("")}><X size={13} /></button>}
          </div>

          {/* Filters */}
          <div className="tx-filters">
            {[{ key: "all", label: "All" }, { key: "mine", label: "Mine" }, ...(inGroup ? [{ key: "shared", label: "Shared" }] : [])].map(v => (
              <button key={v.key} className={`filter-chip ${txView === v.key ? "active" : ""}`} onClick={() => setTxView(v.key)}>{v.label}</button>
            ))}
            <select className="filter-chip" style={{ background: txCategory ? "var(--accent)" : undefined, color: txCategory ? "#fff" : undefined }} value={txCategory} onChange={e => setTxCategory(e.target.value)}>
              <option value="">All Categories</option>
              {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
            </select>
            {allTags.length > 0 && (
              <select className="filter-chip" style={{ background: txTag ? "var(--accent)" : undefined, color: txTag ? "#fff" : undefined }} value={txTag} onChange={e => setTxTag(e.target.value)}>
                <option value="">All Tags</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>

          {/* Actions bar */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <button className="btn btn-ghost" style={{ width: "auto", padding: "0.38rem 0.85rem", fontSize: "0.78rem", marginTop: 0 }} onClick={exportCSV}>
              <Download size={13} /> Export CSV
            </button>
            <button className="btn btn-ghost" style={{ width: "auto", padding: "0.38rem 0.85rem", fontSize: "0.78rem", marginTop: 0 }} onClick={() => setShowImport(v => !v)}>
              <Upload size={13} /> Import CSV
            </button>
          </div>

          {/* Import panel */}
          {showImport && (
            <div className="chart-card" style={{ marginBottom: "0.75rem" }}>
              <div className="chart-title">Import CSV</div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
                Columns: date, type, category, description, merchant, amount, currency, tags (comma-separated header required)
              </p>
              <textarea className="form-input" rows={5} value={importText} onChange={e => setImportText(e.target.value)} placeholder={"date,type,category,amount\n2024-01-01,expense,food,250"} style={{ fontFamily: "var(--mono)", fontSize: "0.78rem" }} />
              {importMsg && <div className={`alert ${importMsg.startsWith("Imported") ? "alert-success" : "alert-error"}`} style={{ marginTop: "0.5rem", marginBottom: 0 }}>{importMsg}</div>}
              <button className="btn" style={{ marginTop: "0.5rem" }} onClick={importCSV} disabled={importLoading}>{importLoading ? "Importing…" : "Import"}</button>
            </div>
          )}

          {/* Transaction list */}
          {txLoading ? (
            <div className="empty-state"><div className="empty-state-icon">⏳</div>Loading…</div>
          ) : expenses.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><DollarSign size={28} /></div>No transactions found.<br /><span style={{ fontSize: "0.78rem" }}>Tap + to add one.</span></div>
          ) : (
            <div className="tx-list">
              {expenses.map(exp => {
                const meta = getCategoryMeta(exp.category);
                const expSym = sym(exp.currency || "INR");
                return (
                  <div key={exp._id} className="tx-item">
                    <div className="cat-icon" style={{ background: `${meta.color}20` }}>{getCategoryIcon(meta.icon, 18, meta.color)}</div>
                    <div className="tx-info">
                      <div className="tx-desc">{exp.description || meta.label}</div>
                      <div className="tx-meta">
                        {formatDate(exp.date)}
                        {exp.merchant && <span> · {exp.merchant}</span>}
                        {(exp.tags || []).map(t => <span key={t} className="tag-chip">#{t}</span>)}
                        {exp.isShared && <span style={{ color: "var(--accent-light)" }}> · shared</span>}
                      </div>
                    </div>
                    <div className="tx-right">
                      <span className={`tx-amount ${exp.type === "income" ? "c-income" : "c-expense"}`}>
                        {exp.type === "income" ? "+" : "−"}{expSym}{Number(exp.amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                      <div className="tx-actions">
                        <button className="icon-btn" onClick={() => openEdit(exp)} title="Edit">✏️</button>
                        <button className="icon-btn" onClick={() => duplicateExpense(exp._id)} title="Duplicate"><Copy size={12} /></button>
                        <button className="icon-btn" onClick={() => deleteExpense(exp._id)} title="Delete">🗑️</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BUDGETS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "budgets" && (
        <div className="tab-content budget-section">
          {/* Overall budget */}
          <div className="chart-card" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="chart-title" style={{ marginBottom: 0 }}>Overall Monthly Cap</div>
              {!editingOverall ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{overallBudget ? fmt(overallBudget.amount) : "Not set"}</span>
                  <button className="icon-btn" onClick={() => { setOverallInput(overallBudget ? String(overallBudget.amount) : ""); setEditingOverall(true); }}>{overallBudget ? "✏️" : "➕"}</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <input className="form-input" type="number" value={overallInput} onChange={e => setOverallInput(e.target.value)} style={{ width: 90, padding: "0.3rem 0.55rem" }} autoFocus onKeyDown={e => e.key === "Enter" && saveOverallBudget()} />
                  <button className="btn" style={{ width: "auto", padding: "0.3rem 0.7rem", marginTop: 0, fontSize: "0.8rem" }} onClick={saveOverallBudget} disabled={budgetSaving}>Save</button>
                  <button className="icon-btn" onClick={() => setEditingOverall(false)}><X size={13} /></button>
                </div>
              )}
            </div>
          </div>

          {/* Budget vs actual chart */}
          {budgetChartData.length > 0 && (
            <div className="chart-card" style={{ marginBottom: "1rem" }}>
              <div className="chart-title">Budget vs Actual</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={budgetChartData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <YAxis type="category" dataKey="category" tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={48} />
                  <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.8rem" }} formatter={v => fmt(v)} />
                  <Bar dataKey="budget" fill="rgba(108,99,255,0.25)" radius={[0, 3, 3, 0]} name="Budget" />
                  <Bar dataKey="spent"  fill="var(--accent)"          radius={[0, 3, 3, 0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Templates */}
          <div className="chart-card" style={{ marginBottom: "1rem" }}>
            <div className="chart-title">Templates</div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: templates.length > 0 ? "0.75rem" : 0 }}>
              {templates.map(t => (
                <div key={t} className="template-chip">
                  <button onClick={() => loadTemplate(t)}>{t}</button>
                  <button onClick={() => deleteTemplate(t)} style={{ opacity: 0.6 }}><X size={10} /></button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input className="form-input" placeholder="Template name…" value={templateName} onChange={e => setTemplateName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveTemplate()} style={{ flex: 1 }} />
              <button className="btn" style={{ width: "auto", padding: "0.5rem 0.85rem", marginTop: 0, fontSize: "0.82rem" }} onClick={saveTemplate}>Save current</button>
            </div>
          </div>

          {/* Per-category budgets */}
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.85rem" }}>Tap ➕ to set a budget, ✏️ to edit.</p>
          {EXPENSE_CATEGORIES.map(cat => {
            const budget = stats?.budgets?.find(b => b.category === cat.key);
            const spent  = stats?.byCategory?.find(c => c.category === cat.key)?.total || 0;
            const budgeted = budget?.amount || 0;
            const pct  = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
            const over = budgeted > 0 && spent > budgeted;
            const isEditing = editingBudget === cat.key;

            return (
              <div key={cat.key} className="budget-row">
                <div className="budget-header">
                  <div className="budget-label">{getCategoryIcon(cat.icon, 15, cat.color)}{cat.label}</div>
                  {isEditing ? (
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <input className="form-input" type="number" min="0" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} style={{ width: 85, padding: "0.28rem 0.5rem" }} autoFocus onKeyDown={e => e.key === "Enter" && saveBudget(cat.key)} />
                      <button className="btn" style={{ width: "auto", padding: "0.28rem 0.65rem", marginTop: 0, fontSize: "0.78rem" }} onClick={() => saveBudget(cat.key)} disabled={budgetSaving}>Save</button>
                      <button className="icon-btn" onClick={() => setEditingBudget(null)}><X size={12} /></button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                      <span className="budget-amounts">{fmt(spent)}{budgeted > 0 ? ` / ${fmt(budgeted)}` : ""}</span>
                      <button className="icon-btn" onClick={() => { setEditingBudget(cat.key); setBudgetInput(budgeted ? String(budgeted) : ""); }}>{budgeted ? "✏️" : "➕"}</button>
                    </div>
                  )}
                </div>
                {budgeted > 0 && (
                  <>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: over ? "var(--error)" : pct > 80 ? "#ffd43b" : "var(--success)" }} />
                    </div>
                    {over && <div style={{ fontSize: "0.7rem", color: "var(--error)", marginTop: "0.3rem" }}>Over by {fmt(spent - budgeted)}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          GOALS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "goals" && (
        <div className="tab-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600 }}>Savings Goals</h3>
            <button className="btn" style={{ width: "auto", padding: "0.42rem 0.9rem", fontSize: "0.82rem", marginTop: 0 }} onClick={openAddGoal}>+ New Goal</button>
          </div>

          {goalsLoading ? (
            <div className="empty-state">Loading…</div>
          ) : goals.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Target size={28} /></div>No goals yet.<br /><span style={{ fontSize: "0.78rem" }}>Set a savings target to stay motivated.</span></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {goals.map(g => {
                const pct = g.targetAmount > 0 ? Math.min((g.savedAmount / g.targetAmount) * 100, 100) : 0;
                const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - Date.now()) / 86400000) : null;
                return (
                  <div key={g._id} className={`goal-card ${g.isCompleted ? "completed" : ""}`}>
                    <div className="goal-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div className="goal-icon" style={{ background: `${g.color}22`, border: `1px solid ${g.color}44` }}>
                          <Target size={16} color={g.color} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{g.name}</div>
                          {g.deadline && <div style={{ fontSize: "0.7rem", color: daysLeft < 0 ? "var(--error)" : "var(--text-muted)" }}>{daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                        <button className="icon-btn" onClick={() => toggleGoalComplete(g)} title={g.isCompleted ? "Reopen" : "Mark complete"} style={{ fontSize: "0.9rem" }}>{g.isCompleted ? "↩️" : "✅"}</button>
                        <button className="icon-btn" onClick={() => openEditGoal(g)}>✏️</button>
                        <button className="icon-btn" onClick={() => deleteGoal(g._id)}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.45rem", color: "var(--text-muted)" }}>
                      <span>{fmt(g.savedAmount, g.currency)} saved</span>
                      <span>{fmt(g.targetAmount, g.currency)} goal · {Math.round(pct)}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: g.isCompleted ? "var(--success)" : pct >= 100 ? "var(--success)" : g.color }} />
                    </div>
                    {g.notes && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>{g.notes}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          RECURRING TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "recurring" && (
        <div className="tab-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600 }}>Recurring Transactions</h3>
            <button className="btn" style={{ width: "auto", padding: "0.42rem 0.9rem", fontSize: "0.82rem", marginTop: 0 }} onClick={openAddRecurring}>+ New</button>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Active recurring transactions are auto-applied when you open this page.</p>

          {recurringLoading ? (
            <div className="empty-state">Loading…</div>
          ) : recurrings.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><RefreshCw size={28} /></div>No recurring transactions.<br /><span style={{ fontSize: "0.78rem" }}>Add rent, salary, subscriptions…</span></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recurrings.map(r => {
                const meta = getCategoryMeta(r.category);
                return (
                  <div key={r._id} className={`tx-item ${!r.isActive ? "recurring-paused" : ""}`}>
                    <div className="cat-icon" style={{ background: `${meta.color}20` }}>{getCategoryIcon(meta.icon, 18, meta.color)}</div>
                    <div className="tx-info">
                      <div className="tx-desc">{r.description || meta.label}</div>
                      <div className="tx-meta">
                        {FREQ_LABELS[r.frequency]} · Next: {formatDate(r.nextDate)}
                        {r.merchant && <span> · {r.merchant}</span>}
                        {!r.isActive && <span style={{ color: "var(--text-muted)" }}> · paused</span>}
                      </div>
                    </div>
                    <div className="tx-right">
                      <span className={`tx-amount ${r.type === "income" ? "c-income" : "c-expense"}`}>
                        {r.type === "income" ? "+" : "−"}{sym(r.currency)}{Number(r.amount).toLocaleString("en-IN")}
                      </span>
                      <div className="tx-actions" style={{ opacity: 1 }}>
                        <button className="icon-btn" title={r.isActive ? "Pause" : "Resume"} onClick={() => toggleRecurring(r)}>{r.isActive ? "⏸" : "▶️"}</button>
                        <button className="icon-btn" onClick={() => openEditRecurring(r)}>✏️</button>
                        <button className="icon-btn" onClick={() => deleteRecurring(r._id)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          GROUP TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "group" && (
        <div className="tab-content group-section">
          {groupMsg.text && <div className={`alert ${groupMsg.type === "error" ? "alert-error" : "alert-success"}`}>{groupMsg.text}</div>}

          {/* Pending invite */}
          {!groupData.group && groupData.pendingInvite && (
            <div className="chart-card" style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>Invited to <strong>{groupData.pendingInvite.groupName}</strong></p>
              <button className="btn" style={{ width: "auto", padding: "0.55rem 1.2rem", marginTop: 0 }} onClick={() => acceptInvite(groupData.pendingInvite.groupId)} disabled={groupLoading}>{groupLoading ? "Joining…" : "Accept Invite"}</button>
            </div>
          )}

          {/* No group */}
          {!groupData.group && !groupData.pendingInvite && (
            <div className="chart-card">
              <div className="chart-title">Create a Group</div>
              <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Share expenses with your partner or family.</p>
              <div className="form-group">
                <label className="form-label">Group Name</label>
                <input className="form-input" placeholder="e.g. Our Home" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === "Enter" && createGroup()} />
              </div>
              <button className="btn" style={{ marginTop: "0.25rem" }} onClick={createGroup} disabled={groupLoading || !newGroupName.trim()}>{groupLoading ? "Creating…" : "Create Group"}</button>
            </div>
          )}

          {/* In group */}
          {groupData.group && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{groupData.group.name}</h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{groupData.group.members.length} member{groupData.group.members.length !== 1 ? "s" : ""}</p>
                </div>
                <button className="icon-btn" onClick={leaveGroup} style={{ fontSize: "0.78rem", color: "var(--error)" }}>Leave</button>
              </div>

              {/* Members */}
              <div className="section-label">Members</div>
              {groupData.group.members.map(m => (
                <div key={m.email} className="member-item">
                  <div className="member-avatar">{(m.name || m.email)[0].toUpperCase()}</div>
                  <div className="member-info">
                    <div className="member-name">{m.name || m.email}</div>
                    <div className="member-email">{m.email}</div>
                  </div>
                  {m.role === "admin" && <span className="member-badge">admin</span>}
                </div>
              ))}

              {/* Invite */}
              <div className="section-label" style={{ marginTop: "1.25rem" }}>Invite Someone</div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input className="form-input" type="email" placeholder="email@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && inviteMember()} />
                <button className="btn" style={{ width: "auto", padding: "0.7rem 1rem", marginTop: 0 }} onClick={inviteMember} disabled={groupLoading || !inviteEmail.trim()}>Invite</button>
              </div>

              {/* Pending invites */}
              {groupData.group.pendingInvites?.length > 0 && (
                <>
                  <div className="section-label" style={{ marginTop: "1rem" }}>Pending Invites</div>
                  {groupData.group.pendingInvites.map(inv => (
                    <div key={inv.email} className="member-item" style={{ opacity: 0.65 }}>
                      <div className="member-avatar" style={{ background: "var(--surface2)" }}>📧</div>
                      <div className="member-info"><div className="member-name">{inv.email}</div><div className="member-email">Invite pending</div></div>
                    </div>
                  ))}
                </>
              )}

              {/* Settle up */}
              <div className="section-label" style={{ marginTop: "1.5rem" }}>Settle Up</div>
              {balances.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "0.75rem" }}>
                  {balances.map(b => (
                    <div key={b.email} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", padding: "0.5rem 0.75rem", background: "var(--surface2)", borderRadius: "var(--radius)" }}>
                      <span>{b.name}</span>
                      <span style={{ fontWeight: 700, color: b.net >= 0 ? "var(--success)" : "var(--error)" }}>{b.net >= 0 ? "+" : ""}{fmt(b.net)}</span>
                    </div>
                  ))}
                </div>
              )}
              {settlements.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1rem" }}>
                  {settlements.map((s, i) => (
                    <div key={i} className="settlement-row">
                      <span>{s.from.split("@")[0]}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>owes</span>
                      <span>{fmt(s.amount)}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>to</span>
                      <span>{s.to.split("@")[0]}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>All settled up ✓</div>
              )}

              {/* Activity feed */}
              <div className="section-label" style={{ marginTop: "0.5rem" }}>Activity</div>
              {activity.length === 0 ? (
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No activity yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {activity.slice(0, 20).map((a, i) => (
                    <div key={i} className="activity-item">
                      <div className="member-avatar" style={{ width: 28, height: 28, fontSize: "0.7rem" }}>{(a.userName || a.userEmail || "?")[0].toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "0.82rem" }}><strong>{a.userName || a.userEmail}</strong> {a.action} {a.detail}</span>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{formatDate(a.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LOANS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "loans" && (
        <div className="tab-content">
          {/* Summary bar */}
          {!loansLoading && loans.length > 0 && (() => {
            const totalBorrowed = loans.filter(l => l.type === "borrowed" && l.status === "active").reduce((s, l) => s + l.outstanding, 0);
            const totalLent     = loans.filter(l => l.type === "lent"     && l.status === "active").reduce((s, l) => s + l.outstanding, 0);
            return (
              <div className="stat-grid" style={{ marginBottom: "1.25rem" }}>
                <div className="stat-card">
                  <div className="stat-card-label">You Owe</div>
                  <div className="stat-card-value c-expense">{fmt(totalBorrowed)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Owed to You</div>
                  <div className="stat-card-value c-income">{fmt(totalLent)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Net Position</div>
                  <div className={`stat-card-value ${totalLent - totalBorrowed >= 0 ? "c-pos" : "c-neg"}`}>{fmt(totalLent - totalBorrowed)}</div>
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600 }}>Loans & Debts</h3>
            <button className="btn" style={{ width: "auto", padding: "0.42rem 0.9rem", fontSize: "0.82rem", marginTop: 0 }} onClick={openAddLoan}>+ New Loan</button>
          </div>

          {loansLoading ? (
            <div className="empty-state">Loading…</div>
          ) : loans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><CreditCard size={28} /></div>
              No loans tracked.<br /><span style={{ fontSize: "0.78rem" }}>Add money you borrowed or lent.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {loans.map(l => {
                const paidPct = l.principal > 0 ? Math.min(((l.principal - l.outstanding) / l.principal) * 100, 100) : 0;
                const daysLeft = l.dueDate ? Math.ceil((new Date(l.dueDate) - Date.now()) / 86400000) : null;
                const overdue  = daysLeft !== null && daysLeft < 0 && l.status === "active";
                return (
                  <div key={l._id} className={`loan-card ${l.status === "closed" ? "loan-closed" : ""}`}>
                    <div className="loan-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div className={`loan-type-badge ${l.type === "borrowed" ? "loan-borrowed" : "loan-lent"}`}>
                          {l.type === "borrowed" ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                          {l.type === "borrowed" ? "Borrowed" : "Lent"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{l.party}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "capitalize" }}>{l.purpose}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                        {l.status === "active" && <button className="icon-btn" onClick={() => openPayment(l)} title="Log payment" style={{ fontSize: "0.75rem", color: "var(--success)" }}>Pay</button>}
                        <button className="icon-btn" onClick={() => closeLoan(l)} title={l.status === "active" ? "Mark closed" : "Reopen"} style={{ fontSize: "0.85rem" }}>{l.status === "active" ? "✅" : "↩️"}</button>
                        <button className="icon-btn" onClick={() => openEditLoan(l)}>✏️</button>
                        <button className="icon-btn" onClick={() => deleteLoan(l._id)}>🗑️</button>
                      </div>
                    </div>

                    {/* Paid / Remaining / Principal row */}
                    <div className="loan-breakdown-grid">
                      <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "0.4rem 0.3rem" }}>
                        <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", marginBottom: "0.15rem" }}>Principal</div>
                        <div style={{ fontWeight: 600, fontSize: "0.78rem" }}>{fmt(l.principal, l.currency)}</div>
                      </div>
                      <div style={{ background: "rgba(52,211,153,0.1)", borderRadius: 8, padding: "0.4rem 0.3rem" }}>
                        <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", marginBottom: "0.15rem" }}>Paid</div>
                        <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--success)" }}>{fmt(l.principal - l.outstanding, l.currency)}</div>
                      </div>
                      <div style={{ background: l.type === "borrowed" ? "rgba(248,113,113,0.1)" : "rgba(52,211,153,0.08)", borderRadius: 8, padding: "0.4rem 0.3rem" }}>
                        <div style={{ fontSize: "0.58rem", color: "var(--text-muted)", marginBottom: "0.15rem" }}>Remaining</div>
                        <div style={{ fontWeight: 700, fontSize: "0.78rem", color: l.type === "borrowed" ? "var(--error)" : "var(--success)" }}>{fmt(l.outstanding, l.currency)}</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {l.status === "active" && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                          <span>{paidPct.toFixed(0)}% paid</span>
                          <span style={{ display: "flex", gap: "0.75rem" }}>
                            {l.emiAmount > 0 && (() => {
                              const paidInstallments = Math.round((l.principal - l.outstanding) / l.emiAmount);
                              const totalInstallments = Math.round(l.principal / l.emiAmount);
                              return <span>EMI {fmt(l.emiAmount, l.currency)} · {paidInstallments}/{totalInstallments} installments</span>;
                            })()}
                            {l.interestRate > 0 && <span>{l.interestRate}% p.a.</span>}
                          </span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${paidPct}%`, background: "var(--success)" }} />
                        </div>
                      </>
                    )}

                    {/* Due date + last payment */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.67rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                      {daysLeft !== null ? (
                        <span style={{ color: overdue ? "var(--error)" : daysLeft < 15 ? "#ffd43b" : "var(--text-muted)" }}>
                          {overdue ? `${Math.abs(daysLeft)}d overdue` : `Due in ${daysLeft}d`}
                        </span>
                      ) : <span />}
                      {l.payments?.length > 0 && (
                        <span>{l.payments.length} payment{l.payments.length !== 1 ? "s" : ""} · Last {fmt(l.payments[l.payments.length - 1].amount, l.currency)} on {formatDate(l.payments[l.payments.length - 1].date)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          INVESTMENTS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "investments" && (
        <div className="tab-content">
          {/* Portfolio summary */}
          {!investLoading && investSummary && investments.length > 0 && (
            <>
              <div className="stat-grid" style={{ marginBottom: "1rem" }}>
                <div className="stat-card">
                  <div className="stat-card-label">Invested</div>
                  <div className="stat-card-value">{fmt(investSummary.totalInvested)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Current Value</div>
                  <div className="stat-card-value c-income">{fmt(investSummary.totalCurrent)}</div>
                </div>
                <div className="stat-card" style={{ gridColumn: "1 / -1" }}>
                  <div className="stat-card-label">Total Gain / Loss</div>
                  <div className={`stat-card-value ${investSummary.totalGain >= 0 ? "c-pos" : "c-neg"}`}>
                    {investSummary.totalGain >= 0 ? "+" : ""}{fmt(investSummary.totalGain)}
                    <span style={{ fontSize: "0.7rem", fontWeight: 500, marginLeft: "0.4rem" }}>
                      ({investSummary.gainPct >= 0 ? "+" : ""}{investSummary.gainPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Allocation donut */}
              {Object.keys(investSummary.byType).length > 1 && (
                <div className="chart-card" style={{ marginBottom: "1rem" }}>
                  <div className="chart-title">Allocation</div>
                  <div className="two-col-charts" style={{ gap: "0.5rem", alignItems: "center" }}>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={Object.entries(investSummary.byType).map(([k, v]) => ({ name: k, value: v.current }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                          {Object.keys(investSummary.byType).map((k, i) => {
                            const t = INVEST_TYPES.find(t => t.key === k);
                            return <Cell key={k} fill={t?.color || CHART_COLORS[i % CHART_COLORS.length]} />;
                          })}
                        </Pie>
                        <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.8rem" }} formatter={v => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-legend">
                      {Object.entries(investSummary.byType).map(([k, v], i) => {
                        const t = INVEST_TYPES.find(t => t.key === k);
                        const gainPct = v.invested > 0 ? ((v.current - v.invested) / v.invested * 100).toFixed(1) : "0.0";
                        return (
                          <div key={k} className="donut-legend-item">
                            <span className="donut-dot" style={{ background: t?.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="donut-label">{t?.label || k}</span>
                            <span className="donut-value" style={{ color: Number(gainPct) >= 0 ? "var(--success)" : "var(--error)" }}>{Number(gainPct) >= 0 ? "+" : ""}{gainPct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600 }}>Portfolio</h3>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {refreshMsg && <span style={{ fontSize: "0.75rem", color: "var(--success)" }}>{refreshMsg}</span>}
              <button className="btn btn-ghost" style={{ width: "auto", padding: "0.42rem 0.9rem", fontSize: "0.82rem", marginTop: 0 }} onClick={refreshAllPrices} disabled={refreshing}>
                {refreshing ? "Refreshing…" : "⟳ Refresh Prices"}
              </button>
              <button className="btn" style={{ width: "auto", padding: "0.42rem 0.9rem", fontSize: "0.82rem", marginTop: 0 }} onClick={openAddInvest}>+ Add</button>
            </div>
          </div>

          {investLoading ? (
            <div className="empty-state">Loading…</div>
          ) : investments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><PiggyBank size={28} /></div>
              No investments tracked.<br /><span style={{ fontSize: "0.78rem" }}>Add MF, stocks, FD, gold…</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {investments.map(inv => {
                const gain    = inv.currentValue - inv.investedAmount;
                const gainPct = inv.investedAmount > 0 ? (gain / inv.investedAmount) * 100 : 0;
                const t       = INVEST_TYPES.find(t => t.key === inv.type);
                return (
                  <div key={inv._id} className="invest-card">
                    <div className="invest-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                        <div className="invest-type-dot" style={{ background: t?.color || "#6b7280" }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.name}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{t?.label || inv.type}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", flexShrink: 0 }}>
                        <button className="icon-btn" onClick={() => openEditInvest(inv)}>✏️</button>
                        <button className="icon-btn" onClick={() => deleteInvest(inv._id)}>🗑️</button>
                      </div>
                    </div>
                    <div className="invest-values">
                      <div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Invested</div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{fmt(inv.investedAmount, inv.currency)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Current</div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{fmt(inv.currentValue, inv.currency)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Gain/Loss</div>
                        <div style={{ fontWeight: 700, fontSize: "0.875rem", color: gain >= 0 ? "var(--success)" : "var(--error)" }}>
                          {gain >= 0 ? "+" : ""}{fmt(gain, inv.currency)}
                          <span style={{ fontSize: "0.65rem", marginLeft: "0.2rem" }}>({gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%)</span>
                        </div>
                      </div>
                    </div>
                    {inv.units > 0 && (
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                        {inv.units} units · Avg {fmt(inv.avgPrice, inv.currency)}
                      </div>
                    )}
                    {inv.maturityDate && (
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        Matures {formatDate(inv.maturityDate)}
                      </div>
                    )}
                    {inv.notes && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{inv.notes}</div>}
                    {inv.lastPriceAt && (
                      <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        Price updated {new Date(inv.lastPriceAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ANALYTICS TAB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "analytics" && (
        <div className="tab-content">
          <div className="filter-row" style={{ marginBottom: "1.25rem" }}>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="form-input" style={{ width: "auto" }}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {analyticsLoading && <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Loading…</span>}
          </div>

          {/* Summary stats */}
          {analytics && (
            <div className="stat-grid" style={{ marginBottom: "1.25rem" }}>
              <div className="stat-card">
                <div className="stat-card-label">Total Spent ({selectedYear})</div>
                <div className="stat-card-value c-expense">{fmt(analytics.yearMonths?.reduce((s, m) => s + m.total, 0) || 0)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Avg / Month</div>
                <div className="stat-card-value">{fmt(Math.round((analytics.yearMonths?.reduce((s, m) => s + m.total, 0) || 0) / 12))}</div>
              </div>
              {analytics.totalIncome > 0 && (
                <div className="stat-card" style={{ gridColumn: "1 / -1" }}>
                  <div className="stat-card-label">Savings Rate (this month)</div>
                  <div className={`stat-card-value ${analytics.net >= 0 ? "c-pos" : "c-neg"}`}>
                    {analytics.totalIncome > 0 ? `${Math.round((analytics.net / analytics.totalIncome) * 100)}%` : "—"}
                    <span style={{ fontSize: "0.72rem", fontWeight: 400, marginLeft: "0.5rem", color: "var(--text-muted)" }}>({fmt(analytics.net)} saved)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6-month income vs expense trend */}
          <div className="chart-card" style={{ marginBottom: "1rem" }}>
            <div className="chart-title">6-Month Income vs Expense</div>
            {analyticsLoading ? <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Loading…</div> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={analytics?.byMonth || []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.8rem" }} formatter={v => fmt(v)} />
                  <Bar dataKey="income"  fill="#34d399" radius={[3, 3, 0, 0]} name="Income" />
                  <Bar dataKey="expense" fill="#f87171" radius={[3, 3, 0, 0]} name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly savings trend */}
          <div className="chart-card" style={{ marginBottom: "1rem" }}>
            <div className="chart-title">Monthly Savings Trend</div>
            {analyticsLoading ? <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Loading…</div> : (
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={(analytics?.byMonth || []).map(m => ({ label: m.label, saved: m.income - m.expense }))} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.8rem" }} formatter={v => fmt(v)} />
                  <Line type="monotone" dataKey="saved" stroke="#8b85ff" strokeWidth={2} dot={{ r: 3, fill: "#6c63ff" }} name="Saved" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Year monthly breakdown table */}
          <div className="chart-card" style={{ marginBottom: "1rem" }}>
            <div className="chart-title">{selectedYear} Monthly Spending</div>
            {analyticsLoading ? <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Loading…</div> : (
              <div className="year-months-grid">
                {(analytics?.yearMonths || []).map(m => (
                  <div key={m.month} className={`year-month-card ${m.month === selectedMonth ? "selected" : ""}`} onClick={() => { setSelectedMonth(m.month); setActiveTab("overview"); }}>
                    <div className="year-month-name">{m.name}</div>
                    <div className="year-month-total">{fmt(m.total)}</div>
                    <div className="year-month-count">{m.count} tx</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category breakdown */}
          <div className="chart-card" style={{ marginBottom: "1rem" }}>
            <div className="chart-title">Top Categories (this month)</div>
            {analyticsLoading ? <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Loading…</div> : analytics?.byCategory?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {analytics.byCategory.map((c, i) => {
                  const pct = analytics.totalExpense > 0 ? Math.round((c.total / analytics.totalExpense) * 100) : 0;
                  return (
                    <div key={c.category}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.2rem" }}>
                        <span style={{ textTransform: "capitalize" }}>{c.category}</span>
                        <span style={{ color: "var(--text-muted)" }}>{fmt(c.total)} <span style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>· {pct}%</span></span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div className="empty-state" style={{ padding: "1.5rem 0" }}>No expense data for this month.</div>}
          </div>

          {/* 5-year totals */}
          <div className="chart-card">
            <div className="chart-title">5-Year Overview</div>
            {analyticsLoading ? <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>Loading…</div> : (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={analytics?.yearTotals || []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="year" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.8rem" }} formatter={v => fmt(v)} />
                  <Bar dataKey="total" fill="#6c63ff" radius={[3, 3, 0, 0]} name="Total Spent" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      {activeTab === "transactions" && <button className="fab" onClick={openAdd}>+</button>}

      {/* ══════════════════════════════════════════════════════════════════
          ADD / EDIT EXPENSE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">
              <span>{editExpense ? "Edit Transaction" : "Add Transaction"}</span>
              <button className="icon-btn" onClick={() => setShowModal(false)} style={{ fontSize: "1rem" }}>✕</button>
            </div>

            <div className="type-toggle">
              <button className={`type-btn ${form.type === "expense" ? "active-expense" : ""}`} onClick={() => setForm(f => ({ ...f, type: "expense", category: "food" }))}>Expense</button>
              <button className={`type-btn ${form.type === "income"  ? "active-income"  : ""}`} onClick={() => setForm(f => ({ ...f, type: "income",  category: "salary" }))}>Income</button>
            </div>

            {/* Amount + Currency */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem" }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Amount</label>
                <input className="form-input" type="number" min="0" step="0.01" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} autoFocus />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Currency</label>
                <select className="form-input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label">Category</label>
              <div className="cat-grid">
                {cats.map(c => (
                  <button key={c.key} className={`cat-btn ${form.category === c.key ? "selected" : ""}`} onClick={() => setForm(f => ({ ...f, category: c.key }))}>
                    {getCategoryIcon(c.icon, 18, c.color)}<span>{c.label.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description + Merchant */}
            <div className="form-group">
              <label className="form-label">Description <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
              <input className="form-input" type="text" placeholder="e.g. Lunch with team" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Merchant <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
              <input className="form-input" type="text" placeholder="e.g. Zomato, Amazon" value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tags <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(comma-separated)</span></label>
              <input className="form-input" type="text" placeholder="work, reimbursable" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>

            {/* Date */}
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} max={todayISO()} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            {/* Share toggle + split */}
            {inGroup && form.type === "expense" && (
              <>
                <div className="toggle-row">
                  <span className="toggle-label">Share with group</span>
                  <button className={`toggle-switch ${form.isShared ? "on" : ""}`} onClick={() => setForm(f => ({ ...f, isShared: !f.isShared }))} />
                </div>
                {form.isShared && (
                  <>
                    <div className="form-group" style={{ marginTop: "0.75rem" }}>
                      <label className="form-label">Paid by</label>
                      <select className="form-input" value={form.paidBy} onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))}>
                        {stats?.groupMembers?.map(m => <option key={m.email} value={m.email}>{m.name || m.email}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Split</label>
                      <div className="type-toggle" style={{ marginBottom: 0 }}>
                        {["equal","percentage","custom"].map(s => (
                          <button key={s} className={`type-btn ${form.splitType === s ? "active-expense" : ""}`} onClick={() => setForm(f => ({ ...f, splitType: s }))}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                      {form.splitType !== "equal" && (
                        <input className="form-input" style={{ marginTop: "0.5rem" }} placeholder={form.splitType === "percentage" ? '{"alice@x.com":60,"bob@x.com":40}' : '{"alice@x.com":300,"bob@x.com":200}'} value={form.splitDetails} onChange={e => setForm(f => ({ ...f, splitDetails: e.target.value }))} />
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {formError && <div className="alert alert-error" style={{ marginTop: "0.75rem" }}>{formError}</div>}
            <button className="btn" style={{ marginTop: "1rem" }} onClick={saveExpense} disabled={formLoading}>{formLoading ? "Saving…" : editExpense ? "Update" : "Add Transaction"}</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          GOAL MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowGoalModal(false)}>
          <div className="modal">
            <div className="modal-title">
              <span>{editGoal ? "Edit Goal" : "New Savings Goal"}</span>
              <button className="icon-btn" onClick={() => setShowGoalModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Goal Name</label>
              <input className="form-input" placeholder="e.g. Vacation fund" value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Target Amount</label>
                <input className="form-input" type="number" min="1" value={goalForm.targetAmount} onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Saved So Far</label>
                <input className="form-input" type="number" min="0" value={goalForm.savedAmount} onChange={e => setGoalForm(f => ({ ...f, savedAmount: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Currency</label>
                <select className="form-input" value={goalForm.currency} onChange={e => setGoalForm(f => ({ ...f, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Deadline <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
                <input className="form-input" type="date" value={goalForm.deadline} onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Colour</label>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {GOAL_COLORS.map(c => (
                  <button key={c} onClick={() => setGoalForm(f => ({ ...f, color: c }))} style={{ width: 26, height: 26, borderRadius: "50%", background: c, border: goalForm.color === c ? "3px solid #fff" : "2px solid transparent", cursor: "pointer" }} />
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
              <input className="form-input" placeholder="Any notes…" value={goalForm.notes} onChange={e => setGoalForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {goalError && <div className="alert alert-error">{goalError}</div>}
            <button className="btn" onClick={saveGoal} disabled={goalSaving}>{goalSaving ? "Saving…" : editGoal ? "Update Goal" : "Create Goal"}</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          RECURRING MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showRecurringModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRecurringModal(false)}>
          <div className="modal">
            <div className="modal-title">
              <span>{editRecurring ? "Edit Recurring" : "New Recurring Transaction"}</span>
              <button className="icon-btn" onClick={() => setShowRecurringModal(false)}>✕</button>
            </div>
            <div className="type-toggle">
              <button className={`type-btn ${recurringForm.type === "expense" ? "active-expense" : ""}`} onClick={() => setRecurringForm(f => ({ ...f, type: "expense", category: "food" }))}>Expense</button>
              <button className={`type-btn ${recurringForm.type === "income"  ? "active-income"  : ""}`} onClick={() => setRecurringForm(f => ({ ...f, type: "income",  category: "salary" }))}>Income</button>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div className="form-group" style={{ flex: 1, marginBottom: "0.85rem" }}>
                <label className="form-label">Amount</label>
                <input className="form-input" type="number" min="0" value={recurringForm.amount} onChange={e => setRecurringForm(f => ({ ...f, amount: e.target.value }))} autoFocus />
              </div>
              <div className="form-group" style={{ marginBottom: "0.85rem" }}>
                <label className="form-label">Currency</label>
                <select className="form-input" value={recurringForm.currency} onChange={e => setRecurringForm(f => ({ ...f, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={recurringForm.category} onChange={e => setRecurringForm(f => ({ ...f, category: e.target.value }))}>
                {(recurringForm.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Frequency</label>
              <div className="type-toggle" style={{ marginBottom: 0 }}>
                {Object.entries(FREQ_LABELS).map(([k, v]) => (
                  <button key={k} className={`type-btn ${recurringForm.frequency === k ? "active-expense" : ""}`} onClick={() => setRecurringForm(f => ({ ...f, frequency: k }))}>{v}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
              <input className="form-input" placeholder="e.g. Monthly rent" value={recurringForm.description} onChange={e => setRecurringForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Merchant <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
              <input className="form-input" placeholder="e.g. Netflix" value={recurringForm.merchant} onChange={e => setRecurringForm(f => ({ ...f, merchant: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input className="form-input" type="date" value={recurringForm.startDate} onChange={e => setRecurringForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            {recurringError && <div className="alert alert-error">{recurringError}</div>}
            <button className="btn" onClick={saveRecurring} disabled={recurringSaving}>{recurringSaving ? "Saving…" : editRecurring ? "Update" : "Create"}</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LOAN MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showLoanModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLoanModal(false)}>
          <div className="modal">
            <div className="modal-title">
              <span>{editLoan ? "Edit Loan" : "New Loan"}</span>
              <button className="icon-btn" onClick={() => setShowLoanModal(false)}>✕</button>
            </div>

            <div className="type-toggle">
              <button className={`type-btn ${loanForm.type === "borrowed" ? "active-expense" : ""}`} onClick={() => setLoanForm(f => ({ ...f, type: "borrowed" }))}>I Borrowed</button>
              <button className={`type-btn ${loanForm.type === "lent"     ? "active-income"  : ""}`} onClick={() => setLoanForm(f => ({ ...f, type: "lent" }))}>I Lent</button>
            </div>

            <div className="form-group">
              <label className="form-label">{loanForm.type === "borrowed" ? "Lender Name" : "Borrower Name"}</label>
              <input className="form-input" placeholder="e.g. Bank, Friend's name" value={loanForm.party} onChange={e => setLoanForm(f => ({ ...f, party: e.target.value }))} autoFocus />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Principal Amount</label>
                <input className="form-input" type="number" min="1" value={loanForm.principal} onChange={e => setLoanForm(f => ({ ...f, principal: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-input" value={loanForm.currency} onChange={e => setLoanForm(f => ({ ...f, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Already Paid <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(for partially paid loans)</span></label>
              <input className="form-input" type="number" min="0" placeholder="0" value={loanForm.alreadyPaid} onChange={e => setLoanForm(f => ({ ...f, alreadyPaid: e.target.value }))} />
              {Number(loanForm.alreadyPaid) > 0 && Number(loanForm.principal) > 0 && (
                <div style={{ fontSize: "0.72rem", marginTop: "0.3rem", display: "flex", gap: "1rem" }}>
                  <span style={{ color: "var(--success)" }}>Paid: {fmt(Math.min(Number(loanForm.alreadyPaid), Number(loanForm.principal)), loanForm.currency)}</span>
                  <span style={{ color: "var(--error)" }}>Remaining: {fmt(Math.max(0, Number(loanForm.principal) - Number(loanForm.alreadyPaid)), loanForm.currency)}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Purpose</label>
              <select className="form-input" value={loanForm.purpose} onChange={e => setLoanForm(f => ({ ...f, purpose: e.target.value }))}>
                {LOAN_PURPOSES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Interest Rate (% p.a.)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={loanForm.interestRate} onChange={e => setLoanForm(f => ({ ...f, interestRate: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Interest Type</label>
                <select className="form-input" value={loanForm.interestType} onChange={e => setLoanForm(f => ({ ...f, interestType: e.target.value }))}>
                  <option value="none">None / 0%</option>
                  <option value="simple">Simple</option>
                  <option value="compound">Compound</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">EMI Amount <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
              <input className="form-input" type="number" min="0" placeholder="0" value={loanForm.emiAmount} onChange={e => setLoanForm(f => ({ ...f, emiAmount: e.target.value }))} />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={loanForm.startDate} onChange={e => setLoanForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Due Date <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
                <input className="form-input" type="date" value={loanForm.dueDate} onChange={e => setLoanForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
              <input className="form-input" placeholder="Any notes…" value={loanForm.notes} onChange={e => setLoanForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {loanError && <div className="alert alert-error">{loanError}</div>}
            <button className="btn" onClick={saveLoan} disabled={loanSaving}>{loanSaving ? "Saving…" : editLoan ? "Update Loan" : "Add Loan"}</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          PAYMENT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showPaymentModal && paymentLoan && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPaymentModal(false)}>
          <div className="modal">
            <div className="modal-title">
              <span>Log Payment — {paymentLoan.party}</span>
              <button className="icon-btn" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Outstanding: <strong style={{ color: "var(--error)" }}>{fmt(paymentLoan.outstanding, paymentLoan.currency)}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Payment Amount</label>
              <input className="form-input" type="number" min="1" max={paymentLoan.outstanding} placeholder="0" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={paymentDate} max={todayISO()} onChange={e => setPaymentDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Note <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
              <input className="form-input" placeholder="e.g. EMI #3" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} />
            </div>
            <button className="btn" onClick={savePayment} disabled={paymentSaving || !paymentAmount}>{paymentSaving ? "Saving…" : "Record Payment"}</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          INVESTMENT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {showInvestModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowInvestModal(false)}>
          <div className="modal">
            <div className="modal-title">
              <span>{editInvest ? "Edit Investment" : "Add Investment"}</span>
              <button className="icon-btn" onClick={() => setShowInvestModal(false)}>✕</button>
            </div>

            {/* Type selector */}
            <div className="form-group">
              <label className="form-label">Type</label>
              <div className="invest-type-grid">
                {INVEST_TYPES.map(t => (
                  <button key={t.key} className={`invest-type-btn ${investForm.type === t.key ? "selected" : ""}`} style={investForm.type === t.key ? { borderColor: t.color, background: `${t.color}18`, color: t.color } : {}} onClick={() => { setInvestForm(f => ({ ...f, type: t.key, schemeCode: "", stockSymbol: "" })); setMfQuery(""); setMfResults([]); }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MF search */}
            {investForm.type === "mutual_fund" && (
              <div className="form-group" style={{ position: "relative" }}>
                <label className="form-label">Search Fund <span style={{ textTransform: "none", fontWeight: 400, color: "var(--success)", fontSize: "0.68rem" }}>● Live NAV</span></label>
                <input className="form-input" placeholder="Type fund name e.g. SBI Bluechip…" value={mfQuery} onChange={e => onMfQueryChange(e.target.value)} autoFocus />
                {mfSearching && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>Searching…</div>}
                {mfResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", zIndex: 50, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                    {mfResults.map(r => (
                      <div key={r.schemeCode} onClick={() => selectMf(r)} style={{ padding: "0.6rem 0.75rem", cursor: "pointer", fontSize: "0.8rem", borderBottom: "1px solid var(--border)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ fontWeight: 500 }}>{r.schemeName}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Code: {r.schemeCode}</div>
                      </div>
                    ))}
                  </div>
                )}
                {investForm.schemeCode && <div style={{ fontSize: "0.7rem", color: "var(--success)", marginTop: "0.25rem" }}>✓ Linked — NAV auto-fetched</div>}
              </div>
            )}

            {/* Stock symbol */}
            {investForm.type === "stocks" && (
              <div className="form-group">
                <label className="form-label">Stock Symbol <span style={{ textTransform: "none", fontWeight: 400, color: "var(--success)", fontSize: "0.68rem" }}>● Live Price</span></label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input className="form-input" placeholder="e.g. RELIANCE, TCS, INFY" value={investForm.stockSymbol} onChange={e => setInvestForm(f => ({ ...f, stockSymbol: e.target.value.toUpperCase() }))} style={{ flex: 1 }} />
                  <select className="form-input" value={investForm.stockExchange} onChange={e => setInvestForm(f => ({ ...f, stockExchange: e.target.value }))} style={{ width: 80 }}>
                    <option value="NS">NSE</option>
                    <option value="BO">BSE</option>
                  </select>
                  <button className="btn" style={{ width: "auto", padding: "0.42rem 0.8rem", fontSize: "0.8rem", marginTop: 0, flexShrink: 0 }} onClick={fetchStockPrice} disabled={stockFetching || !investForm.stockSymbol.trim()}>
                    {stockFetching ? "…" : "Get Price"}
                  </button>
                </div>
              </div>
            )}

            {/* Name (manual if not MF) */}
            {investForm.type !== "mutual_fund" && (
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="e.g. HDFC Bank, SGB 2024" value={investForm.name} onChange={e => setInvestForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            )}

            {/* Units + Avg price */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Units / Shares</label>
                <input className="form-input" type="number" min="0" step="0.001" placeholder="0" value={investForm.units} onChange={e => setInvestForm(f => ({ ...f, units: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Avg Buy Price</label>
                <input className="form-input" type="number" min="0" step="0.01" placeholder="0" value={investForm.avgPrice} onChange={e => setInvestForm(f => ({ ...f, avgPrice: e.target.value }))} />
              </div>
            </div>

            {/* Invested + Current */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Amount Invested</label>
                <input className="form-input" type="number" min="0" value={investForm.investedAmount} onChange={e => setInvestForm(f => ({ ...f, investedAmount: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Current Value</label>
                <input className="form-input" type="number" min="0" value={investForm.currentValue} onChange={e => setInvestForm(f => ({ ...f, currentValue: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Currency</label>
                <select className="form-input" value={investForm.currency} onChange={e => setInvestForm(f => ({ ...f, currency: e.target.value }))}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={investForm.startDate} onChange={e => setInvestForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Maturity Date <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(FD / Bonds)</span></label>
              <input className="form-input" type="date" value={investForm.maturityDate} onChange={e => setInvestForm(f => ({ ...f, maturityDate: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Notes <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
              <input className="form-input" placeholder="Any notes…" value={investForm.notes} onChange={e => setInvestForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {investError && <div className="alert alert-error">{investError}</div>}
            <button className="btn" onClick={saveInvest} disabled={investSaving}>{investSaving ? "Saving…" : editInvest ? "Update" : "Add Investment"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const user = getAuthUser(ctx.req);
  if (!user) return { redirect: { destination: "/login", permanent: false } };
  return { props: {} };
}
