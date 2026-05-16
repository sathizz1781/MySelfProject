export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { symbol, exchange = "NS" } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const ticker = `${symbol.trim().toUpperCase()}.${exchange}`;
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
    );
    if (!r.ok) return res.status(502).json({ error: "Yahoo Finance error" });
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return res.status(404).json({ error: "Symbol not found" });
    return res.json({
      symbol:        ticker,
      price:         meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose || meta.previousClose,
      currency:      meta.currency,
      name:          meta.longName || meta.shortName || symbol.toUpperCase(),
      exchange:      meta.exchangeName,
    });
  } catch {
    return res.status(502).json({ error: "Failed to fetch price" });
  }
}
