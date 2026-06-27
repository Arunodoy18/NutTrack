import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { PwaRegistry } from "@/components/PwaRegistry";
export const metadata: Metadata = {
  title: "dietBuddy - Calorie & Nutrition Estimator",
  description: "AI-powered calorie and nutrition estimator from meal photos.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "dietBuddy",
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
        {children}
      </body>
    </html>
  );
}
