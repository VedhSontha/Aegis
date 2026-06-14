import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "../components/SmoothScroll";
import CustomCursor from "../components/CustomCursor";
import IntroLoader from "../components/IntroLoader";

// Distinctive display grotesque (replaces the generic Space Grotesk) — gives the
// headings real character while staying refined for a dark security tool.
const displaySans = Bricolage_Grotesque({
  variable: "--font-sans-custom",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono-custom",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "AEGIS — Scan. Prove. Patch. Re-grade.",
  description:
    "AEGIS scans live web URLs and GitHub repositories for security gaps, proves exploits visually, and generates tailored middleware patches to harden your apps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displaySans.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <IntroLoader />
        <CustomCursor />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
