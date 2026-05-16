"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther, formatEther, maxUint256 } from "viem";
import { SIMPLEAMM_ADDRESS, SIMPLEAMM_ABI, MYTOKEN_ADDRESS, MYTOKEN_ABI } from "@/lib/contracts";
import { useAMMPool, useAmountOut } from "@/hooks/useAMM";
import { TransactionStatus } from "@/components/TransactionStatus";

// ─── Shared ───────────────────────────────────────────────

function SectionCard({ title, icon, color, children }: { title: string; icon: string; color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    green: "text-green-600 bg-green-50 border-green-200",
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    orange: "text-orange-600 bg-orange-50 border-orange-200",
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className={`text-lg`}>{icon}</span>
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${colorMap[color]?.split(" ")[0] ?? "text-foreground"}`}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function NumericInput({ label, value, onChange, placeholder, max, symbol }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; max?: string; symbol?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted font-medium">{label}</label>
        {symbol && <span className="text-xs font-mono text-brand">{symbol}</span>}
      </div>
      <div className="relative">
        <input
          type="number"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min="0"
          step="any"
          className="w-full rounded-lg bg-white border border-border px-3 py-2.5 text-sm placeholder-muted focus:border-brand focus:outline-none pr-20"
        />
        {max !== undefined && (
          <button
            type="button"
            onClick={() => onChange(max)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand hover:text-brand-hover px-2 py-0.5 rounded bg-brand/10 hover:bg-brand/20 transition-colors"
          >
            MAX
          </button>
        )}
      </div>
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

// ─── Approve Gate ─────────────────────────────────────────

function ApproveGate({ token, symbol, allowance, onDone }: { token: `0x${string}`; symbol: string; allowance: string; onDone: () => void }) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });
  const prevSuccess = useRef(false);

  useEffect(() => {
    if (isSuccess && !prevSuccess.current) {
      prevSuccess.current = true;
      setTimeout(onDone, 500);
    }
    if (!isSuccess) prevSuccess.current = false;
  }, [isSuccess, onDone]);

  const needsApprove = Number(allowance) < 1e18; // less than 1 token approved

  if (!needsApprove) return null;

  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
      <p className="text-xs text-amber-800">
        需要先授权 {symbol} 给 AMM 合约，才能继续操作
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          writeContract({
            address: token,
            abi: MYTOKEN_ABI,
            functionName: "approve",
            args: [SIMPLEAMM_ADDRESS, maxUint256],
          })
        }
        className="w-full rounded-lg bg-amber-600 text-white font-semibold py-2 text-sm hover:bg-amber-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "确认钱包..." : `授权 ${symbol}`}
      </button>
      <TransactionStatus hash={hash} />
    </div>
  );
}

// ─── Pool Overview ────────────────────────────────────────

function PoolOverview() {
  const { data, isLoading } = useAMMPool();
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-muted">请先连接钱包查看流动性池状态</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8">
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-border rounded w-1/3" />
          <div className="h-12 bg-border rounded" />
        </div>
      </div>
    );
  }

  const hasLiquidity = Number(data.reserveA) > 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">流动性池</h2>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
          {hasLiquidity ? "有流动性" : "空池"}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PoolStat label={`${data.tokenASymbol} 储备`} value={data.reserveA} />
        <PoolStat label={`${data.tokenBSymbol} 储备`} value={data.reserveB} />
        <PoolStat label="LP 总供应" value={Number(data.totalSupply).toFixed(4)} />
        <PoolStat label={`我的 LP`} value={Number(data.myLP).toFixed(4)} highlight />
      </div>

      {hasLiquidity && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-border">
          <PoolStat label={`1 ${data.tokenASymbol} =`} value={`${data.priceB} ${data.tokenBSymbol}`} />
          <PoolStat label={`1 ${data.tokenBSymbol} =`} value={`${data.priceA} ${data.tokenASymbol}`} />
          <PoolStat label="k (乘积)" value={Number(data.k).toExponential(4)} />
        </div>
      )}

      {/* 恒定乘积公式说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
        <p className="font-semibold">恒定乘积公式 x &times; y = k</p>
        <p>每次 swap 后，两种代币储备量的乘积 k 不变（无手续费时）。池中一种代币减少，另一种必然增加，价格由供需自动决定。</p>
      </div>
    </div>
  );
}

function PoolStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-border">
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${highlight ? "text-brand" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

// ─── Add Liquidity ────────────────────────────────────────

function AddLiquidityForm() {
  const { data: pool } = useAMMPool();
  const { isConnected } = useAccount();
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const prevSuccess = useRef(false);

  const { writeContract, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && !prevSuccess.current) {
      setAmountA("");
      setAmountB("");
      prevSuccess.current = true;
    }
    if (!isSuccess) prevSuccess.current = false;
  }, [isSuccess]);

  // 自动计算 B 的数量（如果池已有流动性）
  const handleAmountAChange = useCallback((val: string) => {
    setAmountA(val);
    if (pool && Number(pool.reserveA) > 0 && val) {
      const ratio = Number(pool.reserveB) / Number(pool.reserveA);
      setAmountB((Number(val) * ratio).toFixed(6));
    }
  }, [pool]);

  if (!isConnected || !pool) return null;

  const txError = error
    ? error.message.includes("UserRejected")
      ? "用户拒绝了交易"
      : error.message.includes("Zero amount")
        ? "数量不能为 0"
        : error.message.includes("Insufficient liquidity minted")
          ? "流动性不足，请增大数量"
          : "交易失败"
    : "";

  return (
    <SectionCard title="添加流动性" icon="💧" color="green">
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 space-y-1 mb-2">
        <p className="font-semibold">添加流动性做什么？</p>
        <p>向池中存入等价值的两种代币，成为做市商 (LP)。你将获得 LP Token 作为份额凭证，可以随时取回代币。</p>
      </div>

      <ApproveGate
        token={MYTOKEN_ADDRESS}
        symbol={pool.tokenASymbol}
        allowance={pool.tokenAAllowance}
        onDone={() => {}}
      />
      <ApproveGate
        token={pool.tokenB as `0x${string}`}
        symbol={pool.tokenBSymbol}
        allowance={pool.tokenBAllowance}
        onDone={() => {}}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const h = writeContract({
            address: SIMPLEAMM_ADDRESS,
            abi: SIMPLEAMM_ABI,
            functionName: "addLiquidity",
            args: [parseEther(amountA), parseEther(amountB)],
          });
          setHash(h as unknown as `0x${string}`);
        }}
        className="space-y-3"
      >
        <NumericInput
          label={`存入 ${pool.tokenASymbol}`}
          value={amountA}
          onChange={handleAmountAChange}
          placeholder="0.0"
          max={pool.tokenABalance}
          symbol={pool.tokenASymbol}
        />
        <div className="flex justify-center">
          <span className="text-muted text-lg">+</span>
        </div>
        <NumericInput
          label={`存入 ${pool.tokenBSymbol}`}
          value={amountB}
          onChange={setAmountB}
          placeholder="0.0"
          max={pool.tokenBBalance}
          symbol={pool.tokenBSymbol}
        />
        {Number(pool.reserveA) > 0 && (
          <p className="text-xs text-muted">
            当前比例 1 {pool.tokenASymbol} = {pool.priceB} {pool.tokenBSymbol}，输入 {pool.tokenASymbol} 后自动计算
          </p>
        )}
        <TxButton isPending={isPending}>添加流动性</TxButton>
        {txError && <p className="text-red-500 text-xs">{txError}</p>}
        <TransactionStatus hash={hash} />
      </form>
    </SectionCard>
  );
}

// ─── Remove Liquidity ────────────────────────────────────

function RemoveLiquidityForm() {
  const { data: pool, refetch } = useAMMPool();
  const { isConnected } = useAccount();
  const [lpAmount, setLpAmount] = useState("");
  const [pct, setPct] = useState(0);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const prevSuccess = useRef(false);

  const { writeContract, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && !prevSuccess.current) {
      setLpAmount("");
      setPct(0);
      prevSuccess.current = true;
      refetch();
    }
    if (!isSuccess) prevSuccess.current = false;
  }, [isSuccess, refetch]);

  if (!isConnected || !pool) return null;

  const myLP = Number(pool.myLP);
  const hasLP = myLP > 0;

  // 预估取回数量
  const totalSupply = Number(pool.totalSupply);
  const estA = totalSupply > 0 && lpAmount ? (Number(lpAmount) / totalSupply * Number(pool.reserveA)).toFixed(4) : "0";
  const estB = totalSupply > 0 && lpAmount ? (Number(lpAmount) / totalSupply * Number(pool.reserveB)).toFixed(4) : "0";

  const handlePct = (p: number) => {
    setPct(p);
    setLpAmount((myLP * p / 100).toFixed(18));
  };

  const txError = error
    ? error.message.includes("UserRejected")
      ? "用户拒绝了交易"
      : error.message.includes("Zero liquidity")
        ? "LP 数量不能为 0"
        : "交易失败"
    : "";

  return (
    <SectionCard title="移除流动性" icon="🔓" color="orange">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800 space-y-1 mb-2">
        <p className="font-semibold">移除流动性做什么？</p>
        <p>销毁 LP Token，按份额比例取回池中的两种代币。你获得的比例 = 你的 LP / 总 LP。</p>
      </div>

      {!hasLP ? (
        <p className="text-sm text-muted text-center py-4">你当前没有 LP 份额</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const h = writeContract({
              address: SIMPLEAMM_ADDRESS,
              abi: SIMPLEAMM_ABI,
              functionName: "removeLiquidity",
              args: [parseEther(lpAmount)],
            });
            setHash(h as unknown as `0x${string}`);
          }}
          className="space-y-3"
        >
          <div className="flex gap-2">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePct(p)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  pct === p
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-muted border-border hover:border-brand/50"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>

          <NumericInput
            label="销毁 LP 数量"
            value={lpAmount}
            onChange={(v) => { setLpAmount(v); setPct(0); }}
            placeholder="0.0"
            max={pool.myLP}
            symbol="SALP"
          />

          {Number(lpAmount) > 0 && (
            <div className="bg-white rounded-lg border border-border p-3 space-y-1 text-xs">
              <p className="text-muted font-medium">预估取回</p>
              <div className="flex justify-between">
                <span>{pool.tokenASymbol}</span>
                <span className="font-mono font-semibold text-foreground">{estA}</span>
              </div>
              <div className="flex justify-between">
                <span>{pool.tokenBSymbol}</span>
                <span className="font-mono font-semibold text-foreground">{estB}</span>
              </div>
            </div>
          )}

          <TxButton isPending={isPending} disabled={!lpAmount || Number(lpAmount) <= 0}>
            移除流动性
          </TxButton>
          {txError && <p className="text-red-500 text-xs">{txError}</p>}
          <TransactionStatus hash={hash} />
        </form>
      )}
    </SectionCard>
  );
}

// ─── Swap ─────────────────────────────────────────────────

function SwapForm() {
  const { data: pool, refetch } = useAMMPool();
  const { isConnected } = useAccount();
  const [amountIn, setAmountIn] = useState("");
  const [isAToB, setIsAToB] = useState(true);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [slippage, setSlippage] = useState("0.5");
  const prevSuccess = useRef(false);

  const { writeContract, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && !prevSuccess.current) {
      setAmountIn("");
      prevSuccess.current = true;
      refetch();
    }
    if (!isSuccess) prevSuccess.current = false;
  }, [isSuccess, refetch]);

  // 读取链上报价
  const { data: amountOut } = useAmountOut(amountIn, isAToB);

  if (!isConnected || !pool) return null;

  const hasLiquidity = Number(pool.reserveA) > 0;
  const inSymbol = isAToB ? pool.tokenASymbol : pool.tokenBSymbol;
  const outSymbol = isAToB ? pool.tokenBSymbol : pool.tokenASymbol;
  const inBalance = isAToB ? pool.tokenABalance : pool.tokenBBalance;
  const inToken = isAToB ? MYTOKEN_ADDRESS : (pool.tokenB as `0x${string}`);
  const outAmount = amountOut ? formatEther(amountOut) : "0";
  const slippagePct = Number(slippage) || 0;
  const minOut = Number(outAmount) > 0 ? (Number(outAmount) * (1 - slippagePct / 100)).toFixed(18) : "0";

  const txError = error
    ? error.message.includes("UserRejected")
      ? "用户拒绝了交易"
      : error.message.includes("Slippage exceeded")
        ? "滑点过大，交易被拒绝（价格变动超过了你设置的最大滑点）"
        : error.message.includes("Invalid token")
          ? "无效代币"
          : error.message.includes("Zero input")
            ? "输入数量不能为 0"
            : "交易失败"
    : "";

  return (
    <SectionCard title="代币兑换" icon="🔄" color="blue">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1 mb-2">
        <p className="font-semibold">Swap 原理</p>
        <p>输入一种代币，AMM 根据恒定乘积公式自动计算你能换到多少另一种代币。池中代币越少，价格越高 — 这就是滑点。</p>
      </div>

      {!hasLiquidity ? (
        <p className="text-sm text-muted text-center py-4">池中暂无流动性，请先添加流动性</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!amountIn || Number(amountIn) <= 0) return;
            const h = writeContract({
              address: SIMPLEAMM_ADDRESS,
              abi: SIMPLEAMM_ABI,
              functionName: "swap",
              args: [inToken, parseEther(amountIn), parseEther(minOut)],
            });
            setHash(h as unknown as `0x${string}`);
          }}
          className="space-y-3"
        >
          {/* 输入代币 */}
          <div className="bg-white rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-medium">你付出</span>
              <span className="text-xs text-muted">余额: {Number(inBalance).toFixed(4)} {inSymbol}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                min="0"
                step="any"
                className="flex-1 text-2xl font-bold bg-transparent outline-none placeholder-muted"
              />
              <span className="text-sm font-semibold text-brand bg-brand/10 px-3 py-1 rounded-full">{inSymbol}</span>
            </div>
          </div>

          {/* 方向切换 */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => { setIsAToB(!isAToB); setAmountIn(""); }}
              className="w-10 h-10 rounded-full border border-border bg-white hover:bg-surface hover:border-brand/50 transition-all flex items-center justify-center text-muted hover:text-brand"
            >
              ⇅
            </button>
          </div>

          {/* 输出代币 */}
          <div className="bg-white rounded-lg border border-border p-3 space-y-2">
            <span className="text-xs text-muted font-medium">你收到</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">
                {Number(outAmount) > 0 ? Number(outAmount).toFixed(6) : "0"}
              </span>
              <span className="text-sm font-semibold text-brand bg-brand/10 px-3 py-1 rounded-full">{outSymbol}</span>
            </div>
          </div>

          {/* 滑点设置 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted font-medium">最大滑点</label>
              <div className="flex items-center gap-1">
                {[0.1, 0.5, 1].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlippage(String(s))}
                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                      slippage === String(s)
                        ? "bg-brand text-white border-brand"
                        : "bg-white text-muted border-border hover:border-brand/50"
                    }`}
                  >
                    {s}%
                  </button>
                ))}
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="w-14 rounded border border-border px-1.5 py-0.5 text-xs text-right"
                  step="0.1"
                  min="0"
                  max="50"
                />
              </div>
            </div>
            {Number(outAmount) > 0 && (
              <div className="text-xs text-muted space-y-0.5">
                <div className="flex justify-between">
                  <span>兑换率</span>
                  <span className="font-mono">1 {inSymbol} = {(Number(outAmount) / Number(amountIn)).toFixed(6)} {outSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>最少收到</span>
                  <span className="font-mono">{Number(minOut).toFixed(6)} {outSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>价格影响</span>
                  <span className="font-mono">
                    {Number(amountIn) > 0
                      ? `${(Math.abs(1 - (Number(outAmount) / Number(amountIn)) / Number(isAToB ? pool.priceB : pool.priceA)) * 100).toFixed(2)}%`
                      : "0%"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <TxButton isPending={isPending} disabled={!amountIn || Number(amountIn) <= 0}>
            Swap {inSymbol} → {outSymbol}
          </TxButton>
          {txError && <p className="text-red-500 text-xs">{txError}</p>}
          <TransactionStatus hash={hash} />
        </form>
      )}
    </SectionCard>
  );
}

// ─── Flow Diagram ─────────────────────────────────────────

function FlowDiagram() {
  const { data: pool } = useAMMPool();
  if (!pool) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <h2 className="text-lg font-semibold">AMM 流程图解</h2>
      <div className="bg-white rounded-lg border border-border p-4 font-mono text-xs leading-relaxed overflow-x-auto text-muted">
        <pre>{`
 ┌──────────┐     approve + transfer      ┌──────────────────┐
 │   用户    │ ──────────────────────────▶ │   SimpleAMM 合约   │
 │  (你)     │                             │                  │
 │           │ ◀────────────────────────── │  tokenA 储备: ${pool.reserveA.padStart(10)} ${pool.tokenASymbol}
 │           │   LP Token / 代币返回        │  tokenB 储备: ${pool.reserveB.padStart(10)} ${pool.tokenBSymbol}
 └──────────┘                             │                  │
                                           │  x × y = k      │
                                           │  k = ${Number(pool.k).toExponential(4)}
                                           └──────────────────┘

 操作流程:
 1️⃣ 添加流动性: approve → addLiquidity(A, B) → 获得 LP Token
 2️⃣ 兑换:       approve → swap(tokenIn, amount, minOut) → 收到 tokenOut
 3️⃣ 移除流动性: removeLiquidity(LP) → 取回 A + B
        `}</pre>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────

export default function AMMPage() {
  const { isConnected } = useAccount();
  const { data: pool } = useAMMPool();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-brand">AMM</span> 去中心化交易所
        </h1>
        <p className="text-sm text-muted">
          基于 Uniswap V2 恒定乘积公式 (x &times; y = k) 的简化版自动做市商 — 无手续费
        </p>
      </div>

      {!isConnected && (
        <div className="rounded-xl border-2 border-dashed border-brand/30 bg-brand/5 p-6 text-center space-y-2">
          <p className="text-foreground font-medium">开始体验 AMM</p>
          <p className="text-sm text-muted">点击右上角连接钱包，然后按下方流程操作即可</p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted pt-2">
            <span className="bg-brand/10 text-brand px-2 py-0.5 rounded">1. 添加流动性</span>
            <span>→</span>
            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">2. Swap 兑换</span>
            <span>→</span>
            <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded">3. 移除流动性</span>
          </div>
        </div>
      )}

      <PoolOverview />

      {isConnected && pool && (
        <>
          <FlowDiagram />

          <div className="grid md:grid-cols-2 gap-4">
            <AddLiquidityForm />
            <SwapForm />
          </div>

          <RemoveLiquidityForm />
        </>
      )}
    </div>
  );
}
