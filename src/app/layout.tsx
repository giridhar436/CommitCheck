import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { PwaLifecycle } from "@/components/pwa/pwa-lifecycle";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://commitcheck.dev"),
  title: "CommitCheck | Meeting-to-Code Freelance Verification Platform",
  description:
    "Bridging freelance Google Meet discovery calls, Linear task tracking, and GitHub codebase activity.",
  manifest: "/manifest.webmanifest",
  applicationName: "CommitCheck",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CommitCheck",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/logo-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/logo-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/logo-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "CommitCheck | Meeting-to-Code Freelance Verification Platform",
    description:
      "Bridging freelance Google Meet discovery calls, Linear task tracking, and GitHub codebase activity.",
    url: "/",
    siteName: "CommitCheck",
    images: [
      {
        url: "/icons/logo-1200x630.png",
        width: 1200,
        height: 630,
        alt: "CommitCheck - Meeting-to-Code Freelance Verification Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CommitCheck | Meeting-to-Code Freelance Verification Platform",
    description:
      "Bridging freelance Google Meet discovery calls, Linear task tracking, and GitHub codebase activity.",
    images: ["/icons/logo-1200x630.png"],
  },
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
          <PwaLifecycle />
        </ThemeProvider>
      </body>
    </html>
  );
}
