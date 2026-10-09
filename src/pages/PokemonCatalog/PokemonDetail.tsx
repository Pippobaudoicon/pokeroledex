// @ts-nocheck
import { useHover } from "@uidotdev/usehooks";
import * as React from "react";
import { CgPokemon } from "react-icons/cg";
import { FaPlus } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { useAuth } from "@/api/client";
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
import { PipRow } from "@/components/Pips";
import { PokemonImage } from "@/components/PokemonImage";
import { RankIcon } from "@/components/RankIcon";
import { StatBox } from "@/components/StatBox";
import { Text } from "@/components/Text";
import { TypeBadges } from "@/components/TypeBadges";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { capitalize } from "@/lib/utils";
import { appRoutes } from "@/routes";
const AddToMyPokemonButton = ({ pokemonTemplateId: e }) => {
  const { isAuthenticated: t, loginWithRedirect: n, user: r } = useAuth(),
    { toast: o } = useToast(),
    { mutate: s } = usePokemonControllerCreate({
      onSuccess: (l) => {
        var c;
        o({
          title: "Pokemon created",
          description: (
            <>
              <span>
                Your new pokemon has been created.{" "}
                <Link
                  to={
                    ((c = appRoutes.find((u) => u.name === "My Pokemon")) ==
                    null
                      ? undefined
                      : c.path) + `/${l.id}`
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
      onError: (l) => {
        o({
          title: "Failed to create pokemon",
          description: l == null ? undefined : l.payload,
        });
      },
    });
  return t ? (
    <CollapsableButton
      text="Create new"
      icon={<FaPlus size={20} />}
      variant="green"
      onClick={() => {
        if ((r == null ? undefined : r.sub) == null)
          throw new Error("User not found. Not logged in?");
        const l = {
          pokemonTemplateId: e,
          rank: Rank.UNRANKED,
          moveIds: [],
        };
        s({
          body: l,
        });
      }}
    />
  ) : (
    <CollapsableButton
      text="Log in to create new"
      icon={<FaPlus size={20} />}
      variant="green"
      onClick={() => {
        n({
          appState: {
            returnTo: window.location.pathname,
          },
        });
      }}
    />
  );
};
const PokemonDetailHeader = ({ pokemonTemplate: e }) => (
  <Box
    color="bg-pokerole-black"
    className="pokemon-detail-header p-2 col-span-full grid grid-cols-12 gap-2 items-center"
  >
    <div className="2xl:col-span-5 col-span-full flex flex-row space-x-1 items-center">
      <Text color="text-white">
        {"Name: "}
        {e.name}
      </Text>
    </div>
    <div className="text-white text-3xl font-square leading-none flex flex-row items-center space-x-2 xs:col-span-9 2xl:col-span-5 col-span-full">
      <Text color="text-white">Type:</Text>
      <TypeBadges typeOne={e.types[0]} typeTwo={e.types[1]} />
    </div>
    <div className="flex flex-row xs:justify-end justify-center space-x-1 text-white leading-none xs:col-span-3 2xl:col-span-2 col-span-full">
      <AddToMyPokemonButton pokemonTemplateId={e.id} />
    </div>
  </Box>
);
const StaticPips = ({
  numberOfPips: e,
  numberOfSetPips: t,
  numberOfSettablePips: n,
  className: r,
  pipClassName: o,
}) => (
  <>
    <PipRow
      numberOfPips={e}
      numberOfSetPips={t}
      numberOfSelectedPips={0}
      numberOfSelectablePips={0}
      numberOfSettablePips={n}
      className={r}
      pipClassName={o}
    />
  </>
);
const RANK_ORDER = [
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
const rankIndex = (e) => RANK_ORDER.indexOf(e);
const compareRanks = (e, t) => rankIndex(e) - rankIndex(t);
const PokemonDetailBody = ({ pokemonTemplate: e }) => {
  const t =
      e.evolutions.filter((o) => o.type === EvolutionDirection.FROM) ?? [],
    n = e.evolutions.filter((o) => o.type === EvolutionDirection.TO) ?? [],
    { data: r } = usePokemonTemplatesControllerFindMany({
      pathParams: {
        ids: [...t.map((o) => o.targetId), ...n.map((o) => o.targetId)],
      },
    });
  return (
    <div className="pokemon-detail grid grid-flow-row grid-cols-12 gap-2">
      <PokemonDetailHeader pokemonTemplate={e} />
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
              imageFileName={e.image}
              className="detail-artwork"
              type="book"
            />
          </Box>
        </div>
        <div className="flex flex-col space-y-2 lg:col-span-1 col-span-full">
          <LabeledField color="bg-pokerole-black" label="Rec. Rank">
            <div className="flex flex-row items-center space-x-2 justify-center w-full">
              <RankIcon rank={e.recommendedRank} size="md" />
              <Text
                color="text-pokerole-black"
                className="text-center lg:text-sm xl:text-3xl"
              >
                {e.recommendedRank}
              </Text>
            </div>
          </LabeledField>
          <LabeledField color="bg-pokerole-black" label="Base HP">
            <Text color="text-pokerole-black" className="text-center">
              {e.baseHp}
            </Text>
          </LabeledField>
          <LabeledField color="bg-pokerole-black" label="Abilities">
            <span className="text-center flex flex-row gap-x-1 flex-wrap lg:text-xl xl:text-3xl text-pokerole-black font-square">
              {[e.abilityOne, e.abilityTwo, e.hiddenAbility, e.eventAbility]
                .filter((o) => o != null)
                .map((o, s, i) => (
                  <React.Fragment key={o == null ? undefined : o.id}>
                    <ClickTooltip
                      trigger={<span>{o == null ? undefined : o.name}</span>}
                      content={
                        <div className="max-w-96">
                          <span className="font-move text-lg">
                            {o == null ? undefined : o.effect}
                          </span>
                        </div>
                      }
                    />
                    {s < i.length - 1 && ", "}
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
                {e.height}
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
                {e.weight}
                {" kg"}
              </Text>
            </LabeledField>
          </div>
        </div>
        <div className="flex flex-col space-y-2 md:col-span-1 col-span-full px-2">
          <Text color="text-pokerole-black" className="" size="text-lg">
            {e.dexCategory}
            <br />
            <span className="font-move">{e.description}</span>
          </Text>
        </div>
        <div className="flex flex-col space-y-1 md:col-span-1 col-span-full items-center">
          <Text size="text-lg">Evolutions</Text>
          {e.evolutions.length === 0 ? (
            <Text size="text-sm">None</Text>
          ) : (
            <div className="flex flex-row space-x-1">
              {t.map((o, s) => (
                <EvolutionLink
                  key={s}
                  evolution={o}
                  evolutionTemplate={
                    r == null ? undefined : r.find((i) => i.id === o.targetId)
                  }
                />
              ))}
              {t.length > 0 && n.length > 0 && (
                <Separator orientation="vertical" />
              )}
              {n.map((o, s) => (
                <EvolutionLink
                  key={s}
                  evolution={o}
                  evolutionTemplate={
                    r == null ? undefined : r.find((i) => i.id === o.targetId)
                  }
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
              numberOfSetPips={e.baseStats.strength}
              numberOfSettablePips={e.maxStats.strength - e.baseStats.strength}
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
              numberOfSetPips={e.baseStats.dexterity}
              numberOfSettablePips={
                e.maxStats.dexterity - e.baseStats.dexterity
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
              numberOfSetPips={e.baseStats.vitality}
              numberOfSettablePips={e.maxStats.vitality - e.baseStats.vitality}
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
              numberOfSetPips={e.baseStats.special}
              numberOfSettablePips={e.maxStats.special - e.baseStats.special}
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
              numberOfSetPips={e.baseStats.insight}
              numberOfSettablePips={e.maxStats.insight - e.baseStats.insight}
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
          {e.possibleMoves
            .sort((o, s) => {
              const i = compareRanks(o.rank, s.rank);
              return i !== 0 ? i : o.move.name.localeCompare(s.move.name);
            })
            .map((o) => (
              <div
                key={o.move.name}
                className="xl:col-span-1 col-span-full flex flex-row items-stretch space-x-1"
              >
                <div className="flex flex-row items-center space-x-2">
                  <RankIcon rank={o.rank} size="md" />
                </div>
                <MoveCard move={o.move} />
              </div>
            ))}
        </div>
      </Box>
    </div>
  );
};
const EvolutionLink = ({ evolution: e, evolutionTemplate: t }) => {
  const [n, r] = useHover();
  return t === undefined ? (
    <></>
  ) : (
    <Link to={`/pokemon/${t.id}`}>
      <div
        className="p-2 flex flex-col items-center rounded-3xl hover:bg-pokerole-black transition-colors duration-300 ease-in-out"
        ref={n}
      >
        <PokemonImage
          imageFileName={t.image}
          type="book"
          className="w-16 h-16 image-rendering-pixelated"
        />
        <Text
          size="text-sm"
          color={r ? "text-white" : "text-pokerole-black"}
          className="transition-colors duration-300"
        >{`${capitalize(e.type)}: ${t.name}`}</Text>
      </div>
    </Link>
  );
};
export const PokemonDetail = ({ pokemonTemplateId: e }) => {
  const {
    data: t,
    isLoading: n,
    isError: r,
  } = usePokemonTemplatesControllerFindOne(
    {
      pathParams: {
        id: e ?? "",
      },
    },
    {
      enabled: e !== undefined,
    },
  );
  return e === undefined ? (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="md:h-[80%] max-md:w-1/2">
        <CgPokemon size="100%" color="#5f5c54" />
      </div>
    </div>
  ) : n ? (
    <div className="flex flex-row flex-grow justify-center items-center h-full">
      <LoadingSpinner />
    </div>
  ) : t === undefined || r ? (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="md:h-[80%] max-md:w-1/2">
        <CgPokemon size="100%" color="#5f5c54" />
      </div>
    </div>
  ) : (
    <PokemonDetailBody pokemonTemplate={t} />
  );
};
