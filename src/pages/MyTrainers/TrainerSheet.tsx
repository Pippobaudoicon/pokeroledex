import { useDebounce } from "@uidotdev/usehooks";
import * as React from "react";
import { FaPerson } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { Textfit } from "react-textfit";
import type * as T from "../../../shared/types";
import { useNaturesControllerFindAll } from "@/api/components";
import { Rank } from "@/api/schemas";
import { Box } from "@/components/Box";
import { Combobox } from "@/components/Combobox";
import { LabeledField } from "@/components/LabeledField";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatPips } from "@/components/Pips";
import { PokemonImage } from "@/components/PokemonImage";
import { RankIcon } from "@/components/RankIcon";
import { StatBox } from "@/components/StatBox";
import { Text } from "@/components/Text";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SOCIALS, TRAINER_ATTRIBUTES, TRAINER_SKILLS } from "@/lib/stats";
import { capitalize } from "@/lib/utils";
import { type EditableTrainer, type TrainerStatKey, useTrainer } from "@/pages/MyTrainers/context";
import { TrainerSheetHeader } from "@/pages/MyTrainers/Header";
import { InventoryList, InventorySection } from "@/pages/MyTrainers/Inventory";

type StatType = "attribute" | "social" | "skill";
const STATS_BY_TYPE = { attribute: TRAINER_ATTRIBUTES, social: SOCIALS, skill: TRAINER_SKILLS };
const POINTS_BY_TYPE = { attribute: "attributePoints", social: "socialPoints", skill: "skillPoints" } as const;

const TrainerStatPips = ({
  stat,
  type,
  pipClassName,
}: {
  stat: TrainerStatKey;
  type: StatType;
  pipClassName?: string;
}) => {
  const { baseTrainer, updatedTrainer, updateTrainer, rankUpAttributes, editingMode, statChanges } = useTrainer();
  const allocatablePoints = React.useMemo(() => {
    if (editingMode === "edit") return Infinity;
    if (editingMode === "view" || rankUpAttributes == null) return 0;
    return (
      (rankUpAttributes[POINTS_BY_TYPE[type]] ?? 0) -
      STATS_BY_TYPE[type].reduce((sum, key) => sum + (statChanges?.[key] ?? 0), 0)
    );
  }, [rankUpAttributes, statChanges, editingMode]);
  if (baseTrainer == null || updatedTrainer == null)
    return (
      <div className="flex flex-row flex-grow justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  const baseValue = baseTrainer.stats[stat];
  const change = statChanges?.[stat] ?? 0;
  const minimum = type === "skill" ? 0 : 1;
  const maxStat = editingMode === "edit" && type === "attribute" ? 6 : 5;
  // Clicking the current value resets it: to 0 when editing, to the saved value when ranking up.
  const selectStat = (index: number) => {
    const clicked = index + 1 - minimum;
    updateTrainer({
      stats: {
        ...updatedTrainer.stats,
        [stat]: baseValue + change === clicked ? (editingMode === "edit" ? 0 : baseValue) : clicked,
      },
    });
  };
  return (
    <StatPips
      maxPips={Math.max(maxStat, baseValue + 1)}
      baseStat={editingMode === "edit" ? minimum : baseValue + minimum}
      maxStat={maxStat}
      numSelected={editingMode === "edit" ? baseValue + change : change}
      allocatablePoints={allocatablePoints}
      onSelect={selectStat}
      pipClassName={pipClassName}
      limit={editingMode !== "edit" && type === "skill" ? rankUpAttributes?.skillLimit : undefined}
    />
  );
};

const TrainerTextField = ({
  property,
  className,
}: {
  property: "currentHp" | "currentWill" | "money";
  className?: string;
}) => {
  const { updatedTrainer, updateTrainer } = useTrainer();
  const [value, setValue] = React.useState<number | string>(updatedTrainer != null ? updatedTrainer[property] : "");
  const debouncedValue = useDebounce(value, 500);
  // The value is a string only when the stored field isn't a number, which the API never sends.
  const setField = (next: number | string) => updateTrainer({ [property]: next } as Partial<EditableTrainer>);
  React.useEffect(() => {
    if (updatedTrainer === undefined) return;
    // Parses the live value, not the debounced one (original behaviour).
    let next = typeof updatedTrainer[property] == "number" ? parseInt(value?.toString() ?? "") : debouncedValue;
    if (typeof next == "number" && isNaN(next)) next = 0;
    setField(next);
  }, [debouncedValue]);
  React.useEffect(() => {
    if (updatedTrainer !== undefined) setValue(updatedTrainer[property]);
  }, [updatedTrainer]);
  if (updatedTrainer === undefined) return <div>Loading...</div>;
  if (typeof updatedTrainer[property] != "number" && typeof updatedTrainer[property] != "string")
    throw new Error(`Value ${JSON.stringify(updatedTrainer[property])} of ValueInput is not a number or text`);
  return (
    <Input
      className={`border-none rounded-md p-0 text-3xl text-center ${className}`}
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
      }}
      onBlur={() => setField(typeof updatedTrainer[property] === "number" ? parseInt(String(value)) || 0 : value)}
    />
  );
};

const TrainerRankField = () => {
  const { updatedTrainer, editingMode, updateTrainer } = useTrainer();
  return (
    <LabeledField
      color="bg-pokerole-black"
      label="Rank"
      className="p-0"
      valueClassName="p-0"
    >
      <div className="flex flex-row items-center">
        <Combobox
          items={(Object.keys(Rank) as (keyof typeof Rank)[]).map((rank) => ({
            label: (
              <div className="flex items-center space-x-1">
                <RankIcon rank={Rank[rank]} size="md" />{" "}
                <Textfit className="md:max-w-20">{rank}</Textfit>
              </div>
            ),
            value: rank.toLowerCase(),
            searchValue: rank,
          }))}
          value={updatedTrainer?.rank.toLowerCase()}
          className="flex-grow"
          disabled={editingMode !== "edit"}
          onChange={(value) => {
            if (updatedTrainer !== undefined)
              updateTrainer({
                rank: value.toUpperCase() as T.Rank,
              });
          }}
        />
      </div>
    </LabeledField>
  );
};

const TrainerNatureField = () => {
  const { updatedTrainer, editingMode, updateTrainer } = useTrainer();
  const { data: natures } = useNaturesControllerFindAll({});
  const items = () =>
    natures == null
      ? []
      : natures.map((nature) => ({
          label: <span>{nature?.name ?? ""}</span>,
          value: nature?.name.toLowerCase() ?? "",
          searchValue: nature?.name ?? "",
        }));
  return (
    <LabeledField
      color="bg-pokerole-black"
      label="Nature"
      className="p-0"
      valueClassName="p-0"
    >
      <div className="flex flex-row items-center">
        <Combobox
          items={items()}
          value={updatedTrainer?.nature?.name.toLowerCase()}
          className="flex-grow"
          disabled={editingMode !== "edit"}
          onChange={(value) => {
            if (updatedTrainer === undefined) return;
            updateTrainer({
              nature: natures?.find((nature) => nature?.name.toLowerCase() === value),
            });
          }}
        />
      </div>
    </LabeledField>
  );
};

const TrainerPokemonCard = ({ pokemon }: { pokemon: T.Pokemon }) => (
  <div>
    <Link to={`/myPokemon/${pokemon.id}`}>
      <Box
        color="bg-pokerole-beige"
        className="p-2 flex flex-col items-center hover:bg-pokerole-black transition-colors duration-300 ease-in-out"
      >
        <PokemonImage
          imageFileName={pokemon.pokemonTemplate.image}
          type="box"
          className="w-[42.5px] image-rendering-pixelated"
        />
      </Box>
    </Link>
  </div>
);

export const TrainerSheet = () => {
  const { updatedTrainer, updateTrainer } = useTrainer();
  if (updatedTrainer === undefined)
    return (
      <div className="flex flex-row flex-grow justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  const renderSkill = (skill: (typeof TRAINER_SKILLS)[number]) => (
    <div key={skill} className="flex flex-col items-center">
      <Text color="text-pokerole-black" size="text-base">
        {capitalize(skill)}
      </Text>
      <TrainerStatPips stat={skill} type="skill" pipClassName="w-4 h-4" />
    </div>
  );
  return (
    <div className="grid grid-flow-row grid-cols-6 gap-2">
      <TrainerSheetHeader />
      <Box
        color="bg-pokerole-beige"
        className="trainer-overview p-2 flex flex-col gap-2 2xl:col-span-1 col-span-full"
      >
        <Box
          color="bg-pokerole-beige"
          className="p-2 flex flex-col items-center"
          withBorder={true}
        >
          <FaPerson size={140} />
        </Box>
        <div className="flex flex-row space-x-2">
          <LabeledField
            color="bg-pokerole-black"
            label="HP"
            topLabel={`Max: ${updatedTrainer.stats.vitality + 4 + 1}`}
            className="flex-grow"
          >
            <TrainerTextField property="currentHp" />
          </LabeledField>
          <LabeledField
            color="bg-pokerole-black"
            label="Will"
            topLabel={`Max: ${updatedTrainer.stats.insight + 3 + 1}`}
            className="flex-grow"
          >
            <TrainerTextField property="currentWill" />
          </LabeledField>
        </div>
        <LabeledField color="bg-pokerole-black" label="$">
          <TrainerTextField property="money" />
        </LabeledField>
        <TrainerRankField />
        <TrainerNatureField />
      </Box>
      <div className="2xl:col-span-2 col-span-full flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2 max-2xl:order-2">
          <Box
            color="bg-pokerole-beige"
            className="p-2 space-y-2 2xl:col-span-1 col-span-full"
          >
            <Text className="text-center">Attributes</Text>
            <StatBox
              statName="Strength"
              color="bg-attributes-blue"
              pipRow={<TrainerStatPips stat="strength" type="attribute" />}
            />
            <StatBox
              statName="Dexterity"
              color="bg-attributes-blue"
              pipRow={<TrainerStatPips stat="dexterity" type="attribute" />}
            />
            <StatBox
              statName="Vitality"
              color="bg-attributes-blue"
              pipRow={<TrainerStatPips stat="vitality" type="attribute" />}
            />
            <StatBox
              statName="Insight"
              color="bg-attributes-blue"
              pipRow={<TrainerStatPips stat="insight" type="attribute" />}
            />
          </Box>
          <Box
            color="bg-pokerole-red"
            className="p-2 flex flex-col flex-shrink 2xl:col-span-1 col-span-full"
          >
            <Text className="text-center" size="text-sm">
              Skills
            </Text>
            <div className="p-2 grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center gap-2">
                {TRAINER_SKILLS.slice(0, 4).map(renderSkill)}
              </div>
              <div className="flex flex-col items-center gap-2">
                {TRAINER_SKILLS.slice(4, 8).map(renderSkill)}
              </div>
              <div className="flex flex-col items-center gap-2">
                {TRAINER_SKILLS.slice(8, 12).map(renderSkill)}
              </div>
              <div className="flex flex-col items-center gap-2">
                {TRAINER_SKILLS.slice(12, 16).map(renderSkill)}
              </div>
            </div>
          </Box>
        </div>
        <Box
          color="bg-pokerole-beige"
          className="p-2 flex-grow gap-1 flex flex-col max-2xl:order-1"
        >
          <Text className="text-center" size="text-sm">
            Party
          </Text>
          <div className="flex flex-row gap-1 justify-around flex-grow flex-wrap">
            {updatedTrainer.pokemon.slice(0, 6).map((pokemon, index) => (
              <TrainerPokemonCard key={index} pokemon={pokemon} />
            ))}
          </div>
        </Box>
      </div>
      <Box
        color="bg-pokerole-beige"
        className="p-2 space-y-2 2xl:col-span-1 col-span-full"
      >
        <Text className="text-center">Socials</Text>
        <StatBox
          statName="Tough"
          color="bg-socials-tough"
          pipRow={<TrainerStatPips stat="tough" type="social" />}
        />
        <StatBox
          statName="Cool"
          color="bg-socials-cool"
          pipRow={<TrainerStatPips stat="cool" type="social" />}
        />
        <StatBox
          statName="Beauty"
          color="bg-socials-beauty"
          pipRow={<TrainerStatPips stat="beauty" type="social" />}
        />
        <StatBox
          statName="Cute"
          color="bg-socials-cute"
          pipRow={<TrainerStatPips stat="cute" type="social" />}
        />
        <StatBox
          statName="Clever"
          color="bg-socials-clever"
          pipRow={<TrainerStatPips stat="clever" type="social" />}
        />
      </Box>
      <Box
        color="bg-pokerole-beige"
        className="p-2 space-y-2 2xl:col-span-2 col-span-full"
      >
        <Text className="text-center">Inventory</Text>
        <ScrollArea className="h-[25.5rem]">
          <InventoryList
            inventoryItems={updatedTrainer.inventory}
            columnCount={2}
            onChange={(changed) => {
              updateTrainer({
                inventory: updatedTrainer.inventory.map((entry) => (entry.id === changed.id ? changed : entry)),
              });
            }}
            onDelete={(deleted) => {
              updateTrainer({
                inventory: updatedTrainer.inventory.filter((entry) => entry.id !== deleted.id),
              });
            }}
          />
        </ScrollArea>
        <InventorySection buttonClassName="w-full" />
      </Box>
    </div>
  );
};
