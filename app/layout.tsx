import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { PwaRegistry } from "@/components/PwaRegistry";
import InstallPrompt from "@/components/InstallPrompt";
import TimezoneCookie from "@/components/TimezoneCookie";

export const metadata: Metadata = {
  title: "Nura - Intelligent Nutrition Tracking",
  description: "Track your meals effortlessly with Nura AI",
  manifest: "/manifest.json",
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: {
    capable: true,
    title: "Nura",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
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
        <TimezoneCookie />
        <InstallPrompt />
        {children}
      </body>
    </html>
  );
}
