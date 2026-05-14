"use client";

import { useAccount } from "wagmi";
import { useTokenBalance } from "@/hooks/useTokenBalance";

export function WalletCard() {
  const { address, isConnected } = useAccount();
  const { data, isLoading, error } = useTokenBalance();

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-muted">请先连接钱包查看余额</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">钱包余额</h2>
        <span className="text-xs text-muted font-mono">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <div className="h-10 bg-border animate-pulse rounded" />
          <div className="h-10 bg-border animate-pulse rounded" />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm">加载失败: {error.message}</p>
      )}

      {data && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-border">
            <p className="text-xs text-muted mb-1">ETH</p>
            <p className="text-xl font-bold text-foreground">{data.ethBalance}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-border">
            <p className="text-xs text-muted mb-1">{data.tokenSymbol}</p>
            <p className="text-xl font-bold text-brand">{data.tokenBalance}</p>
          </div>
        </div>
      )}
    </div>
  );
}
