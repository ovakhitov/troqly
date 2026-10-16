import { EnTete } from "./EnTete";
import { PiedDePage } from "./PiedDePage";

// Mise en page des pages de compte et des formulaires : titre en tête, contenu sur une surface unie
export function CadreCompte({
  titre,
  intro,
  large = false,
  children,
}: {
  titre: string;
  intro?: string;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <EnTete />
      <main
        id="contenu"
        className={`mx-auto grid w-full flex-1 content-start gap-7 px-4 pt-10 pb-24 sm:pt-14 ${large ? "max-w-2xl" : "max-w-md"}`}
      >
        <div className="grid gap-2">
          <h1 className="font-titre text-[2rem] leading-tight font-semibold tracking-tight text-balance text-prune-nuit sm:text-[2.5rem]">
            {titre}
          </h1>
          {intro && <p className="text-lg text-mauve">{intro}</p>}
        </div>
        <div className="grid gap-5 carte p-5 sm:p-7">{children}</div>
      </main>
      <PiedDePage />
    </div>
  );
}
