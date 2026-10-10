import { useHover } from "@uidotdev/usehooks";
import * as React from "react";
import type * as T from "../../../shared/types";
import { CgPokemon } from "react-icons/cg";
import { FaPlus } from "react-icons/fa6";
import { Link } from "react-router-dom";
import {
  usePokemonControllerCreate,
  usePokemonTemplatesControllerFindMany,
  usePokemonTemplatesControllerFindOne,
} from "@/api/components";
import { EvolutionDirection, Rank } from "@/api/schemas";
import { Box } from "@/components/Box";
import { ClickTooltip } from "@/components/ClickTooltip";
import { CollapsableButton } from "@/components/CollapsableButton";
import { LabeledField } from "@/components/LabeledField";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MoveCard } from "@/components/MoveCard";
import { PipRow, type PipRowProps } from "@/components/Pips";
import { PokemonImage } from "@/components/PokemonImage";
import { RankIcon } from "@/components/RankIcon";
import { StatBox } from "@/components/StatBox";
import { Text } from "@/components/Text";
import { TypeBadges } from "@/components/TypeBadges";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { capitalize } from "@/lib/utils";
import { appRoutes } from "@/routes";
const AddToMyPokemonButton = ({
  pokemonTemplateId,
}: {
  pokemonTemplateId: string;
}) => {
  const { toast } = useToast();
  const { mutate: createPokemon } = usePokemonControllerCreate({
    onSuccess: (pokemon) => {
      toast({
        title: "Pokemon created",
        description: (
          <>
            <span>
              Your new pokemon has been created.{" "}
              <Link
                to={
                  appRoutes.find((route) => route.name === "My Pokemon")?.path +
                  `/${pokemon.id}`
                }
              >
                <span className="text-attributes-blue-dark underline hover:text-attributes-blue">
                  View it here
                </span>
              </Link>
            </span>
          </>
        ),
      });
    },
    onError: () => {
      toast({
        title: "Failed to create pokemon",
        // apiFetch discards the original payload, so the existing toast has no description.
        description: undefined,
      });
    },
  });
  return (
    <CollapsableButton
      text="Create new"
      icon={<FaPlus size={20} />}
      variant="green"
      onClick={() => {
        createPokemon({
          body: { pokemonTemplateId, rank: Rank.UNRANKED, moveIds: [] },
        });
      }}
    />
  );
};
const PokemonDetailHeader = ({
  pokemonTemplate,
}: {
  pokemonTemplate: T.PokemonTemplate;
}) => (
  <Box
    color="bg-pokerole-black"
    className="pokemon-detail-header p-2 col-span-full grid grid-cols-12 gap-2 items-center"
  >
    <div className="2xl:col-span-5 col-span-full flex flex-row space-x-1 items-center">
      <Text color="text-white">
        {"Name: "}
        {pokemonTemplate.name}
      </Text>
    </div>
    <div className="text-white text-3xl font-square leading-none flex flex-row items-center space-x-2 xs:col-span-9 2xl:col-span-5 col-span-full">
      <Text color="text-white">Type:</Text>
      <TypeBadges
        typeOne={pokemonTemplate.types[0]}
        typeTwo={pokemonTemplate.types[1]}
      />
    </div>
    <div className="flex flex-row xs:justify-end justify-center space-x-1 text-white leading-none xs:col-span-3 2xl:col-span-2 col-span-full">
      <AddToMyPokemonButton pokemonTemplateId={pokemonTemplate.id} />
    </div>
  </Box>
);
const StaticPips = ({
  numberOfPips,
  numberOfSetPips,
  numberOfSettablePips,
  className,
  pipClassName,
}: Pick<
  PipRowProps,
  | "numberOfPips"
  | "numberOfSetPips"
  | "numberOfSettablePips"
  | "className"
  | "pipClassName"
>) => (
  <>
    <PipRow
      numberOfPips={numberOfPips}
      numberOfSetPips={numberOfSetPips}
      numberOfSelectedPips={0}
      numberOfSelectablePips={0}
      numberOfSettablePips={numberOfSettablePips}
      className={className}
      pipClassName={pipClassName}
    />
  </>
);
const RANK_ORDER: Rank[] = [
  Rank.UNRANKED,
  Rank.STARTER,
  Rank.ROOKIE,
  Rank.STANDARD,
  Rank.ADVANCED,
  Rank.EXPERT,
  Rank.ACE,
  Rank.MASTER,
  Rank.CHAMPION,
];
const rankIndex = (rank: Rank) => RANK_ORDER.indexOf(rank);
const compareRanks = (first: Rank, second: Rank) =>
  rankIndex(first) - rankIndex(second);
const PokemonDetailBody = ({
  pokemonTemplate,
}: {
  pokemonTemplate: T.PokemonTemplate;
}) => {
  const evolutionsFrom = pokemonTemplate.evolutions.filter(
    (evolution) => evolution.type === EvolutionDirection.FROM,
  );
  const evolutionsTo = pokemonTemplate.evolutions.filter(
    (evolution) => evolution.type === EvolutionDirection.TO,
  );
  const { data: evolutionTemplates } = usePokemonTemplatesControllerFindMany({
    pathParams: {
      ids: [
        ...evolutionsFrom.map((evolution) => evolution.targetId),
        ...evolutionsTo.map((evolution) => evolution.targetId),
      ],
    },
  });
  return (
    <div className="pokemon-detail grid grid-flow-row grid-cols-12 gap-2">
      <PokemonDetailHeader pokemonTemplate={pokemonTemplate} />
      <Box
        color="bg-pokerole-beige"
        className="pokemon-overview p-2 grid grid-flow-row grid-cols-2 gap-2 xl:col-span-8 col-span-full"
      >
        <div className="flex flex-col space-y-2 flex-grow lg:col-span-1 col-span-full">
          <Box
            color="bg-pokerole-beige"
            className="p-2 flex flex-col items-center flex-grow justify-center"
            withBorder={true}
          >
            <PokemonImage
              imageFileName={pokemonTemplate.image}
              className="detail-artwork"
              type="book"
            />
          </Box>
        </div>
        <div className="flex flex-col space-y-2 lg:col-span-1 col-span-full">
          <LabeledField color="bg-pokerole-black" label="Rec. Rank">
            <div className="flex flex-row items-center space-x-2 justify-center w-full">
              <RankIcon rank={pokemonTemplate.recommendedRank} size="md" />
              <Text
                color="text-pokerole-black"
                className="text-center lg:text-sm xl:text-3xl"
              >
                {pokemonTemplate.recommendedRank}
              </Text>
            </div>
          </LabeledField>
          <LabeledField color="bg-pokerole-black" label="Base HP">
            <Text color="text-pokerole-black" className="text-center">
              {pokemonTemplate.baseHp}
            </Text>
          </LabeledField>
          <LabeledField color="bg-pokerole-black" label="Abilities">
            <span className="text-center flex flex-row gap-x-1 flex-wrap lg:text-xl xl:text-3xl text-pokerole-black font-square">
              {[
                pokemonTemplate.abilityOne,
                pokemonTemplate.abilityTwo,
                pokemonTemplate.hiddenAbility,
                pokemonTemplate.eventAbility,
              ]
                .filter((ability): ability is T.Ability => ability != null)
                .map((ability, abilityIndex, abilities) => (
                  <React.Fragment key={ability?.id}>
                    <ClickTooltip
                      trigger={<span>{ability?.name}</span>}
                      content={
                        <div className="max-w-96">
                          <span className="font-move text-lg">
                            {ability?.effect}
                          </span>
                        </div>
                      }
                    />
                    {abilityIndex < abilities.length - 1 && ", "}
                  </React.Fragment>
                ))}
            </span>
          </LabeledField>
          <div className="flex flex-row space-x-2">
            <LabeledField
              color="bg-pokerole-black"
              label="Height"
              className="flex-grow"
            >
              <Text
                color="text-pokerole-black"
                className="text-center"
                size="text-base"
              >
                {pokemonTemplate.height}
                {" m"}
              </Text>
            </LabeledField>
            <LabeledField
              color="bg-pokerole-black"
              label="Weight"
              className="flex-grow"
            >
              <Text
                color="text-pokerole-black"
                className="text-center"
                size="text-base"
              >
                {pokemonTemplate.weight}
                {" kg"}
              </Text>
            </LabeledField>
          </div>
        </div>
        <div className="flex flex-col space-y-2 md:col-span-1 col-span-full px-2">
          <Text color="text-pokerole-black" className="" size="text-lg">
            {pokemonTemplate.dexCategory}
            <br />
            <span className="font-move">{pokemonTemplate.description}</span>
          </Text>
        </div>
        <div className="flex flex-col space-y-1 md:col-span-1 col-span-full items-center">
          <Text size="text-lg">Evolutions</Text>
          {pokemonTemplate.evolutions.length === 0 ? (
            <Text size="text-sm">None</Text>
          ) : (
            <div className="flex flex-row space-x-1">
              {evolutionsFrom.map((evolution, evolutionIndex) => (
                <EvolutionLink
                  key={evolutionIndex}
                  evolution={evolution}
                  evolutionTemplate={evolutionTemplates?.find(
                    (template) => template.id === evolution.targetId,
                  )}
                />
              ))}
              {evolutionsFrom.length > 0 && evolutionsTo.length > 0 && (
                <Separator orientation="vertical" />
              )}
              {evolutionsTo.map((evolution, evolutionIndex) => (
                <EvolutionLink
                  key={evolutionIndex}
                  evolution={evolution}
                  evolutionTemplate={evolutionTemplates?.find(
                    (template) => template.id === evolution.targetId,
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </Box>
      <Box
        color="bg-pokerole-beige"
        className="pokemon-stats p-2 space-y-2 xl:col-span-4 col-span-full"
      >
        <Text className="text-center">Stats</Text>
        <StatBox
          statName="Strength"
          color="bg-attributes-blue"
          textClassName="text-2xl"
          pipRow={
            <StaticPips
              numberOfPips={12}
              numberOfSetPips={pokemonTemplate.baseStats.strength}
              numberOfSettablePips={
                pokemonTemplate.maxStats.strength -
                pokemonTemplate.baseStats.strength
              }
              pipClassName="max-lg:w-5 max-lg:h-5 max-xs:w-4 max-xs:h-4 w-5 h-5"
              className="flex-wrap justify-center gap-y-0.5"
            />
          }
        />
        <StatBox
          statName="Dexterity"
          color="bg-attributes-blue"
          textClassName="text-2xl"
          pipRow={
            <StaticPips
              numberOfPips={12}
              numberOfSetPips={pokemonTemplate.baseStats.dexterity}
              numberOfSettablePips={
                pokemonTemplate.maxStats.dexterity -
                pokemonTemplate.baseStats.dexterity
              }
              pipClassName="max-lg:w-5 max-lg:h-5 max-xs:w-4 max-xs:h-4 w-5 h-5"
              className="flex-wrap justify-center gap-y-0.5"
            />
          }
        />
        <StatBox
          statName="Vitality"
          color="bg-attributes-blue"
          textClassName="text-2xl"
          pipRow={
            <StaticPips
              numberOfPips={12}
              numberOfSetPips={pokemonTemplate.baseStats.vitality}
              numberOfSettablePips={
                pokemonTemplate.maxStats.vitality -
                pokemonTemplate.baseStats.vitality
              }
              pipClassName="max-lg:w-5 max-lg:h-5 max-xs:w-4 max-xs:h-4 w-5 h-5"
              className="flex-wrap justify-center gap-y-0.5"
            />
          }
        />
        <StatBox
          statName="Special"
          color="bg-attributes-blue"
          textClassName="text-2xl"
          pipRow={
            <StaticPips
              numberOfPips={12}
              numberOfSetPips={pokemonTemplate.baseStats.special}
              numberOfSettablePips={
                pokemonTemplate.maxStats.special -
                pokemonTemplate.baseStats.special
              }
              pipClassName="max-lg:w-5 max-lg:h-5 max-xs:w-4 max-xs:h-4 w-5 h-5"
              className="flex-wrap justify-center gap-y-0.5"
            />
          }
        />
        <StatBox
          statName="Insight"
          color="bg-attributes-blue"
          textClassName="text-2xl"
          pipRow={
            <StaticPips
              numberOfPips={12}
              numberOfSetPips={pokemonTemplate.baseStats.insight}
              numberOfSettablePips={
                pokemonTemplate.maxStats.insight -
                pokemonTemplate.baseStats.insight
              }
              pipClassName="max-lg:w-5 max-lg:h-5 max-xs:w-4 max-xs:h-4 w-5 h-5"
              className="flex-wrap justify-center gap-y-0.5"
            />
          }
        />
      </Box>
      <Box
        color="bg-pokerole-beige"
        className="pokemon-moves p-2 col-span-full space-y-2"
      >
        <Text size="text-lg" className="text-center">
          Moves
        </Text>
        <div className="grid grid-cols-2 gap-1">
          {pokemonTemplate.possibleMoves
            .sort((possibleMove, otherMove) => {
              const byRank = compareRanks(possibleMove.rank, otherMove.rank);
              return byRank !== 0
                ? byRank
                : possibleMove.move.name.localeCompare(otherMove.move.name);
            })
            .map((possibleMove) => (
              <div
                key={possibleMove.move.name}
                className="xl:col-span-1 col-span-full flex flex-row items-stretch space-x-1"
              >
                <div className="flex flex-row items-center space-x-2">
                  <RankIcon rank={possibleMove.rank} size="md" />
                </div>
                <MoveCard move={possibleMove.move} />
              </div>
            ))}
        </div>
      </Box>
    </div>
  );
};
const EvolutionLink = ({
  evolution,
  evolutionTemplate,
}: {
  evolution: T.Evolution;
  evolutionTemplate?: T.PokemonTemplate;
}) => {
  const [hoverRef, isHovering] = useHover<HTMLDivElement>();
  return evolutionTemplate === undefined ? (
    <></>
  ) : (
    <Link to={`/pokemon/${evolutionTemplate.id}`}>
      <div
        className="p-2 flex flex-col items-center rounded-3xl hover:bg-pokerole-black transition-colors duration-300 ease-in-out"
        ref={hoverRef}
      >
        <PokemonImage
          imageFileName={evolutionTemplate.image}
          type="book"
          className="w-16 h-16 image-rendering-pixelated"
        />
        <Text
          size="text-sm"
          color={isHovering ? "text-white" : "text-pokerole-black"}
          className="transition-colors duration-300"
        >{`${capitalize(evolution.type)}: ${evolutionTemplate.name}`}</Text>
      </div>
    </Link>
  );
};
export const PokemonDetail = ({
  pokemonTemplateId,
}: {
  pokemonTemplateId?: string;
}) => {
  const {
    data: pokemonTemplate,
    isLoading,
    isError,
  } = usePokemonTemplatesControllerFindOne(
    {
      pathParams: {
        id: pokemonTemplateId ?? "",
      },
    },
    {
      enabled: pokemonTemplateId !== undefined,
    },
  );
  return pokemonTemplateId === undefined ? (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="md:h-[80%] max-md:w-1/2">
        <CgPokemon size="100%" color="#5f5c54" />
      </div>
    </div>
  ) : isLoading ? (
    <div className="flex flex-row flex-grow justify-center items-center h-full">
      <LoadingSpinner />
    </div>
  ) : pokemonTemplate === undefined || isError ? (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="md:h-[80%] max-md:w-1/2">
        <CgPokemon size="100%" color="#5f5c54" />
      </div>
    </div>
  ) : (
    <PokemonDetailBody pokemonTemplate={pokemonTemplate} />
  );
};
