"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { MYNFT_ADDRESS, MYNFT_ABI } from "@/lib/contracts";

export interface NftInfo {
  tokenId: number;
  owner: string;
  tokenURI: string;
}

export function useTotalMinted() {
  return useReadContract({
    address: MYNFT_ADDRESS,
    abi: MYNFT_ABI,
    functionName: "totalMinted",
    query: {
      refetchInterval: 10_000,
    },
  });
}

export function useNftList(tokenIds: number[]) {
  const ownerContracts = tokenIds.map((id) => ({
    address: MYNFT_ADDRESS,
    abi: MYNFT_ABI,
    functionName: "ownerOf" as const,
    args: [BigInt(id)] as [bigint],
  }));

  const uriContracts = tokenIds.map((id) => ({
    address: MYNFT_ADDRESS,
    abi: MYNFT_ABI,
    functionName: "tokenURI" as const,
    args: [BigInt(id)] as [bigint],
  }));

  const { data: ownerData, isLoading: ownerLoading } = useReadContracts({
    contracts: ownerContracts,
    query: { enabled: tokenIds.length > 0 },
  });

  const { data: uriData, isLoading: uriLoading } = useReadContracts({
    contracts: uriContracts,
    query: { enabled: tokenIds.length > 0 },
  });

  const nfts: NftInfo[] = [];
  if (ownerData && uriData) {
    for (let i = 0; i < tokenIds.length; i++) {
      const owner = ownerData[i]?.result as string | undefined;
      const tokenURI = uriData[i]?.result as string | undefined;
      if (owner) {
        nfts.push({
          tokenId: tokenIds[i],
          owner,
          tokenURI: tokenURI ?? "",
        });
      }
    }
  }

  return {
    data: nfts.length > 0 ? nfts : undefined,
    isLoading: ownerLoading || uriLoading,
  };
}
