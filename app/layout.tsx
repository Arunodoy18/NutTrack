import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { PwaRegistry } from "@/components/PwaRegistry";
import AppLinker from "@/components/AppLinker";
import TimezoneCookie from "@/components/TimezoneCookie";

export const metadata: Metadata = {
  title: "Nura - Intelligent Nutrition Tracking",
  description: "Track your meals effortlessly with Nura AI",
  formatDetection: { telephone: false, email: false, address: false },
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
        <Script id="app-gate" strategy="beforeInteractive">{`try{if(!/NuraApp\\/\\d+\\.\\d+\\.\\d+/.test(navigator.userAgent)&&!/(^|;\\s*)nura_app=\\d/.test(document.cookie)&&!/^\\/(download|privacy|terms)\\/?$/.test(location.pathname))location.replace("/download")}catch(e){}`}</Script>
        <PwaRegistry />
        <TimezoneCookie />
        <AppLinker />
        {children}
      </body>
    </html>
  );
}
