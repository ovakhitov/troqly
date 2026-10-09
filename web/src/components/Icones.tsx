// Icônes au trait, dans l'esprit des pictos du template Gency

type Props = { className?: string };

export function LogoTroqly({ className }: Props) {
  return (
    <svg viewBox="0 0 26 26" className={className} aria-hidden="true">
      <path
        d="M8 7.5a5.5 5.5 0 1 0 0 11h10a5.5 5.5 0 1 0 0-11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M15.5 4.5l3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconeLoupe({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconeCoeur({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M8 13.5S2 10 2 6a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 7.5-6 7.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function IconeFleche({ className }: Props) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M5 11L11 5M6 5h5v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconeBouclier({ className }: Props) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path
        d="M10 2.5l6 2.2v4.6c0 3.9-2.6 6.6-6 8.2-3.4-1.6-6-4.3-6-8.2V4.7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7.2 10l2 2 3.8-3.9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconeMains({ className }: Props) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <circle cx="6.5" cy="6" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="13.5" cy="6" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 16c.4-2.6 2-4 4-4s3 1 3.5 2c.5-1 1.5-2 3.5-2s3.6 1.4 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconeColis({ className }: Props) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M3 6.5L10 3l7 3.5v7L10 17l-7-3.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3 6.5L10 10l7-3.5M10 10v7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function IconePourcent({ className }: Props) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path d="M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="6" cy="6" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="14" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
