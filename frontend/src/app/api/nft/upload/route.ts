import { NextRequest, NextResponse } from "next/server";
import { uploadImage, setMetadata } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("image") as File | null;
  const name = (formData.get("name") as string) || "";
  const description = (formData.get("description") as string) || "";
  const tokenId = formData.get("tokenId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "缺少图片文件" }, { status: 400 });
  }
  if (!tokenId) {
    return NextResponse.json({ error: "缺少 tokenId" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "png";
  const filename = `${tokenId}.${ext}`;

  const { imageUrl, storageType } = await uploadImage(filename, buffer);

  setMetadata(Number(tokenId), {
    name: name || `ChainForge #${tokenId}`,
    description: description || `ChainForge NFT — Token #${tokenId}`,
    imageUrl,
    storageType,
  });

  return NextResponse.json({ success: true, imageUrl, storageType, tokenId });
}
