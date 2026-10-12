import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";

// General Sans provient du template Gency (gency/fonts)
const generalSans = localFont({
  src: [
    { path: "./fonts/GeneralSans-500.woff2", weight: "500" },
    { path: "./fonts/GeneralSans-600.woff2", weight: "600" },
  ],
  variable: "--ff-general",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--ff-inter",
  display: "swap",
});

// Chaque page dépend de la session ou de la base : rien n'est pré-généré à la construction,
// qui n'a donc besoin d'aucune clé Supabase
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Troqly | Achetez et vendez près de chez vous",
  description:
    "Petites annonces entre particuliers en France : remise en main propre ou livraison, paiement sécurisé.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${generalSans.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
