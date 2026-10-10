import { useMediaQuery } from "@uidotdev/usehooks";
import * as React from "react";
import { IconContext } from "react-icons";
import { FaAngleRight } from "react-icons/fa6";
import { GiBottledBolt } from "react-icons/gi";
import { TbPokeball } from "react-icons/tb";
import { Link, useParams } from "react-router-dom";
import type * as T from "../../../shared/types";
import {
  useItemsControllerGenerate,
  usePokemonControllerGenerate,
} from "@/api/components";
import {
  Habitat,
  ItemCategory,
  ItemPocket,
  LegendaryFilter,
  Rank,
  RankUpMethod,
} from "@/api/schemas";
import { Box } from "@/components/Box";
import { CampaignFilter } from "@/components/CampaignFilter";
import { Combobox } from "@/components/Combobox";
import { ItemCard } from "@/components/ItemCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MultiSelect } from "@/components/MultiSelect";
import { StaticPokemonProvider } from "@/components/pokemon-sheet/context";
import { PokemonSheet } from "@/components/pokemon-sheet/PokemonSheet";
import { RankIcon } from "@/components/RankIcon";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { useToast } from "@/hooks/use-toast";
import {
  GeneratorContentProvider,
  useGeneratorContent,
} from "@/pages/Generators/context";

type PokemonSettings = Required<
  Omit<T.GeneratePokemonBody, keyof T.SelectionBody | "pokemonTemplateId">
> &
  Pick<T.GeneratePokemonBody, "pokemonTemplateId">;
type ItemSettings = Required<Omit<T.GenerateItemsBody, keyof T.SelectionBody>>;

/** The shape GeneratedItemList renders. /items/generate actually returns plain
 * items, so `item` is undefined and ItemCard crashes, as in the original. */
interface GeneratedItemEntry {
  count: number;
  item: T.Item;
}

const GeneratorLink = ({
  name,
  icon,
  description,
}: {
  name: string;
  icon: React.ReactNode;
  description?: string;
}) => {
  const { generator } = useParams();
  const { setContent } = useGeneratorContent();
  const isSelected = generator === name.toLowerCase();
  return (
    <Link
      to={`/generators/${name.toLowerCase()}`}
      className="flex"
      onClick={() => {
        setContent(null);
      }}
    >
      <Button
        variant="blue"
        size="xlUnbound"
        className={`flex flex-grow items-center justify-between gap-2 border-pokerole-black ${isSelected ? "border-2" : ""}`}
      >
        <div className="flex flex-row gap-2 items-center">
          <IconContext.Provider
            value={{
              size: "3em",
            }}
          >
            {icon}
          </IconContext.Provider>
          <div className="flex flex-col text-left">
            <span className="text-3xl">{name}</span>
            {description != null && (
              <span className="font-move">{description}</span>
            )}
          </div>
        </div>
        <FaAngleRight className="align-end" />
      </Button>
    </Link>
  );
};
const GeneratedPokemonList = () => {
  const { content } = useGeneratorContent();
  const [lockedPokemon, setLockedPokemon] = React.useState<T.Pokemon[]>([]);
  // The generator links clear the content, so it holds Pokemon on this panel.
  const generated = (content ?? []) as T.Pokemon[];
  const renderSheet = (pokemon: T.Pokemon) => (
    <StaticPokemonProvider
      key={pokemon.id}
      pokemon={pokemon}
      isLocked={lockedPokemon.includes(pokemon)}
      lockedPressed={() => {
        if (lockedPokemon.includes(pokemon))
          setLockedPokemon(lockedPokemon.filter((other) => other !== pokemon));
        else setLockedPokemon([...lockedPokemon, pokemon]);
      }}
    >
      <PokemonSheet showButtons="addAndLock" />
    </StaticPokemonProvider>
  );
  return (
    <Box
      color="bg-pokerole-beige"
      className="p-3 h-full flex flex-col overflow-hidden"
    >
      <ScrollArea className="flex-1 rounded-3xl">
        <div className="flex flex-col gap-2">
          <Text size="text-3xl" className="text-center">
            Generated Pokemon
          </Text>
          <div className="flex flex-col gap-4">
            {generated.length === 0 && (
              <Text size="text-md" className="text-center">
                {" "}
                - No Generated Pokemon -{" "}
              </Text>
            )}
            {lockedPokemon
              .filter((pokemon) => !generated.includes(pokemon))
              .map(renderSheet)}
            {generated.map(renderSheet)}
          </div>
        </div>
      </ScrollArea>
    </Box>
  );
};
const GeneratedItemList = () => {
  const { content } = useGeneratorContent();
  // Cast to what this list expects, not what the API returns (see GeneratedItemEntry).
  const entries = (content ?? []) as unknown as GeneratedItemEntry[];
  return (
    <Box
      color="bg-pokerole-beige"
      className="p-3 h-full flex flex-col overflow-hidden"
    >
      <ScrollArea className="flex-1 rounded-3xl">
        <div className="flex flex-col gap-2">
          <Text size="text-3xl" className="text-center">
            Generated Items
          </Text>
          <div className="gap-4 grid grid-cols-2 md:p-4">
            {entries.length === 0 && (
              <Text size="text-md" className="text-center col-span-full">
                {" "}
                - No Generated Items -{" "}
              </Text>
            )}
            {entries.map((entry, index) => (
              <div
                key={index}
                className="flex flex-row items-center col-span-full xl:col-span-1 gap-4"
              >
                <Text size="text-3xl" font="font-move" className="text-center">
                  {entry.count}x
                </Text>
                <ItemCard item={entry.item} className="flex-grow" />
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </Box>
  );
};
const GeneratorPanel = () => {
  const { generator } = useParams();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  if (generator === undefined)
    return (
      <div className="flex flex-col justify-center items-center h-full gap-2">
        <Text size="text-5xl" color="text-white">
          No Generator Selected
        </Text>
        <Text size="text-2xl" color="text-white" font="font-move">
          {"Please select a generator "}
          {isDesktop ? "from the left" : "above"}
        </Text>
      </div>
    );
  const panels: Record<string, React.ReactNode> = {
    pokemon: <GeneratedPokemonList />,
    items: <GeneratedItemList />,
  };
  return <>{panels[generator]}</>;
};
const SeedInput = ({
  value,
  onChange,
  useRandomSeed,
  setUseRandomSeed,
}: {
  value: number;
  onChange: (value: string) => void;
  useRandomSeed: boolean;
  setUseRandomSeed: (useRandomSeed: boolean) => void;
}) => (
  <>
    <Text font="font-move" size="text-xl">
      Seed
    </Text>
    <Input
      type="number"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={useRandomSeed}
    />
    <Text font="font-move" size="text-sm">
      Random Seed
    </Text>
    <Checkbox
      checked={useRandomSeed}
      onCheckedChange={(checked) => {
        if (typeof checked == "boolean") setUseRandomSeed(checked);
      }}
    />
  </>
);
const habitatNames: Record<Habitat, string> = {
  CITIES: "Cities",
  TEMPERATE_DECIDUOUS_FORESTS: "Temperate Deciduous Forests",
  BADLANDS_SCRUBLANDS_AND_WASTELANDS: "Badlands, Scrublands, and Wastelands",
  ELECTROMAGNETICALLY_ACTIVE_AREAS: "Electromagnetically Active Areas",
  WOODLANDS: "Woodlands",
  TROPICAL_JUNGLES: "Tropical Jungles",
  CAVES: "Caves",
  FIELDS_AND_MEADOWS: "Fields and Meadows",
  SWAMPS_BOGS_AND_MARSHES: "Swamps, Bogs, and Marshes",
  GRASSLANDS_SAVANNAS_PLAINS_AND_PRAIRIES:
    "Grasslands, Savannas, Plains, and Prairies",
  MOUNTAINS: "Mountains",
  RUINS_AND_CEMETERIES: "Ruins and Cemeteries",
  TUNDRAS_AND_BOREAL_FORESTS: "Tundras and Boreal Forests",
  LAKESIDES_AND_RIVERSIDES: "Lakesides and Riversides",
  GLACIERS_MOUNTAIN_PEAKS_AND_ICY_CAVES: "Glaciers, Mountain Peaks, and Icy Caves",
  VOLCANOES: "Volcanoes",
  LAKES: "Lakes",
  BEACHES: "Beaches",
  PONDS: "Ponds",
  STREAMS_AND_RIVERS: "Streams and Rivers",
  OCEANIC_ABYSSES: "Oceanic Abysses",
  POLAR_SEAS: "Polar Seas",
  TROPICAL_SEAS_AND_CORAL_REEFS: "Tropical Seas and Coral Reefs",
  OPEN_OCEAN_AND_THE_CONTINENTAL_SHELF: "Open Ocean and the Continental Shelf",
  DESERTS: "Deserts",
};
const PokemonGenerator = () => {
  const { setContent } = useGeneratorContent();
  const [useRandomSeed, setUseRandomSeed] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const { toast } = useToast();
  const [settings, setSettings] = React.useState<PokemonSettings>({
    seed: new Date().getTime(),
    rankUpMethod: RankUpMethod.RANDOM,
    habitats: [],
    includeLegendary: LegendaryFilter.NONE,
    numberToGenerate: 1,
    pokemonTemplateId: undefined,
    rankOrBelow: true,
    rank: Rank.STARTER,
  });
  const { mutate } = usePokemonControllerGenerate({
    onSuccess: (pokemon) => {
      setContent(pokemon);
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
      toast({
        title: "Failed to generate pokemon",
        description: "Please try again",
      });
    },
  });
  const { state: campaignFilter } = useCampaignFilter();
  const generate = () => {
    const nextSettings = { ...settings };
    if (useRandomSeed) {
      nextSettings.seed = new Date().getTime();
      setSettings(nextSettings);
    }
    setIsGenerating(true);
    mutate({
      body: {
        ...nextSettings,
        campaignIds: campaignFilter.campaignIds,
        includeCore: campaignFilter.includeCore,
      },
    });
  };
  return (
    <Box color="bg-pokerole-beige" className="p-2 flex flex-col gap-2">
      <Text size="text-2xl" color="text-pokerole-black" className="text-center">
        Pokemon Generator
      </Text>
      <div className="flex flex-row gap-2 items-center">
        <Text font="font-move" size="text-xl" className="whitespace-nowrap">
          Number to Generate
        </Text>
        <Input
          type="number"
          value={settings.numberToGenerate}
          onChange={(event) => {
            const number = parseInt(event.target.value);
            setSettings({
              ...settings,
              numberToGenerate: isNaN(number) ? 0 : number,
            });
            event.target.value = settings.numberToGenerate.toString();
          }}
          className="max-w-16 text-center"
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <Text font="font-move" size="text-xl">
          Pokemon
        </Text>
        <CampaignFilter
          onChange={(pokemonTemplateId) => {
            setSettings({
              ...settings,
              pokemonTemplateId,
            });
          }}
          className="text-md flex-grow"
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <Text font="font-move" size="text-xl">
          Rank
        </Text>
        <Combobox
          items={Object.values(Rank).map((rank) => ({
            label: (
              <div className="flex items-center space-x-1">
                <RankIcon rank={rank} size="sm" /> <span>{rank}</span>
              </div>
            ),
            searchValue: rank,
            value: rank.toLowerCase(),
          }))}
          value={settings.rank.toLowerCase()}
          onChange={(value) => {
            setSettings({
              ...settings,
              rank:
                Object.values(Rank).find((rank) => rank.toLowerCase() === value) ??
                settings.rank,
            });
          }}
          className="text-md flex-grow"
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <Text font="font-move" size="text-xl">
          Rank Up Method
        </Text>
        <Combobox
          items={Object.values(RankUpMethod).map((method) => ({
            label: method.replace(/_/g, " "),
            value: method.toLowerCase(),
          }))}
          value={settings.rankUpMethod.toLowerCase()}
          onChange={(value) => {
            setSettings({
              ...settings,
              // Re-picking the current method sends "" (original quirk).
              rankUpMethod: value.toUpperCase() as RankUpMethod,
            });
          }}
          className="text-md flex-grow"
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <Text font="font-move" size="text-xl">
          Include Legendary
        </Text>
        <Combobox
          items={[
            {
              label: "No Legendaries",
              value: LegendaryFilter.NONE.toLowerCase(),
            },
            {
              label: "Only Legendaries",
              value: LegendaryFilter.ONLY.toLowerCase(),
            },
            {
              label: "Legendaries and Non-Legendaries",
              value: LegendaryFilter.ALL.toLowerCase(),
            },
          ]}
          value={settings.includeLegendary.toLowerCase()}
          onChange={(value) => {
            setSettings({
              ...settings,
              // Re-picking the current filter sends "" (original quirk).
              includeLegendary: value.toUpperCase() as LegendaryFilter,
            });
          }}
          className="text-md flex-grow text-wrap"
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <Text font="font-move" size="text-xl">
          Habitats
        </Text>
        <MultiSelect
          options={Object.values(Habitat).map((habitat) => ({
            label: habitatNames[habitat],
            value: habitat,
          }))}
          selected={settings.habitats}
          onChange={(habitats) => {
            setSettings({
              ...settings,
              habitats,
            });
          }}
          className="text-md flex-grow text-wrap"
          placeholder="Select habitats..."
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <Text font="font-move" size="text-xl">
          Recommended Rank or lower
        </Text>
        <Checkbox
          checked={settings.rankOrBelow}
          onCheckedChange={(checked) => {
            setSettings({
              ...settings,
              rankOrBelow: checked === "indeterminate" ? true : checked,
            });
          }}
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <SeedInput
          value={settings.seed}
          onChange={(value) => {
            setSettings({
              ...settings,
              seed: parseInt(value),
            });
          }}
          useRandomSeed={useRandomSeed}
          setUseRandomSeed={setUseRandomSeed}
        />
      </div>
      <Button
        id="generator-generate-button"
        onClick={generate}
        disabled={settings.numberToGenerate < 1 || isGenerating}
      >
        {isGenerating ? <LoadingSpinner className="h-6" /> : "Generate"}
      </Button>
    </Box>
  );
};
const ItemGenerator = () => {
  const { setContent } = useGeneratorContent();
  const [useRandomSeed, setUseRandomSeed] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [settings, setSettings] = React.useState<ItemSettings>({
    seed: new Date().getTime(),
    numberToGenerate: 1,
    categories: [],
    pockets: [],
  });
  const { mutate } = useItemsControllerGenerate({
    onSuccess: (items) => {
      setContent(items);
      setIsGenerating(false);
    },
  });
  const { state: campaignFilter } = useCampaignFilter();
  const generate = () => {
    const nextSettings = { ...settings };
    if (useRandomSeed) {
      nextSettings.seed = new Date().getTime();
      setSettings(nextSettings);
    }
    setIsGenerating(true);
    mutate({
      body: {
        ...nextSettings,
        campaignIds: campaignFilter.campaignIds,
        includeCore: campaignFilter.includeCore,
      },
    });
  };
  return (
    <Box color="bg-pokerole-beige" className="p-2 flex flex-col gap-2">
      <Text size="text-2xl" color="text-pokerole-black" className="text-center">
        Item Generator
      </Text>
      <div className="flex flex-row gap-2 items-center">
        <Text font="font-move" size="text-xl" className="whitespace-nowrap">
          Number to Generate
        </Text>
        <Input
          type="number"
          value={settings.numberToGenerate}
          onChange={(event) => {
            const number = parseInt(event.target.value);
            setSettings({
              ...settings,
              numberToGenerate: isNaN(number) ? 0 : number,
            });
            event.target.value = settings.numberToGenerate.toString();
          }}
          className="max-w-16 text-center"
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <Text font="font-move" size="text-xl">
          Pockets
        </Text>
        <MultiSelect
          options={Object.values(ItemPocket).map((pocket) => ({
            label: pocket.replace(/_/g, " "),
            value: pocket.toLowerCase(),
          }))}
          selected={settings.pockets.map((pocket) => pocket.toLowerCase())}
          onChange={(pockets) => {
            setSettings({
              ...settings,
              pockets: pockets.map((pocket) => pocket.toUpperCase() as ItemPocket),
            });
          }}
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <Text font="font-move" size="text-xl">
          Categories
        </Text>
        <MultiSelect
          options={Object.values(ItemCategory).map((category) => ({
            label: category.replace(/_/g, " "),
            value: category.toLowerCase(),
          }))}
          selected={settings.categories.map((category) => category.toLowerCase())}
          onChange={(categories) => {
            setSettings({
              ...settings,
              categories: categories.map(
                (category) => category.toUpperCase() as ItemCategory,
              ),
            });
          }}
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <SeedInput
          value={settings.seed}
          onChange={(value) => {
            setSettings({
              ...settings,
              seed: parseInt(value),
            });
          }}
          useRandomSeed={useRandomSeed}
          setUseRandomSeed={setUseRandomSeed}
        />
      </div>
      <Button
        onClick={generate}
        disabled={settings.numberToGenerate < 1 || isGenerating}
      >
        {isGenerating ? <LoadingSpinner className="h-6" /> : "Generate"}
      </Button>
    </Box>
  );
};
const SelectedGenerator = () => {
  const { generator } = useParams();
  if (generator === undefined) return <></>;
  const generators: Record<string, React.ReactNode> = {
    pokemon: <PokemonGenerator />,
    items: <ItemGenerator />,
  };
  return <>{generators[generator]}</>;
};
export const GeneratorsPage = () => (
  <GeneratorContentProvider>
    <div className="p-2 pb-0 grid lg:h-[calc(100vh-1rem)] grid-cols-12 box-border gap-3">
      <div className="lg:col-span-4 2xl:col-span-3 col-span-full flex flex-col gap-2 max-lg:h-fit h-full overflow-hidden">
        <div className="shrink-0 flex flex-col gap-2">
          <p className="font-move text-sm text-white px-2">
            Local generator: recovered data; generation rules may differ from
            the original.
          </p>
          <GeneratorLink
            name="Pokemon"
            icon={<TbPokeball />}
            description="Generate Pokemon"
          />
          <GeneratorLink
            name="Items"
            icon={<GiBottledBolt />}
            description="Generate Items"
          />
        </div>
        <ScrollArea className="flex-1 lg:mt-2">
          <SelectedGenerator />
        </ScrollArea>
      </div>
      <div className="lg:col-span-8 2xl:col-span-9 col-span-full h-full overflow-hidden">
        <GeneratorPanel />
      </div>
    </div>
  </GeneratorContentProvider>
);
