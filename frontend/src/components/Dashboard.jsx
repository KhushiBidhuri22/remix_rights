const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export default function Dashboard({ assets, wallet, onOpen, onRegister }) {
  const me = wallet?.address?.toLowerCase();
  const mine = assets.filter((a) => a.creator.toLowerCase() === me);
  const originals = mine.filter((a) => !a.parentId);
  const remixes = mine.filter((a) => a.parentId);
  const incoming = assets.filter((a) => a.parentId && assets.find((p) => p.id === a.parentId)?.creator.toLowerCase() === me && a.creator.toLowerCase() !== me);

  const List = ({ items, empty }) =>
    items.length === 0 ? (
      <div className="note">{empty}</div>
    ) : (
      items.map((a) => (
        <div key={a.id} className="card asset-item" onClick={() => onOpen(a.id, "tree")}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong>#{a.id} · {a.title}</strong>
            <span className="row">
              {a.allowRemix ? <span className="pill ok">remix allowed</span> : <span className="pill bad">no remix</span>}
              {a.allowCommercial ? <span className="pill ok">commercial ok</span> : <span className="pill warn">non-commercial</span>}
            </span>
          </div>
          <div className="note">
            {a.parentId ? `Remix of #${a.parentId} · ` : "Original · "}
            {a.licenseRef} · creator {short(a.creator)} · requires {(a.royaltyBps / 100).toFixed(0)}% from its remixes
          </div>
        </div>
      ))
    );

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>Creator Dashboard</h3>
        <button className="btn" onClick={onRegister}>+ Register new content</button>
      </div>
      {!wallet && <div className="msg info">Connect your wallet to see your own assets. All registered assets are shown below.</div>}

      {wallet && (
        <>
          <h4>My originals</h4>
          <List items={originals} empty="No originals yet." />
          <h4>My remixes</h4>
          <List items={remixes} empty="No remixes yet." />
          <h4>Remixes of my work by others</h4>
          <List items={incoming} empty="Nobody has registered a remix of your work yet." />
        </>
      )}

      <h4>All registered assets</h4>
      <List items={assets} empty="Nothing registered yet. Register your first original!" />
      <div className="note">Royalties earned / pending are shown on the Verify &amp; Royalties tab (on-chain withdrawable balance).</div>
    </div>
  );
}
