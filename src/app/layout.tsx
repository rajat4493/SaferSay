import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import { BrandProvider } from "@/components/BrandProvider";
import { DataProvider } from "@/components/DataProvider";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

// SaferSay UI Design System v1 §2: Inter for all UI (nav, buttons,
// labels, body), DM Serif Display ONLY for H1s and emotionally-weighted
// moments (survey question text, "You spoke, we heard"). Never used for
// section/card titles -- the contrast between the two is deliberate.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
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
      className={`${inter.variable} ${dmSerifDisplay.variable} h-full antialiased`}
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
