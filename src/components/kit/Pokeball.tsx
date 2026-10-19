/** Line-drawn Pokéball: the brand mark, watermarks and empty states. */
export const Pokeball = ({ className, strokeWidth = 6 }: { className?: string; strokeWidth?: number }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true" className={className}>
    <circle cx="50" cy="50" r="44" />
    <path d="M6 50h30M64 50h30" />
    <circle cx="50" cy="50" r="14" />
  </svg>
);
