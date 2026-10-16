"use client";

import { useEffect, useState } from "react";
import { IconeLune, IconeSoleil } from "./Icones";

type Theme = "light" | "dark";

function themeActuel(): Theme {
  const choisi = document.documentElement.dataset.theme;
  if (choisi === "light" || choisi === "dark") return choisi;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Bascule clair / sombre. Sans choix enregistré, le site suit le réglage de l'appareil.
export function ChoixTheme({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(themeActuel());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const suivre = () => setTheme(themeActuel());
    media.addEventListener("change", suivre);
    return () => media.removeEventListener("change", suivre);
  }, []);

  function basculer() {
    const suivant: Theme = themeActuel() === "dark" ? "light" : "dark";
    const racine = document.documentElement;
    racine.classList.add("sans-transition");
    racine.dataset.theme = suivant;
    try {
      localStorage.setItem("theme", suivant);
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour cette page seulement
    }
    requestAnimationFrame(() => requestAnimationFrame(() => racine.classList.remove("sans-transition")));
    setTheme(suivant);
  }

  const sombre = theme === "dark";
  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={sombre ? "Passer en mode clair" : "Passer en mode sombre"}
      title={sombre ? "Mode clair" : "Mode sombre"}
      className={`grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-150 ${className}`}
    >
      {/* Avant l'hydratation, l'icône suit le thème par la feuille de style */}
      <IconeLune className={`size-5 ${theme === null ? "dark-cache" : sombre ? "hidden" : ""}`} />
      <IconeSoleil className={`size-5 ${theme === null ? "clair-cache" : sombre ? "" : "hidden"}`} />
    </button>
  );
}
