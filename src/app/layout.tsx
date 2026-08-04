import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexusAI — The AI Business Operating System",
  description:
    "One workspace for AI chat, documents, images, websites, SEO, marketing & YouTube. Run your entire business from a single AI-powered OS.",
  keywords: [
    "NexusAI",
    "AI workspace",
    "AI business OS",
    "AI chat",
    "AI documents",
    "AI images",
    "AI agents",
  ],
  authors: [{ name: "NexusAI" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "NexusAI — The AI Business Operating System",
    description:
      "One workspace. One login. One subscription. Replace 10 SaaS tools with NexusAI.",
    siteName: "NexusAI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="bottom-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
