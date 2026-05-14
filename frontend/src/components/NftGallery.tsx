"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useNftList } from "@/hooks/useNftList";
import { NftCard } from "./NftCard";

export function NftGallery() {
  const { address, isConnected } = useAccount();
  const [tokenIds, setTokenIds] = useState<number[]>([]);
  const [maxID, setMaxID] = useState(0);
  const { data: nfts, isLoading } = useNftList(tokenIds);

  const loadMore = () => {
    const nextBatch = Array.from(
      { length: 6 },
      (_, i) => maxID + i
    );
    setTokenIds((prev) => [...prev, ...nextBatch]);
    setMaxID((prev) => prev + 6);
  };

  useEffect(() => {
    if (isConnected) {
      loadMore();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-muted">请先连接钱包查看 NFT</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {nfts?.map((nft) => (
          <NftCard key={nft.tokenId} nft={nft} />
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface aspect-square animate-pulse"
            />
          ))}
        </div>
      )}

      <button
        onClick={loadMore}
        className="w-full rounded-lg border border-border text-muted py-2 text-sm hover:bg-surface hover:text-foreground transition-colors"
      >
        加载更多
      </button>

      {nfts?.length === 0 && (
        <p className="text-center text-muted py-8">
          还没有 NFT，去铸造一个吧!
        </p>
      )}
    </div>
  );
}
