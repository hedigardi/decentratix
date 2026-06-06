import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Default RPC keeps local development working even without env overrides.
const rpcUrl =
  process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://sepolia.base.org";

export const wagmiConfig = createConfig({
  // Demo is intentionally scoped to Base Sepolia.
  chains: [baseSepolia],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(rpcUrl),
  },
});
