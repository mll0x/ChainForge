"use client";

import { useReadContracts, useBalance, useAccount } from "wagmi";
import { formatEther } from "viem";
import { MYTOKEN_ADDRESS, MYTOKEN_ABI } from "@/lib/contracts";

export interface TokenBalanceData {
  address: string;
  ethBalance: string;
  tokenBalance: string;
  tokenSymbol: string;
}

export function useTokenBalance() {
  const { address, isConnected } = useAccount();

  const { data: ethData } = useBalance({
    address,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 10_000,
    },
  });

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: MYTOKEN_ADDRESS,
        abi: MYTOKEN_ABI,
        functionName: "balanceOf" as const,
        args: [address!],
      },
      {
        address: MYTOKEN_ADDRESS,
        abi: MYTOKEN_ABI,
        functionName: "symbol" as const,
      },
    ],
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 10_000,
    },
  });

  const tokenBalance =
    data?.[0]?.result != null ? formatEther(data[0].result as bigint) : "0";
  const tokenSymbol = (data?.[1]?.result as string) ?? "CFT";

  return {
    data: address
      ? {
          address,
          ethBalance: ethData ? formatEther(ethData.value) : "0",
          tokenBalance,
          tokenSymbol,
        }
      : null,
    isLoading,
    error,
    refetch,
  };
}
