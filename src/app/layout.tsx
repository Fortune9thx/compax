import type { Metadata } from "next";
import { Archivo, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  style: ["normal", "italic"],
  weight: "400",
  subsets: ["latin"],
});

const TITLE = "Compax — The Adjudication Layer for Autonomous Capital";
const DESCRIPTION =
  "Multi-party capital is locked under natural-language mandates. GenLayer validators evaluate live web evidence and submitted proof, reaching consensus to release, claw back, or reallocate funds — with full reasoning and a native appeal path onchain.";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://compax-sepia.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Compax",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable} h-full dark`}
    >
      <body className="min-h-full bg-bg-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
