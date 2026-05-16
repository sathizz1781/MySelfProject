export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "code required" });

  try {
    const r = await fetch(`https://api.mfapi.in/mf/${code}`, {
      headers: { "Accept": "application/json" },
    });
    if (!r.ok) return res.status(502).json({ error: "mfapi error" });
    const data = await r.json();
    const latest = data.data?.[0];
    if (!latest) return res.status(404).json({ error: "No NAV data" });
    return res.json({
      nav:        parseFloat(latest.nav),
      date:       latest.date,
      schemeName: data.meta?.scheme_name || "",
      fundHouse:  data.meta?.fund_house || "",
    });
  } catch {
    return res.status(502).json({ error: "Failed to fetch NAV" });
  }
}
