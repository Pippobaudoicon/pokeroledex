import { Rank } from "@/api/schemas";
import { LoadingImage } from "@/components/LoadingImage";
import { cn } from "@/lib/utils";

export interface RankIconProps {
  rank: Rank;
  size: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const RankIcon = ({ rank, size, className }: RankIconProps) => {
  const imageOf = (value: Rank) => {
    switch (value) {
      case Rank.UNRANKED:
        return "/WhiteBall.png";
      case Rank.STARTER:
        return "/WhiteBall.png";
      case Rank.ROOKIE:
        return "/PokeBall.png";
      case Rank.STANDARD:
        return "/GreatBall.png";
      case Rank.EXPERT:
        return "/ExpertBall.png";
      case Rank.ADVANCED:
        return "/UltraBall.png";
      case Rank.ACE:
        return "/CherishBall.png";
      case Rank.MASTER:
        return "/MasterBall.png";
      case Rank.CHAMPION:
        return "/ChampionBall.png";
      default:
        throw new Error("Invalid rank");
    }
  };
  const sizeClassNames = {
    xs: "max-w-2 max-h-2",
    sm: "max-w-4 max-h-4",
    md: "max-w-8 max-h-8",
    lg: "max-w-16 max-h-16",
    xl: "max-w-32 max-h-32",
  };
  return (
    <LoadingImage
      src={`/images/rank/${imageOf(rank)}`}
      alt="Rank"
      className={cn(sizeClassNames[size], className)}
    />
  );
};
