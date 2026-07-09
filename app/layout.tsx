import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { PwaRegistry } from "@/components/PwaRegistry";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "Nura - Intelligent Nutrition Tracking",
  description: "Track your meals effortlessly with Nura AI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Nura",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-surface-muted text-ink antialiased">
        <PwaRegistry />
        <InstallPrompt />
        {children}
      </body>
    </html>
  );
}
