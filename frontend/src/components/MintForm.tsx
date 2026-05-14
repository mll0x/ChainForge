"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { api } from "@/lib/api";

export function MintForm() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = to || address;
    if (!target) return;
    setStatus("pending");
    setErrorMsg("");
    try {
      const res = await api.mintToken(target, Number(amount));
      if (res.success && res.data) {
        setStatus("success");
        setTxHash(res.data.transactionHash);
        setTo("");
        setAmount("");
        queryClient.invalidateQueries({ queryKey: ["balance"] });
      } else {
        setStatus("error");
        setErrorMsg(res.error || "增发失败");
      }
    } catch {
      setStatus("error");
      setErrorMsg("请求失败");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        placeholder={`目标地址 (默认: 当前钱包)`}
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="w-full rounded-lg bg-white border border-border px-3 py-2 text-sm placeholder-muted focus:border-brand focus:outline-none"
      />
      <input
        type="number"
        placeholder="增发数量"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        min="1"
        className="w-full rounded-lg bg-white border border-border px-3 py-2 text-sm placeholder-muted focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "pending"}
        className="w-full rounded-lg bg-brand text-white font-semibold py-2 text-sm hover:bg-brand-hover disabled:opacity-50 transition-colors"
      >
        {status === "pending" ? "处理中..." : "增发 Token"}
      </button>
      {status === "success" && (
        <p className="text-green-600 text-xs">
          增发成功! TX: {txHash.slice(0, 10)}...
        </p>
      )}
      {status === "error" && (
        <p className="text-red-500 text-xs">{errorMsg}</p>
      )}
    </form>
  );
}
