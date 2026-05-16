export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json({ results: [] });

  try {
    const r = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q.trim())}`, {
      headers: { "Accept": "application/json" },
    });
    if (!r.ok) return res.json({ results: [] });
    const data = await r.json();
    // API returns array of { schemeCode, schemeName }
    const results = (Array.isArray(data) ? data : []).slice(0, 10).map(f => ({
      schemeCode: String(f.schemeCode),
      schemeName: f.schemeName,
    }));
    return res.json({ results });
  } catch {
    return res.json({ results: [] });
  }
}
