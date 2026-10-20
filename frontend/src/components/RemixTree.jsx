import { useEffect, useState } from "react";
import { api } from "../api.js";
import { EXPLORER_TX } from "../chain.js";

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

function Node({ n, depth, onVerify }) {
  return (
    <li>
      <div className={`node ${depth === 0 ? "root" : ""}`}>
        <h4>
          #{n.id} · {n.title} <span className="pill">{depth === 0 ? "original" : "remix"}</span>
        </h4>
        <div className="note">
          Creator {short(n.creator)} · {n.parentId ? `parent #${n.parentId}` : "no parent"} · license {n.licenseRef}
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          {n.allowRemix ? <span className="pill ok">remix allowed</span> : <span className="pill bad">no remix</span>}
          {n.allowCommercial ? <span className="pill ok">commercial ok</span> : <span className="pill warn">non-commercial</span>}
          <span className="pill">requires {(n.royaltyBps / 100).toFixed(0)}% from its remixes</span>
          {n.txHash && <a className="pill" href={EXPLORER_TX + n.txHash} target="_blank" rel="noreferrer">on-chain tx ↗</a>}
          <button className="btn ghost" style={{ padding: "2px 10px" }} onClick={() => onVerify(n.id)}>Verify</button>
        </div>
        <div className="mono" style={{ marginTop: 6 }}>{n.contentHash}</div>
      </div>
      {n.children?.length > 0 && (
        <ul>
          {n.children.map((c) => (
            <Node key={c.id} n={c} depth={depth + 1} onVerify={onVerify} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function RemixTree({ assets, selectedId, setSelectedId, onVerify }) {
  const [tree, setTree] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setTree(null);
    setErr("");
    if (!selectedId) return;
    api.getTree(selectedId).then(setTree).catch((e) => setErr(e.message));
  }, [selectedId, assets.length]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Remix family tree</h3>
      <label>Pick any asset in a family</label>
      <select value={selectedId || ""} onChange={(e) => setSelectedId(Number(e.target.value) || null)}>
        <option value="">— select —</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>#{a.id} {a.title}</option>
        ))}
      </select>
      {err && <div className="msg err">{err}</div>}
      {tree && (
        <div className="tree" style={{ marginTop: 14 }}>
          <ul>
            <Node n={tree} depth={0} onVerify={onVerify} />
          </ul>
        </div>
      )}
      {!tree && !err && <div className="note">Select an asset to see its lineage.</div>}
    </div>
  );
}
