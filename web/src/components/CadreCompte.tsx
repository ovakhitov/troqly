import { EnTete } from "./EnTete";

// Mise en page des pages de compte : une carte centrée sur le halo de marque
export function CadreCompte({
  titre,
  intro,
  children,
}: {
  titre: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="halo min-h-screen">
      <EnTete />
      <main className="mx-auto grid max-w-md gap-6 px-4 pt-10 pb-20">
        <div className="grid gap-2">
          <h1 className="font-titre text-3xl font-semibold tracking-tight text-balance text-prune-nuit">{titre}</h1>
          {intro && <p className="text-mauve">{intro}</p>}
        </div>
        <div className="grid gap-5 rounded-carte border border-ligne bg-surface p-6">{children}</div>
      </main>
    </div>
  );
}
