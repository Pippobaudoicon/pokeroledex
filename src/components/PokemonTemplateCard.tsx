import type * as React from "react";
import type { PokemonType } from "@/api/schemas";
import { Box } from "@/components/Box";
import { PokemonImage } from "@/components/PokemonImage";
import { Text } from "@/components/Text";
import { TypeBadge } from "@/components/TypeBadge";
import { cn } from "@/lib/utils";

export interface PokemonTemplateCardProps {
  name: string;
  number: number | string;
  types: PokemonType[];
  image?: string | null;
  className?: string;
  numberClassName?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export const PokemonTemplateCard = ({
  name,
  number,
  types,
  image,
  className,
  numberClassName,
  onClick,
}: PokemonTemplateCardProps) => (
  <Box
    color={`bg-type-${types[0].toLowerCase()}`}
    className={`pokemon-card ${className} flex flex-col space-y-2 p-3 bg-gradient-to-br from-type-${types[0].toLowerCase()}-light justify-between ${onClick != null ? `hover:bg-type-${types[0].toLowerCase()}/80` : ""}`}
    onClick={onClick}
  >
    <div className="flex flex-row justify-between">
      <Text size="text-xl" color="text-white">
        {name}
      </Text>
      <Text
        size="text-xl"
        color="text-white"
        className={cn("opacity-50", numberClassName)}
      >{`#${number}`}</Text>
    </div>
    <div className="flex flex-row space-x-2 justify-between">
      <div className="flex flex-col items-center justify-end space-y-1">
        {types.map((type) => (
          <TypeBadge
            key={type}
            type={type}
            size="sm"
            className="w-full"
            textClassName="md:hidden xl:block max-xs:hidden"
          />
        ))}
      </div>
      <PokemonImage imageFileName={image} type="book" className="w-20 h-20" />
    </div>
  </Box>
);
