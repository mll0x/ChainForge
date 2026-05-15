"use client";

import { useAccount } from "wagmi";
import { useTotalMinted, useNftList } from "@/hooks/useNftList";
import { NftCard } from "./NftCard";

export function NftGallery() {
  const { isConnected } = useAccount();

  const { data: totalMinted } = useTotalMinted();

  const tokenIds = totalMinted != null
    ? Array.from({ length: Number(totalMinted) }, (_, i) => i)
    : [];

  const { data: nfts, isLoading } = useNftList(isConnected ? tokenIds : []);

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-muted">请先连接钱包查看 NFT</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {nfts && nfts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {nfts.map((nft) => (
            <NftCard key={nft.tokenId} nft={nft} />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface aspect-square animate-pulse"
            />
          ))}
        </div>
      )}

      {nfts?.length === 0 && !isLoading && (
        <p className="text-center text-muted py-8">
          还没有 NFT，去铸造一个吧!
        </p>
      )}
    </div>
  );
}
