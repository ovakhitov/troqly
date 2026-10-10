import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EnTete } from "@/components/EnTete";
import { formaterDateRelative, urlPhoto } from "@/lib/annonces";
import { creerClientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Messages | Troqly" };

type Conversation = {
  id: string;
  acheteur: string;
  vendeur: string;
  dernier_message_le: string;
  annonces: { id: string; titre: string; photos_annonces: { chemin: string; position: number }[] } | null;
  acheteur_profil: { pseudo: string } | null;
  vendeur_profil: { pseudo: string } | null;
};

export default async function PageMessages() {
  const supabase = await creerClientServeur();
  const { data: session } = await supabase.auth.getClaims();
  const moi = session?.claims?.sub;
  if (!moi) redirect("/connexion?suivant=/messages");

  const { data } = await supabase
    .from("conversations")
    .select(
      "id, acheteur, vendeur, dernier_message_le, annonces(id, titre, photos_annonces(chemin, position)), acheteur_profil:profils!conversations_acheteur_fkey(pseudo), vendeur_profil:profils!conversations_vendeur_fkey(pseudo)",
    )
    .order("dernier_message_le", { ascending: false })
    .limit(100);
  const conversations = (data ?? []) as unknown as Conversation[];

  // Aperçu du dernier message, et non-lus comptés sur tous les messages reçus non lus
  const ids = conversations.map((c) => c.id);
  const [{ data: recents }, { data: nonLus }] = ids.length
    ? await Promise.all([
        supabase
          .from("messages")
          .select("conversation, auteur, contenu")
          .in("conversation", ids)
          .order("cree_le", { ascending: false })
          .limit(300),
        supabase.from("messages").select("conversation").in("conversation", ids).neq("auteur", moi).is("lu_le", null),
      ])
    : [{ data: [] }, { data: [] }];

  const apercus = new Map<string, { contenu: string; deMoi: boolean; nonLus: number }>();
  for (const m of recents ?? []) {
    if (!apercus.has(m.conversation)) apercus.set(m.conversation, { contenu: m.contenu, deMoi: m.auteur === moi, nonLus: 0 });
  }
  for (const m of nonLus ?? []) {
    const a = apercus.get(m.conversation);
    if (a) a.nonLus++;
  }

  return (
    <div className="halo min-h-screen">
      <EnTete />
      <main className="mx-auto grid max-w-3xl gap-6 px-4 pt-8 pb-20">
        <h1 className="font-titre text-3xl font-semibold tracking-tight text-prune-nuit">Messages</h1>

        {conversations.length === 0 ? (
          <div className="grid justify-items-start gap-3 rounded-carte border border-ligne bg-surface p-8">
            <p className="font-titre text-lg font-semibold text-prune-nuit">Aucune conversation pour l&apos;instant.</p>
            <p className="text-mauve">Pour écrire à un vendeur, ouvrez une annonce et cliquez sur « Contacter le vendeur ».</p>
            <Link href="/annonces" className="font-semibold text-prune hover:underline">
              Parcourir les annonces
            </Link>
          </div>
        ) : (
          <ul className="grid overflow-hidden rounded-carte border border-ligne bg-surface">
            {conversations.map((c) => {
              const autre = c.acheteur === moi ? c.vendeur_profil?.pseudo : c.acheteur_profil?.pseudo;
              const apercu = apercus.get(c.id);
              const photo = [...(c.annonces?.photos_annonces ?? [])].sort((a, b) => a.position - b.position)[0];
              return (
                <li key={c.id} className="border-b border-ligne last:border-b-0">
                  <Link href={`/messages/${c.id}`} className="flex items-center gap-4 p-4 transition-colors duration-200 hover:bg-ivoire">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-ivoire">
                      {photo && <Image src={urlPhoto(photo.chemin)} alt="" fill sizes="56px" className="object-cover" />}
                    </span>
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate font-titre font-semibold text-prune-nuit">{autre ?? "Membre"}</span>
                        <span className="shrink-0 text-xs text-mauve">{formaterDateRelative(c.dernier_message_le)}</span>
                      </span>
                      <span className="truncate text-sm text-mauve">{c.annonces?.titre ?? "Annonce indisponible"}</span>
                      {apercu && (
                        <span className={`truncate text-sm ${apercu.nonLus ? "font-semibold text-prune-nuit" : "text-mauve"}`}>
                          {apercu.deMoi ? "Vous : " : ""}
                          {apercu.contenu}
                        </span>
                      )}
                    </span>
                    {apercu?.nonLus ? (
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-action text-xs font-semibold text-sur-action">
                        <span className="sr-only">Non lus : </span>
                        {apercu.nonLus}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
