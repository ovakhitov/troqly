"use client";

import Image from "next/image";
import { useState } from "react";

export function Galerie({ photos, titre }: { photos: string[]; titre: string }) {
  const [active, setActive] = useState(0);

  if (!photos.length) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-carte border border-ligne bg-surface text-mauve">Sans photo</div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-carte border border-ligne bg-surface">
        <Image
          src={photos[active]}
          alt={`${titre}, photo ${active + 1} sur ${photos.length}`}
          fill
          sizes="(min-width: 1024px) 640px, 100vw"
          className="object-contain"
          priority
        />
      </div>
      {photos.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <li key={p} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Voir la photo ${i + 1}`}
                aria-current={i === active}
                className={`relative block size-16 overflow-hidden rounded-xl border-2 transition-colors duration-200 ${
                  i === active ? "border-prune" : "border-transparent"
                }`}
              >
                <Image src={p} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
