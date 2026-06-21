import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

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

import { PwaRegistry } from "@/components/PwaRegistry";

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
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
