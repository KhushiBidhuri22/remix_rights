import { useEffect, useState, useCallback } from "react";
import { connectWallet, getContractAddress, setContractAddress } from "./chain.js";
import { api } from "./api.js";
import Dashboard from "./components/Dashboard.jsx";
import RegisterAsset from "./components/RegisterAsset.jsx";
import RemixTree from "./components/RemixTree.jsx";
import LicenseScout from "./components/LicenseScout.jsx";
import Verify from "./components/Verify.jsx";

const TABS = [
  ["dashboard", "Dashboard"],
  ["register", "Register"],
  ["tree", "Remix Tree"],
  ["scout", "License Scout"],
  ["verify", "Verify & Royalties"],
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [wallet, setWallet] = useState(null);
  const [walletErr, setWalletErr] = useState("");
  const [contractAddr, setAddr] = useState(getContractAddress());
  const [assets, setAssets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setAssets(await api.listAssets());
    } catch {
      /* backend may not be up yet */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function connect() {
    setWalletErr("");
    try {
      setWallet(await connectWallet());
    } catch (e) {
      setWalletErr(e.message);
    }
  }

  function openAsset(id, where) {
    setSelectedId(id);
    setTab(where);
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <div className="logo">RemixRights</div>
          <div className="tag">Verifiable family tree + reuse rules for remixable content</div>
        </div>
        <div className="row">
          <input
            style={{ width: 300 }}
            placeholder="Deployed contract address (0x...)"
            value={contractAddr}
            onChange={(e) => {
              setAddr(e.target.value);
              setContractAddress(e.target.value);
            }}
          />
          <button className="btn" onClick={connect}>
            {wallet ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)} (chain ${wallet.chainId})` : "Connect wallet"}
          </button>
        </div>
      </header>
      {walletErr && <div className="msg err">{walletErr}</div>}

      <nav>
        {TABS.map(([k, label]) => (
          <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "dashboard" && <Dashboard assets={assets} wallet={wallet} onOpen={openAsset} onRegister={() => setTab("register")} />}
      {tab === "register" && <RegisterAsset wallet={wallet} assets={assets} onDone={(id) => { refresh(); openAsset(id, "tree"); }} />}
      {tab === "tree" && <RemixTree assets={assets} selectedId={selectedId} setSelectedId={setSelectedId} onVerify={(id) => openAsset(id, "verify")} />}
      {tab === "scout" && <LicenseScout />}
      {tab === "verify" && <Verify wallet={wallet} assets={assets} selectedId={selectedId} setSelectedId={setSelectedId} />}

      <p className="note">
        Honest scope: this records declared authorship, permissions and agreed royalty terms with a tamper-evident
        timestamp. It does not prove legal copyright ownership, and it does not collect revenue from Instagram or any
        other platform.
      </p>
    </div>
  );
}
