"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useReadContracts } from "wagmi";
import { parseEther, formatEther, maxUint256 } from "viem";
import { ROUTER_ADDRESS, ROUTER_ABI, MYTOKEN_ADDRESS, MYTOKEN_ABI, getDeadline } from "@/lib/contracts";
import { TransactionStatus } from "@/components/TransactionStatus";

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function TxButton({ isPending, disabled, children }: { isPending: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={isPending || disabled}
      className="w-full rounded-lg bg-brand text-white font-semibold py-2.5 text-sm hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isPending ? "确认钱包..." : children}
    </button>
  );
}

export default function RouterPage() {
  const { isConnected, address } = useAccount();
  const [amountIn, setAmountIn] = useState("");
  const [path, setPath] = useState<`0x${string}`[]>([MYTOKEN_ADDRESS]);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const prevSuccess = useRef(false);

  const { writeContract, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && !prevSuccess.current) {
      setAmountIn("");
      prevSuccess.current = true;
    }
    if (!isSuccess) prevSuccess.current = false;
  }, [isSuccess]);

  const { data: poolCount } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: ROUTER_ABI,
    functionName: "poolCount",
    query: { enabled: isConnected },
  });

  const { data: amountsOut } = useReadContract({
    address: ROUTER_ADDRESS,
    abi: ROUTER_ABI,
    functionName: "getAmountsOut",
    args: [parseEther(amountIn || "0"), path],
    query: { enabled: Boolean(amountIn) && Number(amountIn) > 0 && path.length >= 2 },
  });

  const outAmount = amountsOut && amountsOut.length > 0 ? amountsOut[amountsOut.length - 1] : BigInt(0);

  const txError = error
    ? error.message.includes("UserRejected")
      ? "用户拒绝了交易"
      : error.message.includes("Slippage exceeded")
        ? "滑点过大"
        : error.message.includes("Transaction expired")
          ? "交易已过期"
          : error.message.includes("Pool not found")
            ? "路径不存在"
            : "交易失败"
    : "";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-brand">Router</span> 多池路由兑换
        </h1>
        <p className="text-sm text-muted">通过 ChainForgeRouter 在多个 AMM 池之间寻找最佳路径进行兑换</p>
      </div>

      {!isConnected && (
        <div className="rounded-xl border-2 border-dashed border-brand/30 bg-brand/5 p-6 text-center">
          <p className="text-foreground font-medium">连接钱包以使用路由兑换</p>
        </div>
      )}

      {isConnected && (
        <div className="grid md:grid-cols-2 gap-6">
          <SectionCard title="路由兑换" icon="🔄">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1 mb-2">
              <p className="font-semibold">Router 原理</p>
              <p>Router 连接多个 AMM 池，支持跨池多跳兑换。例如：TKA → TKB → TKC（2 跳）。当前注册池数: {poolCount?.toString() ?? "—"}</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!amountIn || Number(amountIn) <= 0 || path.length < 2) return;
                const minOut = outAmount > BigInt(0) ? (outAmount * BigInt(99)) / BigInt(100) : BigInt(0);
                const h = writeContract({
                  address: ROUTER_ADDRESS,
                  abi: ROUTER_ABI,
                  functionName: "swapExactTokensForTokens",
                  args: [parseEther(amountIn), minOut, path, address!, getDeadline()],
                });
                setHash(h as unknown as `0x${string}`);
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-xs text-muted font-medium">输入数量</label>
                <input
                  type="number"
                  placeholder="0.0"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  min="0"
                  step="any"
                  className="w-full rounded-lg bg-white border border-border px-3 py-2.5 text-sm placeholder-muted focus:border-brand focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted font-medium">兑换路径（代币地址数组）</label>
                <div className="space-y-2">
                  {path.map((addr, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted w-6">{i + 1}.</span>
                      <input
                        type="text"
                        value={addr}
                        onChange={(e) => {
                          const newPath = [...path];
                          newPath[i] = e.target.value as `0x${string}`;
                          setPath(newPath);
                        }}
                        className="flex-1 rounded-lg bg-white border border-border px-3 py-2 text-sm font-mono focus:border-brand focus:outline-none"
                        placeholder="0x..."
                      />
                      {path.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setPath(path.filter((_, idx) => idx !== i))}
                          className="text-xs text-red-500 hover:text-red-700 px-2"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPath([...path, "0x" as `0x${string}`])}
                    className="text-xs text-brand hover:text-brand-hover font-medium"
                  >
                    + 添加中间代币
                  </button>
                </div>
              </div>

              {outAmount > BigInt(0) && (
                <div className="bg-white rounded-lg border border-border p-3 space-y-1 text-xs">
                  <p className="text-muted font-medium">预估输出</p>
                  <p className="font-mono font-semibold text-foreground">{formatEther(outAmount)}</p>
                </div>
              )}

              <TxButton isPending={isPending} disabled={!amountIn || Number(amountIn) <= 0 || path.length < 2 || path.some((p) => !p)}>
                路由兑换
              </TxButton>
              {txError && <p className="text-red-500 text-xs">{txError}</p>}
              <TransactionStatus hash={hash} />
            </form>
          </SectionCard>

          <SectionCard title="已注册池" icon="📊">
            <div className="space-y-2">
              <p className="text-xs text-muted">当前 Router 中注册的 AMM 池数量</p>
              <p className="text-2xl font-bold text-foreground">{poolCount?.toString() ?? "—"}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
              <p className="font-semibold">测试路径</p>
              <p>当前只有一个池，支持单跳兑换。输入路径时至少需要两个地址。</p>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
