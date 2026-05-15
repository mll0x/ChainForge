"use client";

import { useState } from "react";
import type { NftInfo } from "@/hooks/useNftList";

interface NftCardProps {
  nft: NftInfo;
}

interface NftMetadata {
  name: string;
  description: string;
  image: string;
}

export function NftCard({ nft }: NftCardProps) {
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);
  const [imgError, setImgError] = useState(false);

  const loadMetadata = async () => {
    if (metadata || !nft.tokenURI) return;
    try {
      const res = await fetch(nft.tokenURI);
      if (res.ok) {
        const data = await res.json();
        setMetadata(data);
      }
    } catch {
      // tokenURI not accessible, keep placeholder
    }
  };

  const imageSrc = metadata?.image && !imgError ? metadata.image : null;

  return (
    <div
      className="rounded-xl border border-border bg-surface overflow-hidden group hover:border-brand/50 hover:shadow-md transition-all"
      onMouseEnter={loadMetadata}
    >
      <div className="aspect-square bg-white flex items-center justify-center relative overflow-hidden">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={`NFT #${nft.tokenId}`}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-amber-100/30 group-hover:from-brand/15 group-hover:to-amber-200/40 transition-all" />
            <span className="text-4xl font-bold text-border group-hover:text-muted transition-colors">
              #{nft.tokenId}
            </span>
          </>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {metadata?.name ?? `NFT #${nft.tokenId}`}
        </p>
        <p className="text-xs text-muted font-mono truncate">
          {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
        </p>
      </div>
    </div>
  );
}
