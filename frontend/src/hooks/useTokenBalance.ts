"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { api, type WalletBalance } from "@/lib/api";

export function useTokenBalance() {
  const { address, isConnected } = useAccount();

  return useQuery<WalletBalance | null>({
    queryKey: ["balance", address],
    queryFn: async () => {
      if (!address) return null;
      const res = await api.getBalance(address);
      if (!res.success) throw new Error(res.error ?? "Unknown error");
      return res.data;
    },
    enabled: isConnected && !!address,
    refetchInterval: 10_000,
  });
}
