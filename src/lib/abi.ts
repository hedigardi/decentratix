// Public contract address can be swapped per deployment environment.
export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined) ||
  "0x0000000000000000000000000000000000000000";

// ABI only contains methods required by the frontend demo flows.
export const DECENTRATIX_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tickets",
    outputs: [
      { internalType: "uint256", name: "facePrice", type: "uint256" },
      { internalType: "bool", name: "isScanned", type: "bool" },
      { internalType: "bool", name: "listed", type: "bool" },
      { internalType: "uint256", name: "askPrice", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "scanAndLockTicket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
