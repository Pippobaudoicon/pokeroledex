import type * as T from "../../../shared/types";
import { cn, formatEnumName } from "@/lib/utils";

// Type colours that need white text for 4.5:1; the rest take dark text.
const WHITE_TEXT = new Set(["DARK", "DRAGON", "FIGHTING", "GHOST", "POISON", "TYPELESS", "VARIES"]);

const typeBg: Record<T.MoveType, string> = {
  BUG: "bg-type-bug",
  DARK: "bg-type-dark",
  DRAGON: "bg-type-dragon",
  ELECTRIC: "bg-type-electric",
  FAIRY: "bg-type-fairy",
  FIGHTING: "bg-type-fighting",
  FIRE: "bg-type-fire",
  FLYING: "bg-type-flying",
  GHOST: "bg-type-ghost",
  GRASS: "bg-type-grass",
  GROUND: "bg-type-ground",
  ICE: "bg-type-ice",
  NORMAL: "bg-type-normal",
  POISON: "bg-type-poison",
  PSYCHIC: "bg-type-psychic",
  ROCK: "bg-type-rock",
  STEEL: "bg-type-steel",
  WATER: "bg-type-water",
  TYPELESS: "bg-[#666]",
  VARIES: "bg-[#666]",
};

/** Text colour that reads on a type's colour. */
export const typeText = (type: T.MoveType) => (WHITE_TEXT.has(type) ? "text-white" : "text-label");

/** CSS colour of a type, for gradients and tints. */
export const typeColor = (type: T.MoveType) => `var(--color-type-${type === "VARIES" ? "typeless" : type.toLowerCase()})`;

export const TypeIcon = ({ type, className }: { type: T.MoveType; className?: string }) =>
  type === "VARIES" ? null : (
    <img
      src={`/images/type/${(type === "TYPELESS" ? "normal" : type).toLowerCase()}.svg`}
      alt=""
      className={cn("size-3.5 shrink-0", !WHITE_TEXT.has(type) && "invert", className)}
    />
  );

export const TypePill = ({ type, size = "md", className }: { type: T.MoveType; size?: "sm" | "md"; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide",
      size === "md" ? "h-6 pl-1.5 pr-2.5 text-footnote" : "h-5 pl-1 pr-2 text-caption",
      typeBg[type],
      WHITE_TEXT.has(type) ? "text-white" : "text-label",
      className,
    )}
  >
    <TypeIcon type={type} className={size === "sm" ? "size-3" : undefined} />
    {formatEnumName(type)}
  </span>
);

/** Round type badge with only the icon, for dense rows. */
export const TypeDot = ({ type, className }: { type: T.MoveType; className?: string }) => (
  <span title={formatEnumName(type)} className={cn("inline-grid size-6 shrink-0 place-items-center rounded-full", typeBg[type], className)}>
    <TypeIcon type={type} />
    <span className="sr-only">{formatEnumName(type)}</span>
  </span>
);

const rankBall: Record<T.Rank, string> = {
  UNRANKED: "WhiteBall",
  STARTER: "WhiteBall",
  ROOKIE: "PokeBall",
  STANDARD: "GreatBall",
  ADVANCED: "UltraBall",
  EXPERT: "ExpertBall",
  ACE: "CherishBall",
  MASTER: "MasterBall",
  CHAMPION: "ChampionBall",
};

export const RankBall = ({ rank, className }: { rank: T.Rank; className?: string }) => (
  <img src={`/images/rank/${rankBall[rank]}.png`} alt="" width={16} height={16} className={cn("size-4 shrink-0 object-contain", className)} />
);

export const RankBadge = ({ rank, className }: { rank: T.Rank; className?: string }) => (
  <span className={cn("inline-flex items-center gap-1.5 text-subhead font-medium text-label-2", className)}>
    <RankBall rank={rank} />
    {formatEnumName(rank)}
  </span>
);
