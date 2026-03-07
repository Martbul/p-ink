import type { Metadata } from "next";
import { Cormorant_Garamond, Instrument_Sans, Syne } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { UserProvider } from "@/providers/UserProvider";
import { TamagotchiProvider } from "@/providers/TamagotchiProvider";
import "../styles/globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "P-ink",
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
    <html
      lang="en"
      className={`${cormorant.variable} ${syne.variable} ${instrument.variable}`}
    >
      <body className="font-body antialiased bg-cream text-ink font-[400] selection:bg-rose/20 selection:text-deep">
        <ClerkProvider>
          <UserProvider>
            <TamagotchiProvider>
              {children}
            </TamagotchiProvider>
          </UserProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}