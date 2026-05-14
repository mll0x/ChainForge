"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type NftInfo } from "@/lib/api";

export function useNftList(tokenIds: number[]) {
  return useQuery<NftInfo[]>({
    queryKey: ["nftList", tokenIds],
    queryFn: async () => {
      const results = await Promise.all(
        tokenIds.map((id) => api.getNftInfo(id))
      );
      return results
        .filter((r) => r.success && r.data)
        .map((r) => r.data!);
    },
    enabled: tokenIds.length > 0,
  });
}
