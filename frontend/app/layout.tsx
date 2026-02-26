import type { Metadata } from "next";
import { Cormorant_Garamond, Instrument_Sans } from "next/font/google";
import "../styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  // Instrument Sans supports variable weights 400-700
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "p-ink — Stay close across any distance",
  description:
    "A shared e-ink frame that keeps long-distance couples connected through daily prompts and photos.",
  openGraph: {
    title: "p-ink",
    description: "Stay close across any distance.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${instrument.variable}`}>
      <body className="font-body antialiased bg-cream text-ink font-[400] selection:bg-rose/20 selection:text-deep">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
