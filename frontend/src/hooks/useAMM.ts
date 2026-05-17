"use client";

import { useReadContracts, useAccount, useReadContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import {
  SIMPLEAMM_ADDRESS,
  SIMPLEAMM_ABI,
  MYTOKEN_ADDRESS,
  MYTOKEN_ABI,
} from "@/lib/contracts";

export interface AMMPoolData {
  tokenA: string;
  tokenB: string;
  reserveA: string;
  reserveB: string;
  totalSupply: string;
  myLP: string;
  priceA: string;
  priceB: string;
  k: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  tokenABalance: string;
  tokenBBalance: string;
  tokenAAllowance: string;
  tokenBAllowance: string;
  feeTo: string;
  feeToSetter: string;
  feeRate: string;
  kLast: string;
  price0CumulativeLast: string;
  price1CumulativeLast: string;
  blockTimestampLast: number;
}

export function useAMMPool() {
  const { address, isConnected } = useAccount();

  const { data: pool, isLoading, refetch } = useReadContracts({
    contracts: [
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "tokenA" },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "tokenB" },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "reserveA" },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "reserveB" },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "totalSupply" },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "balanceOf", args: [address!] },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "feeTo" },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "feeToSetter" },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "FEE_NUMERATOR" },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "kLast" },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "price0CumulativeLast" },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "price1CumulativeLast" },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "blockTimestampLast" },
    ],
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 5_000,
    },
  });

  const tokenA = (pool?.[0]?.result as string) ?? MYTOKEN_ADDRESS;
  const tokenB = (pool?.[1]?.result as string) ?? MYTOKEN_ADDRESS;
  const reserveA = (pool?.[2]?.result as bigint) ?? BigInt(0);
  const reserveB = (pool?.[3]?.result as bigint) ?? BigInt(0);
  const totalSupply = (pool?.[4]?.result as bigint) ?? BigInt(0);
  const myLP = (pool?.[5]?.result as bigint) ?? BigInt(0);
  const feeTo = (pool?.[6]?.result as string) ?? ethersZeroAddress;
  const feeToSetter = (pool?.[7]?.result as string) ?? ethersZeroAddress;
  const feeNumerator = (pool?.[8]?.result as bigint) ?? BigInt(997);
  const kLast = (pool?.[9]?.result as bigint) ?? BigInt(0);
  const price0CumulativeLast = (pool?.[10]?.result as bigint) ?? BigInt(0);
  const price1CumulativeLast = (pool?.[11]?.result as bigint) ?? BigInt(0);
  const blockTimestampLast = (pool?.[12]?.result as number) ?? 0;

  const { data: tokenData } = useReadContracts({
    contracts: [
      { address: tokenA as `0x${string}`, abi: MYTOKEN_ABI, functionName: "symbol" },
      { address: tokenB as `0x${string}`, abi: MYTOKEN_ABI, functionName: "symbol" },
      { address: tokenA as `0x${string}`, abi: MYTOKEN_ABI, functionName: "balanceOf", args: [address!] },
      { address: tokenB as `0x${string}`, abi: MYTOKEN_ABI, functionName: "balanceOf", args: [address!] },
      { address: tokenA as `0x${string}`, abi: MYTOKEN_ABI, functionName: "allowance", args: [address!, SIMPLEAMM_ADDRESS] },
      { address: tokenB as `0x${string}`, abi: MYTOKEN_ABI, functionName: "allowance", args: [address!, SIMPLEAMM_ADDRESS] },
    ],
    query: {
      enabled: isConnected && !!address && tokenA !== MYTOKEN_ADDRESS,
      refetchInterval: 5_000,
    },
  });

  const tokenASymbol = (tokenData?.[0]?.result as string) ?? "TKA";
  const tokenBSymbol = (tokenData?.[1]?.result as string) ?? "TKB";
  const tokenABalance = (tokenData?.[2]?.result as bigint) ?? BigInt(0);
  const tokenBBalance = (tokenData?.[3]?.result as bigint) ?? BigInt(0);
  const tokenAAllowance = (tokenData?.[4]?.result as bigint) ?? BigInt(0);
  const tokenBAllowance = (tokenData?.[5]?.result as bigint) ?? BigInt(0);

  const rA = reserveA > BigInt(0) ? Number(formatEther(reserveA)) : 0;
  const rB = reserveB > BigInt(0) ? Number(formatEther(reserveB)) : 0;

  const feeRate = feeNumerator > BigInt(0)
    ? ((1 - Number(feeNumerator) / 1000) * 100).toFixed(1)
    : "0.3";

  const data: AMMPoolData | null = address
    ? {
        tokenA,
        tokenB,
        reserveA: rA.toFixed(4),
        reserveB: rB.toFixed(4),
        totalSupply: totalSupply > BigInt(0) ? formatEther(totalSupply) : "0",
        myLP: myLP > BigInt(0) ? formatEther(myLP) : "0",
        priceA: rB > 0 && rA > 0 ? (rB / rA).toFixed(6) : "—",
        priceB: rA > 0 && rB > 0 ? (rA / rB).toFixed(6) : "—",
        k: reserveA > BigInt(0) && reserveB > BigInt(0) ? formatEther(reserveA * reserveB) : "0",
        tokenASymbol,
        tokenBSymbol,
        tokenABalance: formatEther(tokenABalance),
        tokenBBalance: formatEther(tokenBBalance),
        tokenAAllowance: formatEther(tokenAAllowance),
        tokenBAllowance: formatEther(tokenBAllowance),
        feeTo,
        feeToSetter,
        feeRate,
        kLast: kLast > BigInt(0) ? formatEther(kLast) : "0",
        price0CumulativeLast: price0CumulativeLast.toString(),
        price1CumulativeLast: price1CumulativeLast.toString(),
        blockTimestampLast: Number(blockTimestampLast),
      }
    : null;

  return { data, isLoading, refetch };
}

const ethersZeroAddress = "0x0000000000000000000000000000000000000000";

export function useAmountOut(amountIn: string, isAToB: boolean) {
  const { address, isConnected } = useAccount();

  const { data: reserves } = useReadContracts({
    contracts: [
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "reserveA" },
      { address: SIMPLEAMM_ADDRESS, abi: SIMPLEAMM_ABI, functionName: "reserveB" },
    ],
    query: {
      enabled: isConnected,
      refetchInterval: 5_000,
    },
  });

  const reserveA = (reserves?.[0]?.result as bigint) ?? BigInt(0);
  const reserveB = (reserves?.[1]?.result as bigint) ?? BigInt(0);

  const amountInBN = amountIn && !isNaN(Number(amountIn)) ? parseEther(amountIn) : BigInt(0);
  const reserveIn = isAToB ? reserveA : reserveB;
  const reserveOut = isAToB ? reserveB : reserveA;

  return useReadContract({
    address: SIMPLEAMM_ADDRESS,
    abi: SIMPLEAMM_ABI,
    functionName: "getAmountOut",
    args: [amountInBN, reserveIn, reserveOut],
    query: {
      enabled: amountInBN > BigInt(0) && reserveIn > BigInt(0) && reserveOut > BigInt(0),
    },
  });
}
