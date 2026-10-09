import type * as React from "react";
import { LoadingImage } from "@/components/LoadingImage";

export interface PokemonImageProps {
  /** File name under /images/pokemon/<Type>Sprites/, or an absolute path/URL. */
  imageFileName?: string | null;
  /** Sprite set (BoxSprites or BookSprites). */
  type: "box" | "book";
  className?: string;
}

export const PokemonImage = ({ imageFileName, type, className }: PokemonImageProps) => {
  const style: React.CSSProperties =
    type === "box"
      ? {
          imageRendering: "pixelated",
          width: "100%",
          height: "100%",
          transform: "scale(1.6)",
          transformOrigin: "bottom",
        }
      : {
          width: "100%",
          height: "100%",
          objectFit: "contain",
          aspectRatio: "1 / 1",
        };
  const src = ((fileName: string | null | undefined) => {
    if (!fileName) return "";
    const trimmed = fileName.trim();
    return /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")
      ? trimmed
      : `/images/pokemon/${capitalizeFirst(type) + "Sprites"}/${trimmed}`;
  })(imageFileName);
  return (
    <div className={className}>
      <LoadingImage src={src} alt={imageFileName ?? ""} style={style} />
    </div>
  );
};
function capitalizeFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
