import type * as React from "react";
import { LoadingImage } from "@/components/LoadingImage";

export interface ItemImageProps {
  imageFileName?: string;
  className?: string;
}

export const ItemImage = ({ imageFileName, className }: ItemImageProps) => {
  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  };
  const showFallback = (event: React.SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.src = "/images/item/pokedex.png";
  };
  return (
    <div className={className}>
      <LoadingImage src={`/images/item/${imageFileName}`} alt={imageFileName} style={style} onError={showFallback} />
    </div>
  );
};
