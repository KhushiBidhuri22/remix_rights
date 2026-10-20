import { useState } from "react";
import { sha256File } from "../hash.js";
import { getContract, parseRegisteredId, EXPLORER_TX } from "../chain.js";
import { api } from "../api.js";

export default function RegisterAsset({ wallet, assets, onDone }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [hash, setHash] = useState("");
  const [parentId, setParentId] = useState("");
  const [licenseRef, setLicenseRef] = useState("CC-BY-NC-4.0");
  const [allowRemix, setAllowRemix] = useState(true);
  const [allowCommercial, setAllowCommercial] = useState(false);
  const [royaltyPct, setRoyaltyPct] = useState(20);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(null);

  const parent = assets.find((a) => a.id === Number(parentId));

  async function onFile(f) {
    setFile(f);
    setHash(f ? await sha256File(f) : "");
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk(null);
    if (!wallet) return setErr("Connect your wallet first.");
    if (!file || !hash) return setErr("Choose the video/image file to register.");
    if (!title.trim()) return setErr("Add a title.");
    if (parent && !parent.allowRemix) return setErr("The parent asset's license does not allow remixes.");

    setBusy(true);
    try {
      const contract = getContract(wallet.signer);
      const bps = Math.round(Number(royaltyPct) * 100);
      const tx = parent
        ? await contract.registerRemix(parent.id, hash, licenseRef, allowRemix, allowCommercial, bps)
        : await contract.registerOriginal(hash, licenseRef, allowRemix, allowCommercial, bps);
      const receipt = await tx.wait();
      const id = parseRegisteredId(contract, receipt);

      await api.saveAsset({
        id, title, creator: wallet.address, parentId: parent?.id || 0, contentHash: hash,
        licenseRef, royaltyBps: bps, allowRemix, allowCommercial,
        txHash: tx.hash, chainId: wallet.chainId, fileName: file.name,
      });
      setOk({ id, txHash: tx.hash });
      onDone && setTimeout(() => onDone(id), 1200);
    } catch (e) {
      setErr(e.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3 style={{ marginTop: 0 }}>{parent ? `Register a remix of #${parent.id}` : "Register original content"}</h3>

      <div className="grid2">
        <div>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My funny transition reel" />
        </div>
        <div>
          <label>Parent asset (leave empty for an original)</label>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— none (original) —</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>#{a.id} {a.title}{a.allowRemix ? "" : " (remix not allowed)"}</option>
            ))}
          </select>
        </div>
      </div>

      <label>File (stays on your device; only its SHA-256 fingerprint goes on-chain)</label>
      <input type="file" accept="video/*,image/*,audio/*" onChange={(e) => onFile(e.target.files[0])} />
      {hash && <div className="mono" style={{ marginTop: 6 }}>SHA-256: {hash}</div>}

      <div className="grid2">
        <div>
          <label>License reference (use License Scout to find one)</label>
          <input value={licenseRef} onChange={(e) => setLicenseRef(e.target.value)} />
        </div>
        <div>
          <label>Share of remix revenue YOUR work requires from its own remixes (%)</label>
          <input type="number" min="0" max="100" value={royaltyPct} onChange={(e) => setRoyaltyPct(e.target.value)} />
        </div>
      </div>

      <div className="row">
        <label className="check"><input type="checkbox" checked={allowRemix} onChange={(e) => setAllowRemix(e.target.checked)} />Allow remixes of this work</label>
        <label className="check"><input type="checkbox" checked={allowCommercial} onChange={(e) => setAllowCommercial(e.target.checked)} />Allow commercial use</label>
      </div>

      {parent && (
        <div className="msg info">
          Agreed terms inherited from #{parent.id}: parent creator receives {(parent.royaltyBps / 100).toFixed(0)}% of
          revenue distributed for this remix; you receive {(100 - parent.royaltyBps / 100).toFixed(0)}%. These are
          recorded terms — money only moves if revenue is sent through the contract.
        </div>
      )}

      {err && <div className="msg err">{err}</div>}
      {ok && (
        <div className="msg ok">
          Registered as asset #{ok.id}. <a href={EXPLORER_TX + ok.txHash} target="_blank" rel="noreferrer">View transaction</a>
        </div>
      )}

      <button className="btn" disabled={busy}>{busy ? "Waiting for wallet / chain…" : "Register"}</button>
      <div className="note">Declared authorship is recorded with a timestamp. This is not a legal proof of copyright ownership.</div>
    </form>
  );
}
