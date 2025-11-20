// packages/web-app-vercel/app/layout.tsx
"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import ClientLayout from "./client-layout";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const SessionProviderWrapper = dynamic(
  () => import("./session-provider-wrapper"),
  { ssr: false }
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProviderWrapper>
      <html lang="ja" data-theme="ocean" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning
        >
          <Analytics />
          <ClientLayout>{children}</ClientLayout>
        </body>
      </html>
    </SessionProviderWrapper>
  );
}
