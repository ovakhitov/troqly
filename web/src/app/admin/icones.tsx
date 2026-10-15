// Pictos au trait de l'administration (24 × 24, trait 1,8)

type Props = { className?: string };

function Trait({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconeApercu(p: Props) {
  return (
    <Trait {...p}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
    </Trait>
  );
}

export function IconeEuro(p: Props) {
  return (
    <Trait {...p}>
      <path d="M17 6.5a6.5 6.5 0 1 0 0 11" />
      <path d="M5 10.5h8M5 13.5h8" />
    </Trait>
  );
}

export function IconeComptes(p: Props) {
  return (
    <Trait {...p}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
      <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.6c1.6.6 2.7 2.1 3 4.4" />
    </Trait>
  );
}

export function IconeEtiquette(p: Props) {
  return (
    <Trait {...p}>
      <path d="M3.8 12.6V5.2c0-.8.6-1.4 1.4-1.4h7.4l7.6 7.6a1.4 1.4 0 0 1 0 2l-6.4 6.4a1.4 1.4 0 0 1-2 0z" />
      <circle cx="8.3" cy="8.3" r="1.3" />
    </Trait>
  );
}

export function IconeBouclier(p: Props) {
  return (
    <Trait {...p}>
      <path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </Trait>
  );
}

export function IconeJournal(p: Props) {
  return (
    <Trait {...p}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </Trait>
  );
}

export function IconeRetour(p: Props) {
  return (
    <Trait {...p}>
      <path d="M10 6 4 12l6 6" />
      <path d="M4 12h11a5 5 0 0 1 5 5v1" />
    </Trait>
  );
}
