export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const [goldRes, fxRes] = await Promise.all([
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d", {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      }),
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X?interval=1d&range=1d", {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
      }),
    ]);
    if (!goldRes.ok || !fxRes.ok) return res.status(502).json({ error: "Price fetch failed" });

    const [goldData, fxData] = await Promise.all([goldRes.json(), fxRes.json()]);
    const goldUSD = goldData?.chart?.result?.[0]?.meta?.regularMarketPrice;
    const usdInr  = fxData?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (!goldUSD || !usdInr) return res.status(502).json({ error: "Could not parse prices" });

    // 1 troy oz = 31.1035 grams
    const pricePerGramINR = (goldUSD / 31.1035) * usdInr;

    return res.json({
      goldUSD,
      usdInr: +usdInr.toFixed(4),
      pricePerGramINR: +pricePerGramINR.toFixed(2),
      pricePerTroyOzINR: +(goldUSD * usdInr).toFixed(2),
    });
  } catch {
    return res.status(502).json({ error: "Failed to fetch gold price" });
  }
}
