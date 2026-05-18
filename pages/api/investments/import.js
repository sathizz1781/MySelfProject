import connectDB from "../../../lib/mongodb";
import Investment from "../../../models/Investment";
import { getAuthUser } from "../../../lib/auth";
import mongoose from "mongoose";
import XLSX from "xlsx";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

// Auto-link MF scheme code by searching mfapi.in
async function autoLinkSchemeCode(name) {
  try {
    const r = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(name.slice(0, 60))}`, {
      headers: { Accept: "application/json" }, signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return "";
    const results = await r.json();
    if (!results?.length) return "";
    // Take the top result — mfapi search is ranked by relevance
    return String(results[0].schemeCode || "");
  } catch { return ""; }
}

// Derive a likely NSE symbol from a stock name (best-effort cleanup)
function guessSymbol(name) {
  return name
    .replace(/\s+limited$/i, "").replace(/\s+ltd\.?$/i, "").replace(/\s+ltd$/i, "")
    .replace(/\s+pvt\.?$/i, "").replace(/\s+corp\.?$/i, "")
    .replace(/[^a-zA-Z0-9&]/g, "").toUpperCase().slice(0, 20);
}

// Find the header row index by looking for a known column name
function findHeaderRow(rows, markers) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(c => String(c || "").trim().toLowerCase());
    if (markers.some(m => row.some(c => c.includes(m)))) return i;
  }
  return -1;
}

// Build a map: { lowerCaseHeader: colIndex }
function buildColMap(headerRow) {
  const map = {};
  headerRow.forEach((cell, i) => {
    const key = String(cell || "").trim().toLowerCase();
    if (key) map[key] = i;
  });
  return map;
}

function colVal(row, colMap, ...candidates) {
  for (const c of candidates) {
    const idx = Object.keys(colMap).find(k => k.includes(c));
    if (idx !== undefined && row[colMap[idx]] !== undefined && row[colMap[idx]] !== "") {
      return row[colMap[idx]];
    }
  }
  return null;
}

function toNum(v) {
  const n = parseFloat(String(v || "0").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });

  const { file, preview } = req.body;
  if (!file) return res.status(400).json({ error: "No file provided" });

  // Decode base64 and parse workbook
  const buf = Buffer.from(file, "base64");
  const wb  = XLSX.read(buf, { type: "buffer" });
  const ws  = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // ── Detect format ────────────────────────────────────────────────────────────
  const mfHeaderIdx    = findHeaderRow(raw, ["scheme name", "schemename"]);
  const stockHeaderIdx = findHeaderRow(raw, ["stock name", "stockname"]);

  let investments = [];
  let format = "unknown";

  if (mfHeaderIdx !== -1) {
    // ── MF format ──────────────────────────────────────────────────────────────
    format = "mf";
    const colMap = buildColMap(raw[mfHeaderIdx]);
    for (let i = mfHeaderIdx + 1; i < raw.length; i++) {
      const row = raw[i];
      const name = String(colVal(row, colMap, "scheme name") || "").trim();
      if (!name || name.toLowerCase().includes("total") || name.toLowerCase().includes("grand")) continue;

      const units         = toNum(colVal(row, colMap, "units"));
      const investedValue = toNum(colVal(row, colMap, "invested value", "invested"));
      const currentValue  = toNum(colVal(row, colMap, "current value", "market value"));
      const amc           = String(colVal(row, colMap, "amc") || "").trim();
      const category      = String(colVal(row, colMap, "category") || "").trim();
      const folio         = String(colVal(row, colMap, "folio") || "").trim();
      const xirr          = String(colVal(row, colMap, "xirr") || "").trim();

      if (!name || (investedValue === 0 && currentValue === 0)) continue;

      investments.push({
        name,
        type:           "mutual_fund",
        investedAmount: investedValue,
        currentValue:   currentValue || investedValue,
        units,
        avgPrice:       units > 0 ? Math.round((investedValue / units) * 1000) / 1000 : 0,
        currency:       "INR",
        notes:          [amc, category, folio && `Folio: ${folio}`, xirr && `XIRR: ${xirr}`].filter(Boolean).join(" · "),
        schemeCode:     "",
        stockSymbol:    "",
        stockExchange:  "NS",
      });
    }
  } else if (stockHeaderIdx !== -1) {
    // ── Stock format ───────────────────────────────────────────────────────────
    format = "stock";
    const colMap = buildColMap(raw[stockHeaderIdx]);
    for (let i = stockHeaderIdx + 1; i < raw.length; i++) {
      const row = raw[i];
      const name = String(colVal(row, colMap, "stock name") || "").trim();
      if (!name || name.toLowerCase().includes("total")) continue;

      const qty       = toNum(colVal(row, colMap, "quantity"));
      const avgPrice  = toNum(colVal(row, colMap, "average buy price", "avg"));
      const buyValue  = toNum(colVal(row, colMap, "buy value"));
      const closingV  = toNum(colVal(row, colMap, "closing value", "current value"));
      const isin      = String(colVal(row, colMap, "isin") || "").trim();

      if (!name || (qty === 0 && buyValue === 0)) continue;

      investments.push({
        name,
        type:           "stocks",
        investedAmount: buyValue || qty * avgPrice,
        currentValue:   closingV || buyValue || qty * avgPrice,
        units:          qty,
        avgPrice,
        currency:       "INR",
        notes:          isin ? `ISIN: ${isin}` : "",
        schemeCode:     "",
        stockSymbol:    "",
        stockExchange:  "NS",
      });
    }
  } else {
    return res.status(422).json({ error: "Could not detect MF or stock format. Make sure the file has a 'Scheme Name' or 'Stock Name' column." });
  }

  // Return preview without saving
  if (preview) {
    return res.json({ format, count: investments.length, preview: investments.slice(0, 5), investments });
  }

  // ── Auto-link scheme codes / symbols before saving ───────────────────────────
  await Promise.allSettled(investments.map(async (inv) => {
    if (inv.type === "mutual_fund" && !inv.schemeCode) {
      inv.schemeCode = await autoLinkSchemeCode(inv.name);
    } else if (inv.type === "stocks" && !inv.stockSymbol) {
      inv.stockSymbol = guessSymbol(inv.name);
    }
  }));

  // ── Save to DB ───────────────────────────────────────────────────────────────
  await connectDB();
  const userId = new mongoose.Types.ObjectId(String(authUser.userId));

  let created = 0, updated = 0, linked = 0;
  for (const inv of investments) {
    try {
      const existing = await Investment.findOne({ userId, name: inv.name, type: inv.type });
      if (existing) {
        // Update amounts and units but keep any manually-linked schemeCode/symbol
        existing.investedAmount = inv.investedAmount;
        existing.currentValue   = inv.currentValue;
        existing.units          = inv.units;
        existing.avgPrice       = inv.avgPrice;
        if (!existing.schemeCode  && inv.schemeCode)  existing.schemeCode  = inv.schemeCode;
        if (!existing.stockSymbol && inv.stockSymbol) existing.stockSymbol = inv.stockSymbol;
        await existing.save();
        updated++;
        if (existing.schemeCode || existing.stockSymbol) linked++;
      } else {
        await Investment.create({ userId, ...inv });
        created++;
        if (inv.schemeCode || inv.stockSymbol) linked++;
      }
    } catch { /* skip errors */ }
  }

  return res.json({ format, total: investments.length, created, updated, linked });
}
