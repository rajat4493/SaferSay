import type { Metadata, Viewport } from "next";
import { DM_Mono, Inter } from "next/font/google";
import { BrandProvider } from "@/components/BrandProvider";
import { DataProvider } from "@/components/DataProvider";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

// Inter carries the full product hierarchy. DM Mono is deliberately
// reserved for compact metadata, timestamps, badges, and section markers.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "SaferSay — Confidential Employee Surveys",
  description:
    "A self-serve confidential employee survey product for small HR and startup teams.",
  manifest: "/manifest.json",
  icons: {
    icon: "/safersay-mark.svg",
    apple: "/safersay-mark.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d4f37",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BrandProvider>
          <DataProvider>
            <ToastProvider>{children}</ToastProvider>
          </DataProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
