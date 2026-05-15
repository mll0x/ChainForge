"use client";

import { useState, useEffect, useRef } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContract } from "wagmi";
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
  const [nftName, setNftName] = useState("");
  const [nftDesc, setNftDesc] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [inputError, setInputError] = useState("");
  const [uploading, setUploading] = useState(false);
  const prevSuccess = useRef(false);
  const pendingUpload = useRef<{ file: File; name: string; desc: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: totalMinted } = useReadContract({
    address: MYNFT_ADDRESS,
    abi: MYNFT_ABI,
    functionName: "totalMinted",
  });

  const { data: hash, error, writeContract, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess && !prevSuccess.current) {
      onMintSuccess?.();
      prevSuccess.current = true;

      // 铸造成功后上传图片（使用 ref 避免闭包问题）
      const pending = pendingUpload.current;
      if (pending && totalMinted != null) {
        const tokenId = Number(totalMinted) - 1;
        setUploading(true);
        const formData = new FormData();
        formData.append("image", pending.file);
        formData.append("tokenId", String(tokenId));
        formData.append("name", pending.name);
        formData.append("description", pending.desc);
        fetch("/api/nft/upload", { method: "POST", body: formData })
          .catch(() => {})
          .finally(() => setUploading(false));
        pendingUpload.current = null;
      }

      setTo("");
      setQuantity("1");
      setNftName("");
      setNftDesc("");
      setImageFile(null);
      setImagePreview(null);
      setInputError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    if (!isSuccess) {
      prevSuccess.current = false;
    }
  }, [isSuccess, totalMinted, onMintSuccess]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setInputError("图片大小不能超过 5MB");
      return;
    }
    setImageFile(file);
    setInputError("");
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = to || address;
    if (!target) return;
    if (to && !isValidEthAddress(to)) {
      setInputError("无效的以太坊地址");
      return;
    }
    setInputError("");

    // 保存待上传的图片信息
    if (imageFile) {
      pendingUpload.current = {
        file: imageFile,
        name: nftName,
        desc: nftDesc,
      };
    }

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
      {/* 图片上传 */}
      <div>
        <label className="block text-xs text-muted mb-1">NFT 图片 (可选)</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-border hover:border-brand/50 bg-white cursor-pointer transition-colors overflow-hidden"
        >
          {imagePreview ? (
            <img src={imagePreview} alt="preview" className="w-full aspect-square object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-muted">
              <span className="text-2xl mb-1">+</span>
              <span className="text-xs">点击上传图片</span>
              <span className="text-xs text-muted/60">PNG, JPG, GIF, WebP (Max 5MB)</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        {imageFile && (
          <button
            type="button"
            onClick={() => {
              setImageFile(null);
              setImagePreview(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="text-xs text-red-400 hover:text-red-600 mt-1"
          >
            移除图片
          </button>
        )}
      </div>

      {/* 名称和描述 */}
      <input
        type="text"
        placeholder="NFT 名称 (可选)"
        value={nftName}
        onChange={(e) => setNftName(e.target.value)}
        className="w-full rounded-lg bg-white border border-border px-3 py-2 text-sm placeholder-muted focus:border-brand focus:outline-none"
      />
      <input
        type="text"
        placeholder="NFT 描述 (可选)"
        value={nftDesc}
        onChange={(e) => setNftDesc(e.target.value)}
        className="w-full rounded-lg bg-white border border-border px-3 py-2 text-sm placeholder-muted focus:border-brand focus:outline-none"
      />

      {/* 铸造地址和数量 */}
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
        disabled={isPending || uploading}
        className="w-full rounded-lg bg-brand text-white font-semibold py-2 text-sm hover:bg-brand-hover disabled:opacity-50 transition-colors"
      >
        {uploading ? "上传图片中..." : isPending ? "确认钱包..." : "铸造 NFT"}
      </button>
      {inputError && <p className="text-red-500 text-xs">{inputError}</p>}
      {walletError && <p className="text-red-500 text-xs">{walletError}</p>}
      <TransactionStatus hash={hash} />
    </form>
  );
}
