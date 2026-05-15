"use client";

import { useState, useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { MYTOKEN_ADDRESS, MYTOKEN_ABI } from "@/lib/contracts";
import { isValidEthAddress } from "@/lib/validation";
import { TransactionStatus } from "./TransactionStatus";

export function ApproveForm() {
  const [spender, setSpender] = useState("");
  const [amount, setAmount] = useState("");
  const [inputError, setInputError] = useState("");
  const prevSuccess = useRef(false);

  const { data: hash, error, writeContract, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && !prevSuccess.current) {
      setSpender("");
      setAmount("");
      setInputError("");
      prevSuccess.current = true;
    }
    if (!isSuccess) {
      prevSuccess.current = false;
    }
  }, [isSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEthAddress(spender)) {
      setInputError("无效的以太坊地址");
      return;
    }
    setInputError("");
    writeContract({
      address: MYTOKEN_ADDRESS,
      abi: MYTOKEN_ABI,
      functionName: "approve",
      args: [spender as `0x${string}`, parseEther(amount)],
    });
  };

  const walletError = error
    ? error.message.includes("UserRejected")
      ? "用户拒绝了交易"
      : "交易失败"
    : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        placeholder="被授权地址 0x..."
        value={spender}
        onChange={(e) => {
          setSpender(e.target.value);
          setInputError("");
        }}
        required
        className="w-full rounded-lg bg-white border border-border px-3 py-2 text-sm placeholder-muted focus:border-brand focus:outline-none"
      />
      <input
        type="number"
        placeholder="授权额度"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        min="0"
        step="any"
        className="w-full rounded-lg bg-white border border-border px-3 py-2 text-sm placeholder-muted focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-foreground text-white font-semibold py-2 text-sm hover:bg-foreground/80 disabled:opacity-50 transition-colors"
      >
        {isPending ? "确认钱包..." : "授权"}
      </button>
      {inputError && <p className="text-red-500 text-xs">{inputError}</p>}
      {walletError && <p className="text-red-500 text-xs">{walletError}</p>}
      <TransactionStatus hash={hash} />
    </form>
  );
}
