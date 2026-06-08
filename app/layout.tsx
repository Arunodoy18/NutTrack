import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dietBuddy - Calorie & Nutrition Estimator",
  description: "AI-powered calorie and nutrition estimator from meal photos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
