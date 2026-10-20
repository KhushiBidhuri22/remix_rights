import { useEffect, useState } from "react";
import { formatEther, parseEther } from "ethers";
import { sha256File } from "../hash.js";
import { getContract, connectWallet, EXPLORER_TX } from "../chain.js";

export default function Verify({ wallet, assets, selectedId, setSelectedId }) {
  const [onchain, setOnchain] = useState(null);
  const [result, setResult] = useState(null); // {match, hash}
  const [err, setErr] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [txMsg, setTxMsg] = useState(null);
  const [balance, setBalance] = useState(null);
  const [busy, setBusy] = useState(false);

  const meta = assets.find((a) => a.id === selectedId);

  async function readOnly() {
    // read-only calls work with the wallet's provider
    const w = wallet || (await connectWallet());
    return { w, contract: getContract(w.provider) };
  }

  useEffect(() => {
    setOnchain(null);
    setResult(null);
    setErr("");
    setTxMsg(null);
    if (!selectedId || !wallet) return;
    (async () => {
      try {
        const { contract } = await readOnly();
        setOnchain(await contract.getAsset(selectedId));
        setBalance(await contract.balances(wallet.address));
      } catch (e) {
        setErr(e.shortMessage || e.message);
      }
    })();
    // eslint-disable-next-line
  }, [selectedId, wallet]);

  async function checkFile(file) {
    if (!file) return;
    setErr("");
    try {
      const hash = await sha256File(file);
      const { contract } = await readOnly();
      const match = await contract.verifyAsset(selectedId, hash);
      setResult({ match, hash });
    } catch (e) {
      setErr(e.shortMessage || e.message);
    }
  }

  async function sendRevenue() {
    setBusy(true);
    setErr("");
    setTxMsg(null);
    try {
      const contract = getContract(wallet.signer);
      const tx = await contract.distributeRevenue(selectedId, { value: parseEther(amount) });
      await tx.wait();
      setTxMsg(tx.hash);
      setBalance(await contract.balances(wallet.address));
    } catch (e) {
      setErr(e.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    setBusy(true);
    setErr("");
    try {
      const contract = getContract(wallet.signer);
      const tx = await contract.withdraw();
      await tx.wait();
      setBalance(await contract.balances(wallet.address));
    } catch (e) {
      setErr(e.shortMessage || e.message);
    } finally {
      setBusy(false);
    }
  }

  // Simulation uses the same maths as the contract.
  const parentBps = onchain ? Number(onchain.parentShareBps) : 0;
  const hasParent = onchain && Number(onchain.parentId) !== 0;
  const total = Number(amount) || 0;
  const toParent = hasParent ? (total * parentBps) / 10000 : 0;
  const toCreator = total - toParent;

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Verify &amp; Royalties</h3>
      <label>Asset</label>
      <select value={selectedId || ""} onChange={(e) => setSelectedId(Number(e.target.value) || null)}>
        <option value="">— select —</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>#{a.id} {a.title}</option>
        ))}
      </select>

      {!wallet && <div className="msg info">Connect your wallet (testnet) to read on-chain records.</div>}
      {err && <div className="msg err">{err}</div>}

      {onchain && (
        <>
          <h4>On-chain record</h4>
          <div className="mono">creator: {onchain.creator}</div>
          <div className="mono">contentHash: {onchain.contentHash}</div>
          <div className="mono">parentId: {onchain.parentId.toString()} · license: {onchain.licenseRef}</div>
          <div className="mono">registered: {new Date(Number(onchain.registeredAt) * 1000).toLocaleString()}</div>
          {meta?.txHash && (
            <div style={{ marginTop: 6 }}>
              <a href={EXPLORER_TX + meta.txHash} target="_blank" rel="noreferrer">Open registration transaction ↗</a>
              <span className="note"> (valid for public testnets; a local chain has no explorer)</span>
            </div>
          )}

          <h4>Exact-file check</h4>
          <input type="file" onChange={(e) => checkFile(e.target.files[0])} />
          {result && (
            <div className={`msg ${result.match ? "ok" : "err"}`}>
              {result.match ? "Match: this file's bytes equal the registered content hash." : "No match: this file differs from the registered bytes (any edit, re-encode or compression changes the hash)."}
              <div className="mono">{result.hash}</div>
            </div>
          )}
          <div className="note">An exact-hash check proves identical bytes only. It does not detect copying of re-encoded or edited content.</div>

          <h4>Agreed royalty split</h4>
          <label>Revenue amount (testnet ETH)</label>
          <input type="number" step="0.0001" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <div className="split-bar">
            {hasParent && toParent > 0 && <div style={{ width: `${parentBps / 100}%`, background: "var(--accent)" }}>Parent {(parentBps / 100).toFixed(0)}%</div>}
            <div style={{ flex: 1, background: "var(--accent2)" }}>{hasParent ? "Remix creator" : "Creator"} {(100 - (hasParent ? parentBps / 100 : 0)).toFixed(0)}%</div>
          </div>
          <div className="note">
            SIMULATION: {hasParent ? `${toParent.toFixed(6)} → parent creator, ` : ""}{toCreator.toFixed(6)} → asset creator. Recorded terms only.
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={sendRevenue} disabled={busy || !wallet}>Send real testnet payment via contract</button>
            <button className="btn ghost" onClick={withdraw} disabled={busy || !balance || balance === 0n}>
              Withdraw my balance {balance != null ? `(${formatEther(balance)} ETH)` : ""}
            </button>
          </div>
          {txMsg && (
            <div className="msg ok">
              Payment split on-chain. <a href={EXPLORER_TX + txMsg} target="_blank" rel="noreferrer">View transaction</a>
            </div>
          )}
          <div className="note">Only test funds. The contract splits funds you send to it; it cannot pull revenue from Instagram or any platform.</div>
        </>
      )}
    </div>
  );
}
