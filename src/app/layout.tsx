import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import "./globals.css";

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
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-canvas text-ink font-sans">
        <ThemeProvider>
          {children}
          <OfflineIndicator />
        </ThemeProvider>
      </body>
    </html>
  );
}
