import connectDB from "../../../lib/mongodb";
import Investment from "../../../models/Investment";
import { getAuthUser } from "../../../lib/auth";
import mongoose from "mongoose";

async function fetchNAV(schemeCode) {
  const r = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
    headers: { "Accept": "application/json" },
  });
  if (!r.ok) return null;
  const data = await r.json();
  const nav = parseFloat(data.data?.[0]?.nav);
  return isNaN(nav) ? null : nav;
}

async function fetchStockPrice(symbol, exchange) {
  const ticker = `${symbol.toUpperCase()}.${exchange}`;
  const r = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
    { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
  );
  if (!r.ok) return null;
  const data = await r.json();
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  return price ?? null;
}

async function fetchGoldPricePerGram() {
  const [goldRes, fxRes] = await Promise.all([
    fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    }),
    fetch("https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X?interval=1d&range=1d", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
    }),
  ]);
  if (!goldRes.ok || !fxRes.ok) return null;
  const [goldData, fxData] = await Promise.all([goldRes.json(), fxRes.json()]);
  const goldUSD = goldData?.chart?.result?.[0]?.meta?.regularMarketPrice;
  const usdInr  = fxData?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (!goldUSD || !usdInr) return null;
  return (goldUSD / 31.1035) * usdInr;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();
  const userId = new mongoose.Types.ObjectId(String(authUser.userId));
  const investments = await Investment.find({ userId });

  const results = { updated: 0, skipped: 0, failed: 0 };

  // Pre-fetch gold price once if any gold holdings exist
  const hasGold = investments.some(i => i.type === "gold" && i.units > 0);
  let goldPricePerGram = null;
  if (hasGold) {
    try { goldPricePerGram = await fetchGoldPricePerGram(); } catch {}
  }

  await Promise.allSettled(
    investments.map(async (inv) => {
      let newPrice = null;

      if (inv.type === "mutual_fund" && inv.schemeCode) {
        newPrice = await fetchNAV(inv.schemeCode);
      } else if (inv.type === "stocks" && inv.stockSymbol) {
        newPrice = await fetchStockPrice(inv.stockSymbol, inv.stockExchange || "NS");
      } else if (inv.type === "gold" && inv.units > 0 && goldPricePerGram) {
        newPrice = goldPricePerGram;
      }

      if (newPrice === null) { results.skipped++; return; }

      // If units are tracked, current value = units × price
      const currentValue = inv.units > 0 ? inv.units * newPrice : newPrice;
      inv.currentValue = currentValue;
      inv.lastPriceAt  = new Date();
      try {
        await inv.save();
        results.updated++;
      } catch {
        results.failed++;
      }
    })
  );

  return res.json({ ...results, total: investments.length });
}
