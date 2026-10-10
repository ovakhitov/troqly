import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EnTete } from "@/components/EnTete";
import { formaterPrix } from "@/lib/annonces";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { bloquerMembre } from "../actions";
import { Envoi } from "./Envoi";

export const metadata: Metadata = { title: "Conversation | Troqly" };

type Conversation = {
  id: string;
  acheteur: string;
  vendeur: string;
  annonces: { id: string; titre: string; prix_centimes: number; statut: string } | null;
  acheteur_profil: { pseudo: string } | null;
  vendeur_profil: { pseudo: string } | null;
};

const heure = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

export default async function PageConversation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await creerClientServeur();
  const { data: session } = await supabase.auth.getClaims();
  const moi = session?.claims?.sub;
  if (!moi) redirect(`/connexion?suivant=/messages/${id}`);

  const { data } = await supabase
    .from("conversations")
    .select(
      "id, acheteur, vendeur, annonces(id, titre, prix_centimes, statut), acheteur_profil:profils!conversations_acheteur_fkey(pseudo), vendeur_profil:profils!conversations_vendeur_fkey(pseudo)",
    )
    .eq("id", id)
    .maybeSingle();
  const conversation = data as unknown as Conversation | null;
  if (!conversation) notFound();

  const idAutre = conversation.acheteur === moi ? conversation.vendeur : conversation.acheteur;
  const pseudoAutre =
    (conversation.acheteur === moi ? conversation.vendeur_profil?.pseudo : conversation.acheteur_profil?.pseudo) ?? "Membre";

  const [{ data: messages }, { data: blocage }] = await Promise.all([
    supabase.from("messages").select("id, auteur, contenu, cree_le").eq("conversation", id).order("cree_le").limit(300),
    supabase.from("blocages").select("bloque").eq("bloqueur", moi).eq("bloque", idAutre).maybeSingle(),
    supabase.rpc("marquer_lu", { id_conversation: id }),
  ]);

  return (
    <div className="halo min-h-screen">
      <EnTete />
      <main className="mx-auto grid max-w-3xl gap-4 px-4 pt-8 pb-20">
        <Link href="/messages" className="text-sm font-semibold text-prune hover:underline">
          Toutes les conversations
        </Link>

        <header className="flex flex-wrap items-center justify-between gap-3 rounded-carte border border-ligne bg-surface p-4">
          <div className="grid min-w-0 gap-0.5">
            <h1 className="font-titre text-xl font-semibold text-prune-nuit">{pseudoAutre}</h1>
            {conversation.annonces ? (
              <Link href={`/annonces/${conversation.annonces.id}`} className="truncate text-sm text-mauve hover:text-prune-nuit">
                {conversation.annonces.titre} · {formaterPrix(conversation.annonces.prix_centimes)}
              </Link>
            ) : (
              <span className="text-sm text-mauve">Annonce indisponible</span>
            )}
          </div>
          <form action={bloquerMembre.bind(null, idAutre, id, !blocage)}>
            <button type="submit" className="text-sm font-semibold text-mauve hover:text-prune-nuit hover:underline">
              {blocage ? `Débloquer ${pseudoAutre}` : `Bloquer ${pseudoAutre}`}
            </button>
          </form>
        </header>

        <ol className="grid gap-2 rounded-carte border border-ligne bg-surface p-4" aria-label="Messages">
          {(messages ?? []).length === 0 && (
            <li className="text-sm text-mauve">Présentez-vous et posez vos questions sur l&apos;objet.</li>
          )}
          {(messages ?? []).map((m) => {
            const deMoi = m.auteur === moi;
            return (
              <li key={m.id} className={`grid max-w-[85%] gap-1 ${deMoi ? "justify-self-end text-right" : "justify-self-start"}`}>
                <p
                  className={`rounded-2xl px-4 py-2.5 text-left whitespace-pre-line ${
                    deMoi ? "rounded-br-md bg-action text-sur-action" : "rounded-bl-md bg-ivoire text-prune-nuit"
                  }`}
                >
                  <span className="sr-only">{deMoi ? "Vous : " : `${pseudoAutre} : `}</span>
                  {m.contenu}
                </p>
                <time dateTime={m.cree_le} className="text-xs text-mauve">
                  {heure.format(new Date(m.cree_le))}
                </time>
              </li>
            );
          })}
        </ol>

        <Envoi
          idConversation={id}
          desactive={blocage ? `Vous avez bloqué ${pseudoAutre}. Débloquez ce membre pour lui écrire.` : undefined}
        />
      </main>
    </div>
  );
}
