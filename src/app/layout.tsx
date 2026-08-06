import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { BrandProvider } from "@/components/BrandProvider";
import { DataProvider } from "@/components/DataProvider";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

// Design system (docs/strategy/SAFERSAY_DESIGN_SYSTEM.md §1): Inter for
// body/UI, Bricolage Grotesque for display -- headings, big numbers, the
// wordmark, used with restraint.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "700"],
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
      className={`${inter.variable} ${bricolage.variable} h-full antialiased`}
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
