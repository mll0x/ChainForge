"use client";

import { useWaitForTransactionReceipt, useChainId } from "wagmi";
import type { Hash } from "viem";

const EXPLORER: Record<number, string> = {
  11155111: "https://sepolia.etherscan.io",
};

interface TransactionStatusProps {
  hash: Hash | undefined;
}

export function TransactionStatus({ hash }: TransactionStatusProps) {
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });
  const chainId = useChainId();

  if (!hash) return null;

  const explorer = EXPLORER[chainId];
  const txUrl = explorer ? `${explorer}/tx/${hash}` : undefined;

  return (
    <div className="space-y-1 text-xs">
      {isLoading && (
        <p className="text-amber-600">
          交易确认中...{" "}
          {txUrl ? (
            <a
              href={txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-blue-600 hover:underline"
            >
              {hash.slice(0, 10)}...
            </a>
          ) : (
            <span className="font-mono">{hash.slice(0, 10)}...</span>
          )}
        </p>
      )}
      {isSuccess && (
        <p className="text-green-600">
          交易成功!{" "}
          {txUrl ? (
            <a
              href={txUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-blue-600 hover:underline"
            >
              {hash.slice(0, 10)}...
            </a>
          ) : (
            <span className="font-mono">{hash.slice(0, 10)}...</span>
          )}
        </p>
      )}
    </div>
  );
}
