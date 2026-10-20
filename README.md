# RemixRights

**Verifiable remix family tree + reuse rules + agreed royalty split, recorded on-chain.**

Creators remix each other's work all the time, but nobody can prove who made the original, what the original creator allows, or who should get paid.

RemixRights fixes that. A creator registers a reel, sets the reuse terms and the royalty they require, and every remix links back to its parent on a public blockchain. Anyone can verify a file against the record, and a remix can pay its parent creator automatically.

---

## Features

-  **Register**: upload a reel. Its SHA-256 hash, title, license terms and royalty are stored on-chain with a timestamp.
-  **Remix Tree**: register a remix by choosing a parent, and see the full lineage (original → remix → remix of a remix).
-  **License Scout**: search the web for a license, read the source page, and pick the right license name. Powered by **TinyFish**.
-  **Verify**: upload a file and check its hash against the chain. An exact copy matches, an edited file does not.
-  **Royalty Split**: send a real testnet payment on a remix. The contract splits it between the remix creator and the original creator.

---

## TinyFish Integration

Choosing a license is the step creators get wrong most often, because license text lives on random web pages. **License Scout** uses TinyFish to find and read those pages, so the choice is based on the real source.

Both TinyFish APIs are used:

- **Search**: `GET https://api.search.tinyfish.ai?query=...`
  Finds license pages (Creative Commons, music and reel reuse terms, etc.).
- **Fetch**: `POST https://api.fetch.tinyfish.ai`
  Opens a chosen result and returns readable text, so the creator can read the terms inside the app.

Both calls send the key in the `X-API-Key` header.

###  The API key never reaches the browser

The React app only talks to our Express backend. The backend calls TinyFish and keeps the key safe in `.env`.

```
Browser (License Scout)
      │  /api/...   (no key here)
      ▼
Express backend :4000
      │  X-API-Key: TINYFISH_API_KEY   (loaded from .env)
      ▼
TinyFish Search / Fetch
```

Simplified example of the pattern:

```js
// Search
const r = await fetch(
  `https://api.search.tinyfish.ai?query=${encodeURIComponent(query)}`,
  { headers: { "X-API-Key": process.env.TINYFISH_API_KEY } }
);

// Fetch a page
const page = await fetch("https://api.fetch.tinyfish.ai", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.TINYFISH_API_KEY,
  },
  body: JSON.stringify({ url }),
});
```

Health check: open `http://localhost:4000/api/health`. It should show `tinyfishKeyLoaded: true`.

---

## How it fits together

```
Creator
  │
  ▼
React + Vite frontend ──(ethers v6)──► MetaMask ──► RemixRegistry.sol (EVM testnet)
  │
  └──(/api proxy)──► Express backend ──► TinyFish Search + Fetch
                          │
                          └──► data.json (titles + metadata only)
```

-  **The chain is the source of truth** for the file hash, parent link and license terms.
-  `backend/data.json` only holds titles and metadata for display.
-  Files are hashed in the browser, so the file itself is never uploaded to the server.

---

## Tech Stack

- **Frontend:** React, Vite, ethers v6
- **Smart contract:** Solidity 0.8.20+, deployed with Remix IDE
- **Backend:** Node.js, Express
- **Web search and reading:** TinyFish Search and Fetch
- **Wallet:** MetaMask on an EVM testnet (Sepolia)

---

## Project Structure

```
remix_rights/
├── contracts/
│   └── RemixRegistry.sol     # registry, remix links, royalty distribution
├── backend/
│   ├── server.js             # Express server + TinyFish proxy
│   ├── .env.example          # copy to .env, add TINYFISH_API_KEY
│   └── package.json
└── frontend/
    ├── index.html
    ├── vite.config.js        # proxies /api to :4000
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── chain.js
        ├── hash.js
        ├── index.css         # purple / pink / blue theme
        └── components/
```

---

## 🚀 Getting Started

### 1. Deploy the contract (Remix IDE)

1. Open https://remix.ethereum.org and create `RemixRegistry.sol`. Paste the file from `contracts/` and compile with Solidity 0.8.20 or newer.
2. In **Deploy & Run**, choose **Injected Provider - MetaMask** and use a testnet with test funds (for example Sepolia).
3. Deploy and copy the contract address.

### 2. Backend

```bash
cd backend
cp .env.example .env     # put your TinyFish key in TINYFISH_API_KEY
npm install
npm start                # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Optional `frontend/.env`:

```
VITE_CONTRACT_ADDRESS=0xYourContract
VITE_EXPLORER_TX=https://sepolia.etherscan.io/tx/
```

You can also paste the contract address into the box in the app header.

> Use a **test wallet only**. Never share a seed phrase or private key, and never commit your `.env` file.

---

## Demo Flow

1. **Connect** MetaMask (test wallet).
2. **License Scout**: search, read a source page, pick a license name.
3. **Register** the original reel with royalty 20% (what the original requires from remixes).
4. Switch MetaMask to a second account (the "friend") and **Register** a remix: choose parent `#1` and upload the file.
5. **Remix Tree**: see the lineage.
6. **Verify**: check an exact file (match), then an edited file (no match).
7. **Verify → "Send real testnet payment"** on the remix: 20% goes to the original creator, 80% to the remix creator.

---

## Honest Limits

- Records **declared authorship with a timestamp**. It is not legal proof of ownership.
- **No Instagram integration or detection.** Matching is by exact SHA-256, so re-encoding a file changes the hash.
- Royalties move **only when funds are sent through `distributeRevenue`**.
- Royalties cover **one level**: a remix pays its direct parent.
- `backend/data.json` holds titles and metadata only. The chain holds the hash, parent and terms.

---

## Roadmap

- Perceptual hashing, so re-encoded or trimmed copies can still be matched
- Royalties that flow up the whole remix chain
- Mainnet or L2 deployment
- Using TinyFish to auto-suggest a license by reading the source page
