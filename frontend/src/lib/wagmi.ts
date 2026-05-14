import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { defineChain } from "viem";
import { sepolia } from "wagmi/chains";

export const hardhatLocal = defineChain({
  id: 31_337,
  name: "Localhost 8545",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

export const config = getDefaultConfig({
  appName: "ChainForge",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID",
  chains: [hardhatLocal, sepolia],
  transports: {
    [hardhatLocal.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(),
  },
});
