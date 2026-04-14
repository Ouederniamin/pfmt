import type { Metadata } from "next";
import { Source_Serif_4, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import "./globals.css";

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "OncoLearn FMT — Faculté de Médecine de Tunis",
  description:
    "Plateforme pédagogique en oncologie gynécologique et mammaire — Faculté de Médecine de Tunis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${serif.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
          <ClerkProvider localization={frFR}>{children}</ClerkProvider>
        </body>
    </html>
  );
}
