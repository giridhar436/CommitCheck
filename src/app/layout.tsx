import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { OfflineIndicator } from "@/components/ui/offline-indicator";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CommitCheck | Meeting-to-Code Freelance Verification Platform",
  description: "Bridging freelance Google Meet discovery calls, Linear task tracking, and GitHub codebase activity.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-[#222222] font-sans">
        {children}
        <OfflineIndicator />
      </body>
    </html>
  );
}
