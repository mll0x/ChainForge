const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface WalletBalance {
  address: string;
  ethBalance: string;
  tokenBalance: string;
  tokenSymbol: string;
}

export interface TransactionResult {
  transactionHash: string;
  from: string;
  to: string;
  status: string;
}

export interface NftInfo {
  tokenId: number;
  owner: string;
  tokenURI: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res.json();
}

export const api = {
  getBalance: (address: string) =>
    request<WalletBalance>(`/api/wallet/${address}/balance`),

  transferToken: (to: string, amount: number) =>
    request<TransactionResult>("/api/token/transfer", {
      method: "POST",
      body: JSON.stringify({ to, amount }),
    }),

  approveToken: (spender: string, amount: number) =>
    request<TransactionResult>("/api/token/approve", {
      method: "POST",
      body: JSON.stringify({ spender, amount }),
    }),

  mintToken: (to: string, amount: number) =>
    request<TransactionResult>("/api/token/mint", {
      method: "POST",
      body: JSON.stringify({ to, amount }),
    }),

  mintNft: (to: string, quantity: number) =>
    request<TransactionResult>("/api/nft/mint", {
      method: "POST",
      body: JSON.stringify({ to, quantity }),
    }),

  getNftInfo: (tokenId: number) =>
    request<NftInfo>(`/api/nft/${tokenId}`),
};
