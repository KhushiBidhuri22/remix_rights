import { useState } from "react";
import { api } from "../api.js";

export default function LicenseScout() {
  const [query, setQuery] = useState("Creative Commons license terms for remixing video commercial use");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function search() {
    setBusy(true);
    setErr("");
    setPage(null);
    try {
      const data = await api.licenseScout(query);
      setResults(data.results);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function open(url) {
    setBusy(true);
    setErr("");
    try {
      const data = await api.licenseScout(query, url);
      setPage(data.page);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>License Scout <span className="pill">live web via TinyFish</span></h3>
      <div className="row">
        <input style={{ flex: 1 }} value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn" onClick={search} disabled={busy}>{busy ? "Working…" : "Explore licensing rules"}</button>
      </div>
      {err && <div className="msg err">{err}</div>}

      {results.map((r) => (
        <div key={r.url} className="node">
          <h4>{r.title}</h4>
          <div className="note">{r.snippet}</div>
          <div className="row" style={{ marginTop: 6 }}>
            <a href={r.url} target="_blank" rel="noreferrer" className="mono">{r.url}</a>
            <button className="btn ghost" style={{ padding: "2px 10px" }} onClick={() => open(r.url)} disabled={busy}>Read this source</button>
          </div>
        </div>
      ))}

      {page && (
        <div className="card" style={{ background: "#12132a" }}>
          <h4 style={{ marginTop: 0 }}>{page.title || "Fetched page"}</h4>
          {page.error ? (
            <div className="msg err">Could not fetch: {page.error}</div>
          ) : (
            <>
              <div className="mono">Source: {page.url}</div>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, maxHeight: 360, overflow: "auto" }}>{page.text}</pre>
              {page.truncated && <div className="note">Showing the first part of the page only.</div>}
            </>
          )}
          <div className="msg info">
            Read the source yourself and copy the license name (e.g. CC-BY-NC-4.0) into the Register form. A license
            found online is not a legal determination, and it does not prove the person offering it owns the work.
          </div>
        </div>
      )}
    </div>
  );
}
