import type { NftInfo } from "@/lib/api";

interface NftCardProps {
  nft: NftInfo;
}

export function NftCard({ nft }: NftCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden group hover:border-brand/50 hover:shadow-md transition-all">
      <div className="aspect-square bg-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-amber-100/30 group-hover:from-brand/15 group-hover:to-amber-200/40 transition-all" />
        <span className="text-4xl font-bold text-border group-hover:text-muted transition-colors">
          #{nft.tokenId}
        </span>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold text-foreground">NFT #{nft.tokenId}</p>
        <p className="text-xs text-muted font-mono truncate">
          {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
        </p>
      </div>
    </div>
  );
}
