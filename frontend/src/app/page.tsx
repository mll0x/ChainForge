import { WalletCard } from "@/components/WalletCard";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-brand">Chain</span>Forge
        </h1>
        <p className="text-muted">
          链上锻造 — ERC-20 Token + ERC-721 NFT
        </p>
      </div>

      <WalletCard />

      <div className="grid md:grid-cols-2 gap-4">
        <a
          href="/token"
          className="rounded-xl border border-border bg-surface p-6 hover:border-brand/50 hover:shadow-md transition-all group"
        >
          <h2 className="text-lg font-semibold group-hover:text-brand transition-colors">
            Token 操作
          </h2>
          <p className="text-sm text-muted mt-1">转账、授权、增发 CFT</p>
        </a>
        <a
          href="/nft"
          className="rounded-xl border border-border bg-surface p-6 hover:border-brand/50 hover:shadow-md transition-all group"
        >
          <h2 className="text-lg font-semibold group-hover:text-brand transition-colors">
            NFT 铸造
          </h2>
          <p className="text-sm text-muted mt-1">铸造和展示 ERC-721 NFT</p>
        </a>
      </div>
    </div>
  );
}
