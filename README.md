# RemixRights (hackathon MVP)

Verifiable remix family tree + reuse rules + agreed royalty split.

```
remixrights/
  contracts/RemixRegistry.sol   -> paste into Remix IDE (Person 2)
  backend/                      -> Express + TinyFish Search/Fetch (Person 3)
  frontend/                     -> React + Vite + ethers v6 (Person 1)
```

## 1. Deploy the contract (Remix IDE, https://remix.ethereum.org)
1. Create `RemixRegistry.sol`, paste the file, compile with Solidity 0.8.20+.
2. Deploy & Run -> Environment: "Injected Provider - MetaMask" (an EVM testnet with test funds, e.g. Sepolia).
   Remix VM works for a quick local test but its transactions are not public testnet transactions.
3. Copy the deployed contract address.

## 2. Backend
```
cd backend
cp .env.example .env     # put your TinyFish key in TINYFISH_API_KEY
npm install
npm start                # http://localhost:4000
```
Check: http://localhost:4000/api/health should show `tinyfishKeyLoaded: true`.

TinyFish calls (per docs.tinyfish.ai): Search = `GET https://api.search.tinyfish.ai?query=...`,
Fetch = `POST https://api.fetch.tinyfish.ai`, both with the `X-API-Key` header. The key stays in the backend.

## 3. Frontend
```
cd frontend
npm install
npm run dev              # http://localhost:5173 (proxies /api to :4000)
```
Optional `frontend/.env`:
```
VITE_CONTRACT_ADDRESS=0xYourContract
VITE_EXPLORER_TX=https://sepolia.etherscan.io/tx/
```
Or just paste the contract address in the header box. Change `VITE_EXPLORER_TX` if you use another testnet.

## 4. Demo flow
1. Connect MetaMask (test wallet only, never share seed phrase/private key).
2. License Scout -> search, read a source, pick a license name.
3. Register -> original reel (royalty 20% = what the original requires from remixes).
4. Switch MetaMask account (friend) -> Register -> choose parent #1, upload remix.
5. Remix Tree -> see lineage. Verify -> exact-file hash check (try an edited file: no match).
6. Verify -> "Send real testnet payment" on the remix: 20% goes to the original creator, 80% to the remix creator.

## Honest limits (say these in the pitch)
- Records declared authorship with a timestamp; not legal proof of ownership.
- No Instagram integration/detection. Exact SHA-256 only; re-encoding changes the hash.
- Royalties move only if funds are sent through `distributeRevenue`; one level (remix -> direct parent).
- `backend/data.json` holds titles/metadata only; the chain is the source of truth for hash, parent and terms.
