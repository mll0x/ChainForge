import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { localhost, sepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "ChainForge",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID",
  chains: [localhost, sepolia],
  transports: {
    [localhost.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(),
  },
});
