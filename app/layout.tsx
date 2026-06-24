import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SWRegister } from "./sw-register";

export const metadata: Metadata = {
  title: "Running Coach",
  description: "Built with nightly-agents",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Running Coach",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
