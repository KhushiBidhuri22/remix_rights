import { BrowserProvider, Contract } from "ethers";

export const ABI = [
  "function registerOriginal(bytes32 contentHash, string licenseRef, bool allowRemix, bool allowCommercial, uint16 royaltyBps) returns (uint256)",
  "function registerRemix(uint256 parentId, bytes32 contentHash, string licenseRef, bool allowRemix, bool allowCommercial, uint16 royaltyBps) returns (uint256)",
  "function getAsset(uint256 id) view returns (tuple(address creator, bytes32 contentHash, uint256 parentId, string licenseRef, uint16 royaltyBps, uint16 parentShareBps, bool allowRemix, bool allowCommercial, uint64 registeredAt, bool exists))",
  "function verifyAsset(uint256 id, bytes32 contentHash) view returns (bool)",
  "function distributeRevenue(uint256 id) payable",
  "function withdraw()",
  "function balances(address) view returns (uint256)",
  "event AssetRegistered(uint256 indexed id, address indexed creator, uint256 indexed parentId, bytes32 contentHash, string licenseRef)",
];

export const EXPLORER_TX =
  import.meta.env.VITE_EXPLORER_TX || "https://sepolia.etherscan.io/tx/";

export function getContractAddress() {
  return localStorage.getItem("rr_contract") || import.meta.env.VITE_CONTRACT_ADDRESS || "";
}
export function setContractAddress(a) {
  localStorage.setItem("rr_contract", a.trim());
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask not found. Install it and use a TEST wallet only.");
  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  return { provider, signer, address: await signer.getAddress(), chainId: Number(network.chainId) };
}

export function getContract(signerOrProvider) {
  const addr = getContractAddress();
  if (!addr) throw new Error("Paste the deployed contract address in the header first.");
  return new Contract(addr, ABI, signerOrProvider);
}

export function parseRegisteredId(contract, receipt) {
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "AssetRegistered") return Number(parsed.args.id);
    } catch {
      /* not our event */
    }
  }
  throw new Error("AssetRegistered event not found in receipt");
}
