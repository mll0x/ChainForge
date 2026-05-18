"use client";

import { useSignTypedData, useAccount, useReadContract } from "wagmi";
import { MYTOKEN_ABI } from "@/lib/contracts";
import { useCallback } from "react";

export function usePermit(token: `0x${string}`, spender: `0x${string}`, value: bigint, deadline: bigint) {
  const { address } = useAccount();

  const { data: name } = useReadContract({
    address: token,
    abi: MYTOKEN_ABI,
    functionName: "name",
    query: { enabled: !!token },
  });

  const { data: nonce } = useReadContract({
    address: token,
    abi: MYTOKEN_ABI,
    functionName: "nonces",
    args: [address!],
    query: { enabled: !!address && !!token },
  });

  const { signTypedDataAsync } = useSignTypedData();

  const signPermit = useCallback(async () => {
    if (!address || !name || nonce === undefined) return null;

    const domain = {
      name,
      version: "1",
      chainId: 31337,
      verifyingContract: token,
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const message = {
      owner: address,
      spender,
      value,
      nonce,
      deadline,
    };

    const signature = await signTypedDataAsync({ domain, types, message, primaryType: "Permit" });
    const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
    const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
    const v = parseInt(signature.slice(130, 132), 16);

    return { v, r, s, deadline };
  }, [address, name, nonce, token, spender, value, deadline, signTypedDataAsync]);

  return { signPermit, isReady: !!name && nonce !== undefined };
}
