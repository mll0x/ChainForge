import { NextResponse } from "next/server";

const COLORS = [
  ["#6366f1", "#8b5cf6"],
  ["#ec4899", "#f43f5e"],
  ["#14b8a6", "#06b6d4"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#3b82f6"],
  ["#8b5cf6", "#ec4899"],
  ["#06b6d4", "#6366f1"],
  ["#f43f5e", "#f59e0b"],
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params;
  const id = Number(tokenId);
  const [color1, color2] = COLORS[id % COLORS.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${color2}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#g)" rx="24"/>
    <text x="200" y="200" text-anchor="middle" dominant-baseline="central"
      font-family="system-ui, sans-serif" font-size="96" font-weight="bold"
      fill="white" opacity="0.9">${id}</text>
    <text x="200" y="340" text-anchor="middle"
      font-family="system-ui, sans-serif" font-size="18"
      fill="white" opacity="0.6">ChainForge #${id}</text>
  </svg>`;

  const metadata = {
    name: `ChainForge #${id}`,
    description: `ChainForge NFT collection — Token #${id}`,
    image: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    attributes: [
      { trait_type: "Token ID", value: id },
      { trait_type: "Collection", value: "ChainForge" },
    ],
  };

  return NextResponse.json(metadata);
}
