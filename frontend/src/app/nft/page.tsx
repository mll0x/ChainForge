"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MintNftForm } from "@/components/MintNftForm";
import { NftGallery } from "@/components/NftGallery";
import { SetBaseURIForm } from "@/components/SetBaseURIForm";

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
        </div>
      </div>
    </div>
  );
}
