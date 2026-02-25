import type { Metadata } from "next";
import { Cormorant_Garamond, Instrument_Sans } from "next/font/google";
import "../styles/globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "loveframe — Stay close across any distance",
  description:
    "A shared e-ink frame that keeps long-distance couples connected through daily prompts and photos.",
  openGraph: {
    title: "loveframe",
    description: "Stay close across any distance.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${instrument.variable}`}>
      <body className="font-body antialiased bg-cream">{children}</body>
    </html>
  );
}
