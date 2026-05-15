"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MintNftForm } from "@/components/MintNftForm";
import { NftGallery } from "@/components/NftGallery";
import { SetBaseURIForm } from "@/components/SetBaseURIForm";
import { MYNFT_ADDRESS } from "@/lib/contracts";

export default function NftPage() {
  const queryClient = useQueryClient();

  const handleMintSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
  }, [queryClient]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">NFT 铸造与展示</h1>

      <div className="grid md:grid-cols-[320px_1fr] gap-6">
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3 self-start">
          <h2 className="text-sm font-semibold text-brand uppercase tracking-wider">
            铸造 NFT
          </h2>
          <MintNftForm onMintSuccess={handleMintSuccess} />
          <SetBaseURIForm />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            NFT 收藏
          </h2>
          <NftGallery />

          <div className="rounded-lg border border-border bg-surface/50 p-4 text-xs text-muted space-y-2">
            <p className="font-semibold text-foreground text-sm">在 MetaMask 中查看 NFT</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>打开 MetaMask → NFTs 标签页</li>
              <li>点击「Import NFTs」</li>
              <li>输入合约地址: <code className="bg-white px-1 py-0.5 rounded text-foreground font-mono">{MYNFT_ADDRESS}</code></li>
              <li>输入 Token ID (如 0, 1, 2...)</li>
              <li>点击 Import</li>
            </ol>
            <p className="text-muted/70">提示: 需先设置 BaseURI 指向 <code className="bg-white px-1 py-0.5 rounded">http://localhost:3000/api/nft/</code>，MetaMask 才能读取元数据</p>
          </div>
        </div>
      </div>
    </div>
  );
}
