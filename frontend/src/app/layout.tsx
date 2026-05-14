import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChainForge",
  description: "链上锻造 — ERC-20 Token + ERC-721 NFT DApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <NavBar />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="border-t border-border py-4 text-center text-sm text-muted">
            ChainForge — Hardhat Local (Chain ID: 31337)
          </footer>
        </Providers>
      </body>
    </html>
  );
}
