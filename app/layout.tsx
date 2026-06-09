import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dietBuddy - Calorie & Nutrition Estimator",
  description: "AI-powered calorie and nutrition estimator from meal photos.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "dietBuddy",
    statusBarStyle: "black-translucent",
  },
};

import { PwaRegistry } from "@/components/PwaRegistry";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PwaRegistry />
        {children}
      </body>
    </html>
  );
}
