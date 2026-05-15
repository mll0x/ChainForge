"use client";

import { useState, useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { MYNFT_ADDRESS, MYNFT_ABI } from "@/lib/contracts";
import { isValidEthAddress } from "@/lib/validation";
import { TransactionStatus } from "./TransactionStatus";

interface MintNftFormProps {
  onMintSuccess?: () => void;
}

export function MintNftForm({ onMintSuccess }: MintNftFormProps) {
  const { address } = useAccount();
  const [to, setTo] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [inputError, setInputError] = useState("");
  const prevSuccess = useRef(false);

  const { data: hash, error, writeContract, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && !prevSuccess.current) {
      setTo("");
      setQuantity("1");
      setInputError("");
      onMintSuccess?.();
      prevSuccess.current = true;
    }
    if (!isSuccess) {
      prevSuccess.current = false;
    }
  }, [isSuccess, onMintSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = to || address;
    if (!target) return;
    if (to && !isValidEthAddress(to)) {
      setInputError("无效的以太坊地址");
      return;
    }
    setInputError("");

    const qty = Number(quantity);
    if (qty === 1) {
      writeContract({
        address: MYNFT_ADDRESS,
        abi: MYNFT_ABI,
        functionName: "mint",
        args: [target as `0x${string}`],
      });
    } else {
      writeContract({
        address: MYNFT_ADDRESS,
        abi: MYNFT_ABI,
        functionName: "batchMint",
        args: [target as `0x${string}`, BigInt(qty)],
      });
    }
  };

  const walletError = error
    ? error.message.includes("UserRejected")
      ? "用户拒绝了交易"
      : error.message.includes("OwnableUnauthorizedAccount")
        ? "无权铸造 (仅 Owner)"
        : "交易失败"
    : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        placeholder={`目标地址 (默认: 当前钱包)`}
        value={to}
        onChange={(e) => {
          setTo(e.target.value);
          setInputError("");
        }}
        className="w-full rounded-lg bg-white border border-border px-3 py-2 text-sm placeholder-muted focus:border-brand focus:outline-none"
      />
      <input
        type="number"
        placeholder="铸造数量"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        required
        min="1"
        max="10"
        className="w-full rounded-lg bg-white border border-border px-3 py-2 text-sm placeholder-muted focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand text-white font-semibold py-2 text-sm hover:bg-brand-hover disabled:opacity-50 transition-colors"
      >
        {isPending ? "确认钱包..." : "铸造 NFT"}
      </button>
      {inputError && <p className="text-red-500 text-xs">{inputError}</p>}
      {walletError && <p className="text-red-500 text-xs">{walletError}</p>}
      <TransactionStatus hash={hash} />
    </form>
  );
}
