import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { DESCRIPTION_SITE, NOM_SITE, URL_SITE } from "@/lib/site";
import "./globals.css";

// General Sans provient du template Gency (gency/fonts) ; le texte courant utilise la police du système
const generalSans = localFont({
  src: [
    { path: "./fonts/GeneralSans-500.woff2", weight: "500" },
    { path: "./fonts/GeneralSans-600.woff2", weight: "600" },
  ],
  variable: "--ff-general",
  display: "swap",
});

// Chaque page dépend de la session ou de la base : rien n'est pré-généré à la construction,
// qui n'a donc besoin d'aucune clé Supabase
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: {
    default: "Troqly | Petites annonces entre particuliers, près de chez vous",
    template: "%s | Troqly",
  },
  description: DESCRIPTION_SITE,
  applicationName: NOM_SITE,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: NOM_SITE,
    locale: "fr_FR",
    url: "/",
    title: "Troqly | Petites annonces entre particuliers",
    description: DESCRIPTION_SITE,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f0f3" },
    { media: "(prefers-color-scheme: dark)", color: "#141016" },
  ],
  colorScheme: "light dark",
};

// Applique le thème choisi avant le premier affichage, pour éviter un éclair de la mauvaise couleur
const scriptTheme = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTheme }} />
      </head>
      {/* Sur téléphone, la marge du bas laisse la place à la barre d'onglets */}
      <body className={`${generalSans.variable} pb-[calc(4rem+env(safe-area-inset-bottom,0px))] font-sans antialiased sm:pb-0`}>
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-champ focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold"
        >
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
