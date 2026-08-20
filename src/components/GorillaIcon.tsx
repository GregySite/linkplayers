interface GorillaIconProps {
  className?: string;
}

/**
 * Icône gorille dessinée au trait, dans le style des icônes Lucide utilisées
 * ailleurs dans le menu (contour seul, épaisseur 2, extrémités arrondies).
 * Lucide ne fournit pas de gorille, d'où cette icône maison.
 */
export const GorillaIcon = ({ className }: GorillaIconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Oreilles */}
    <circle cx="4.5" cy="9" r="2" />
    <circle cx="19.5" cy="9" r="2" />
    {/* Tête */}
    <path d="M6.5 9a5.5 5.5 0 0 1 11 0v3a5.5 5.5 0 0 1-11 0z" />
    {/* Arcade sourcilière */}
    <path d="M8.5 9.5h2M13.5 9.5h2" />
    {/* Museau */}
    <path d="M9 14.5a3 3 0 0 0 6 0" />
    <path d="M11 12.5h2" />
  </svg>
);
