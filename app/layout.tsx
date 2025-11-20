import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import { Suspense } from "react";
import { LoadingBar } from "@/components/LoadingBar";
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
  title: "Wayground Resource Sheets Generator",
  description: "Generate resource sheets and interactive videos from YouTube playlists",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Suspense fallback={null}>
          <LoadingBar />
        </Suspense>
        <div className="pt-5 pb-1 flex justify-center">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image src="/wayground-logo.png" alt="Wayground" width={150} height={24} className="h-6 w-auto" priority />
          </Link>
        </div>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
