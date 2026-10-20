import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 4000;
const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;

// Endpoints from the TinyFish docs (docs.tinyfish.ai):
//   Search: GET  https://api.search.tinyfish.ai?query=...   (header X-API-Key)
//   Fetch : POST https://api.fetch.tinyfish.ai {urls:[...], format:"markdown"}
const TF_SEARCH = "https://api.search.tinyfish.ai";
const TF_FETCH = "https://api.fetch.tinyfish.ai";

// ---------- tiny JSON-file "database" (metadata only; chain is source of truth) ----------
const DB_FILE = new URL("./data.json", import.meta.url);
let db = { assets: [] };
try {
  db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
} catch {
  /* first run */
}
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// ---------- assets ----------
// Frontend registers on-chain first (MetaMask), then posts the result here so
// the dashboard can list titles/media names that don't live on-chain.
app.post("/api/assets", (req, res) => {
  const { id, title, creator, parentId, contentHash, licenseRef, royaltyBps,
          allowRemix, allowCommercial, txHash, chainId, fileName } = req.body || {};

  if (!id || !title || !creator || !contentHash || !licenseRef) {
    return res.status(400).json({ error: "id, title, creator, contentHash, licenseRef are required" });
  }
  if (db.assets.some((a) => a.id === Number(id))) {
    return res.status(409).json({ error: "asset id already stored" });
  }
  if (parentId && !db.assets.some((a) => a.id === Number(parentId))) {
    return res.status(400).json({ error: "parent asset not found in metadata store" });
  }

  const asset = {
    id: Number(id),
    title: String(title).slice(0, 120),
    creator,
    parentId: Number(parentId) || 0,
    contentHash,
    licenseRef,
    royaltyBps: Number(royaltyBps) || 0,
    allowRemix: !!allowRemix,
    allowCommercial: !!allowCommercial,
    txHash: txHash || null,
    chainId: chainId || null,
    fileName: fileName || null,
    createdAt: new Date().toISOString(),
  };
  db.assets.push(asset);
  save();
  res.status(201).json(asset);
});

app.get("/api/assets", (_req, res) => res.json(db.assets));

app.get("/api/assets/:id", (req, res) => {
  const a = db.assets.find((x) => x.id === Number(req.params.id));
  if (!a) return res.status(404).json({ error: "not found" });
  res.json(a);
});

// Full family tree containing this asset (walk up to root, then build down).
app.get("/api/assets/:id/tree", (req, res) => {
  let node = db.assets.find((x) => x.id === Number(req.params.id));
  if (!node) return res.status(404).json({ error: "not found" });
  while (node.parentId) {
    const p = db.assets.find((x) => x.id === node.parentId);
    if (!p) break;
    node = p;
  }
  const build = (a) => ({
    ...a,
    children: db.assets.filter((c) => c.parentId === a.id).map(build),
  });
  res.json(build(node));
});

// ---------- TinyFish License Scout ----------
app.post("/api/license-scout", async (req, res) => {
  if (!TINYFISH_API_KEY) {
    return res.status(500).json({ error: "TINYFISH_API_KEY is not set in backend/.env" });
  }
  const query = String(req.body?.query || "").trim();
  if (!query) return res.status(400).json({ error: "query is required" });

  try {
    // 1) Search
    const sUrl = `${TF_SEARCH}?query=${encodeURIComponent(query)}`;
    const sRes = await fetch(sUrl, { headers: { "X-API-Key": TINYFISH_API_KEY } });
    if (!sRes.ok) {
      return res.status(502).json({ error: `TinyFish Search failed (${sRes.status})`, detail: await sRes.text() });
    }
    const sData = await sRes.json();
    const results = (sData.results || []).slice(0, 8).map((r) => ({
      position: r.position,
      title: r.title,
      url: r.url,
      snippet: r.snippet || r.description || "",
      siteName: r.site_name,
    }));

    // 2) Optionally fetch the page the user picked
    let page = null;
    const fetchUrl = req.body?.fetchUrl;
    if (fetchUrl) {
      const fRes = await fetch(TF_FETCH, {
        method: "POST",
        headers: { "X-API-Key": TINYFISH_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [fetchUrl],
          format: "markdown",
          purpose: "Summarise public reuse/licensing terms for a creator registering remixable content",
        }),
        signal: AbortSignal.timeout(150000),
      });
      if (!fRes.ok) {
        return res.status(502).json({ error: `TinyFish Fetch failed (${fRes.status})`, detail: await fRes.text(), results });
      }
      const fData = await fRes.json();
      const first = (fData.results || [])[0];
      if (first) {
        const text = typeof first.text === "string" ? first.text : JSON.stringify(first.text);
        page = {
          url: first.final_url || first.url,
          title: first.title,
          text: text.slice(0, 6000),
          truncated: text.length > 6000,
        };
      } else {
        page = { url: fetchUrl, error: (fData.errors || [])[0]?.error || "no content returned" };
      }
    }

    res.json({ query, results, page });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, tinyfishKeyLoaded: !!TINYFISH_API_KEY }));

app.listen(PORT, () => console.log(`RemixRights backend on http://localhost:${PORT}`));
