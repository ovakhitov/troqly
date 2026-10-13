import type { CSSProperties, ReactNode } from "react";

// Bordure néon des annonces boostées, d'après le composant Neon Border d'Originkit :
// une lumière fait le tour du cadre, avec des halos derrière et un trait net devant (styles dans globals.css).
// « depart » décale la lumière, pour que des cartes voisines ne tournent pas en même temps.
export function BordureNeon({ children, depart = 0 }: { children: ReactNode; depart?: number }) {
  const lumiere = <span className="neon-lumiere" />;
  return (
    <div className="neon" style={{ "--neon-depart": `-${depart}s` } as CSSProperties}>
      <span className="neon-halo neon-halo-large" aria-hidden="true">
        <span className="neon-anneau">{lumiere}</span>
      </span>
      <span className="neon-halo" aria-hidden="true">
        <span className="neon-anneau">{lumiere}</span>
      </span>
      {children}
      <span className="neon-anneau" aria-hidden="true">
        {lumiere}
      </span>
    </div>
  );
}
