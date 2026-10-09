import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useHover } from "@uidotdev/usehooks";
import * as React from "react";
import type * as T from "../../../shared/types";
import { usePokemonTemplatesControllerFindMany } from "@/api/components";
import { EvolutionDirection } from "@/api/schemas";
import { Box } from "@/components/Box";
import { usePokemon } from "@/components/pokemon-sheet/context";
import { PokemonImage } from "@/components/PokemonImage";
import { Text } from "@/components/Text";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { capitalize } from "@/lib/utils";
export const EvolutionDialog = ({ trigger }: { trigger: React.ReactNode }) => {
  const { updatedPokemon, updatePokemon } = usePokemon();
  const { data: templates } = usePokemonTemplatesControllerFindMany({
    pathParams: {
      ids: updatedPokemon?.pokemonTemplate.evolutions.map((evolution) => evolution.targetId) ?? [],
    },
  });
  const [open, setOpen] = React.useState(false);
  const evolve = (evolution: T.Evolution) => {
    const template = templates?.find((candidate) => candidate.id === evolution.targetId);
    if (template != null) {
      updatePokemon({
        pokemonTemplate: template,
      });
      setOpen(false);
    }
  };
  const evolvesFrom =
    updatedPokemon?.pokemonTemplate.evolutions.filter(
      (evolution) => evolution.type === EvolutionDirection.FROM,
    ) ?? [];
  const evolvesTo =
    updatedPokemon?.pokemonTemplate.evolutions.filter(
      (evolution) => evolution.type === EvolutionDirection.TO,
    ) ?? [];
  return templates === undefined ? (
    <></>
  ) : (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild={true}>{trigger}</PopoverTrigger>
      <PopoverPrimitive.Content>
        <Box
          color="bg-pokerole-beige"
          className="p-2 flex flex-row space-x-2 mt-2 flex-wrap max-w-[97vw] mr-2 justify-center"
        >
          {evolvesFrom.map((evolution, index) => (
            <EvolutionCard
              key={index}
              evolution={evolution}
              evolutionTemplate={templates.find((template) => template.id === evolution.targetId)}
              onClick={evolve}
            />
          ))}
          {evolvesFrom.length > 0 && evolvesTo.length > 0 && (
            <Separator orientation="vertical" className="h-auto" />
          )}
          {evolvesTo.map((evolution, index) => (
            <EvolutionCard
              key={index}
              evolution={evolution}
              evolutionTemplate={templates.find((template) => template.id === evolution.targetId)}
              onClick={evolve}
            />
          ))}
        </Box>
      </PopoverPrimitive.Content>
    </Popover>
  );
};
const EvolutionCard = ({
  evolution,
  evolutionTemplate,
  onClick,
}: {
  evolution: T.Evolution;
  evolutionTemplate: T.PokemonTemplate | undefined;
  onClick?: (evolution: T.Evolution) => void;
}) => {
  const [ref, hovering] = useHover<HTMLDivElement>();
  return evolutionTemplate === undefined ? (
    <></>
  ) : (
    <div
      className="flex flex-row space-x-2 items-center"
      ref={ref}
      onClick={() => onClick?.(evolution)}
    >
      <Box
        color="bg-pokerole-beige"
        className="p-2 flex flex-col items-center hover:bg-pokerole-black transition-colors duration-300 ease-in-out"
      >
        <PokemonImage
          imageFileName={evolutionTemplate.image}
          type="book"
          className="w-20 h-20 image-rendering-pixelated"
        />
        <Text
          size="text-sm"
          color={`${hovering ? "text-white" : "text-pokerole-black"}`}
          className="transition-colors duration-300"
        >{`${capitalize(evolution.type)}: ${evolutionTemplate.name}`}</Text>
      </Box>
    </div>
  );
};
