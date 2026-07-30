import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BrandProvider } from "@/components/BrandProvider";
import { DataProvider } from "@/components/DataProvider";
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
  title: "SaferSay — Confidential Employee Surveys",
  description:
    "A self-serve confidential employee survey product for small HR and startup teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BrandProvider>
          <DataProvider>{children}</DataProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
