"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { MYNFT_ADDRESS, MYNFT_ABI } from "@/lib/contracts";
import { TransactionStatus } from "./TransactionStatus";

export function SetBaseURIForm() {
  const [uri, setUri] = useState("");
  const [show, setShow] = useState(false);

  const { data: hash, error, writeContract, isPending } = useWriteContract();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    writeContract({
      address: MYNFT_ADDRESS,
      abi: MYNFT_ABI,
      functionName: "setBaseURI",
      args: [uri],
    });
  };

  const walletError = error
    ? error.message.includes("UserRejected")
      ? "用户拒绝了交易"
      : error.message.includes("OwnableUnauthorizedAccount")
        ? "无权设置 (仅 Owner)"
        : "交易失败"
    : "";

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShow(!show)}
        className="text-xs text-muted hover:text-brand transition-colors"
      >
        {show ? "收起" : "设置元数据 URI (Owner)"}
      </button>

      {show && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="如 http://localhost:3000/api/nft/"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            required
            className="w-full rounded-lg bg-white border border-border px-3 py-2 text-sm placeholder-muted focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-foreground text-white font-semibold py-2 text-sm hover:bg-foreground/80 disabled:opacity-50 transition-colors"
          >
            {isPending ? "确认钱包..." : "设置 BaseURI"}
          </button>
          {walletError && <p className="text-red-500 text-xs">{walletError}</p>}
          <TransactionStatus hash={hash} />
        </form>
      )}
    </div>
  );
}
