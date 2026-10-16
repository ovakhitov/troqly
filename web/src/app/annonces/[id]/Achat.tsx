"use client";

import { useState } from "react";
import { formaterPrix } from "@/lib/annonces";
import { calculerFrais, EXPLICATION_FRAIS, type Bareme } from "@/lib/frais";

export type Tarif = {
  id: number;
  libelle: string;
  mode: "domicile" | "point_relais";
  prix_centimes: number;
  delai: string;
};

type Props = {
  action: (formData: FormData) => void;
  prixCentimes: number;
  // Offre acceptée encore valable : l'achat se fait à ce prix
  offre: { id: number; prix: number; jusquAu: string } | null;
  mainPropre: boolean;
  tarifs: Tarif[];
  // Barème transmis par le serveur : le navigateur calcule avec les mêmes chiffres que Stripe
  bareme: Bareme;
};

const champ =
  "w-full rounded-champ border border-ligne bg-surface px-3 py-2.5 text-sm text-prune-nuit outline-none focus:border-prune";

export function Achat({ action, prixCentimes, offre, mainPropre, tarifs, bareme }: Props) {
  const [mode, setMode] = useState<"main_propre" | "livraison">(mainPropre ? "main_propre" : "livraison");
  const [idTarif, setIdTarif] = useState<number | null>(tarifs[0]?.id ?? null);

  const prix = offre?.prix ?? prixCentimes;
  const tarif = mode === "livraison" ? tarifs.find((t) => t.id === idTarif) : undefined;
  const montants = calculerFrais(prix, tarif?.prix_centimes ?? 0, bareme);

  return (
    <form action={action} className="grid gap-3 rounded-photo bg-ivoire p-4">
      {offre && <input type="hidden" name="offre" value={offre.id} />}

      {mainPropre && tarifs.length > 0 ? (
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-sm font-semibold text-prune-nuit">Remise</legend>
          <label className="flex items-center gap-2 text-sm text-prune-nuit">
            <input type="radio" name="mode" value="main_propre" checked={mode === "main_propre"} onChange={() => setMode("main_propre")} className="size-4 accent-[var(--action)]" />
            En main propre (gratuit)
          </label>
          <label className="flex items-center gap-2 text-sm text-prune-nuit">
            <input type="radio" name="mode" value="livraison" checked={mode === "livraison"} onChange={() => setMode("livraison")} className="size-4 accent-[var(--action)]" />
            Livraison
          </label>
        </fieldset>
      ) : (
        <input type="hidden" name="mode" value={mode} />
      )}

      {mode === "livraison" && (
        <div className="grid gap-2">
          <label htmlFor="tarif" className="text-sm font-semibold text-prune-nuit">
            Transporteur
          </label>
          <select id="tarif" name="tarif" value={idTarif ?? ""} onChange={(e) => setIdTarif(Number(e.target.value))} className={champ}>
            {tarifs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.libelle} · {t.mode === "point_relais" ? "point relais" : "à domicile"} · {t.delai} · {formaterPrix(t.prix_centimes)}
              </option>
            ))}
          </select>
          {tarif?.mode === "point_relais" ? (
            <div className="grid gap-1">
              <label htmlFor="pointRelais" className="text-sm font-semibold text-prune-nuit">
                Point relais choisi
              </label>
              <textarea
                id="pointRelais"
                name="pointRelais"
                required
                maxLength={300}
                rows={2}
                placeholder="Nom et adresse du point relais"
                className={champ}
              />
              <p className="text-xs text-mauve">
                Trouvez un point près de chez vous sur le site du transporteur, puis recopiez exactement son nom, son adresse et
                son code postal : le vendeur enverra le colis à ce point.
              </p>
            </div>
          ) : (
            <p className="text-xs text-mauve">Votre adresse de livraison vous sera demandée sur la page de paiement.</p>
          )}
        </div>
      )}

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm text-prune-nuit tabular-nums">
        <dt>{offre ? "Prix négocié de l'article" : "Prix de l'article"}</dt>
        <dd className="text-right">{formaterPrix(montants.prixCentimes)}</dd>
        <dt>Frais de service Troqly</dt>
        <dd className="text-right">{formaterPrix(montants.fraisServiceCentimes)}</dd>
        <dt>Livraison</dt>
        <dd className="text-right">{mode === "livraison" ? formaterPrix(montants.livraisonCentimes) : "Main propre, gratuite"}</dd>
        <dt className="font-semibold tracking-[-0.02em]">Total à payer</dt>
        <dd className="text-right font-semibold tracking-[-0.02em]">{formaterPrix(montants.totalCentimes)}</dd>
      </dl>

      <button
        type="submit"
        className="bouton w-full"
      >
        {offre ? `Acheter à ${formaterPrix(prix)}` : "Acheter"}
      </button>
      <p className="text-xs text-mauve">{EXPLICATION_FRAIS}</p>
      <p className="text-xs text-mauve">
        Paiement par carte via Stripe. Le vendeur n&apos;est payé qu&apos;après la remise ou la réception de l&apos;objet.
        {offre && ` Prix négocié valable jusqu'au ${new Date(offre.jusquAu).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" })}.`}
      </p>
    </form>
  );
}
