// @ts-nocheck
import { useMediaQuery } from "@uidotdev/usehooks";
import * as React from "react";
import { IconContext } from "react-icons";
import { FaAngleRight } from "react-icons/fa6";
import { GiBottledBolt } from "react-icons/gi";
import { TbPokeball } from "react-icons/tb";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/api/client";
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
import { cn } from "@/lib/utils";
import {
  GeneratorContentProvider,
  useGeneratorContent,
} from "@/pages/Generators/context";
const GeneratorLink = ({ name: e, icon: t, description: n }) => {
  const { generator: r } = useParams(),
    { setContent: o } = useGeneratorContent(),
    s = r === e.toLowerCase();
  return (
    <Link
      to={`/generators/${e.toLowerCase()}`}
      className="flex"
      onClick={() => {
        o(null);
      }}
    >
      <Button
        variant="blue"
        size="xlUnbound"
        className={`flex flex-grow items-center justify-between gap-2 border-pokerole-black ${s ? "border-2" : ""}`}
      >
        <div className="flex flex-row gap-2 items-center">
          <IconContext.Provider
            value={{
              size: "3em",
            }}
          >
            {t}
          </IconContext.Provider>
          <div className="flex flex-col text-left">
            <span className="text-3xl">{e}</span>
            {n != null && <span className="font-move">{n}</span>}
          </div>
        </div>
        <FaAngleRight className="align-end" />
      </Button>
    </Link>
  );
};
const GeneratedPokemonList = () => {
  const { content: e } = useGeneratorContent(),
    [t, n] = React.useState([]),
    r = e ?? [];
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
            {r.length === 0 && (
              <Text size="text-md" className="text-center">
                {" "}
                - No Generated Pokemon -{" "}
              </Text>
            )}
            {t
              .filter((o) => !r.includes(o))
              .map((o) => (
                <StaticPokemonProvider
                  key={o.id}
                  pokemon={o}
                  isLocked={t.includes(o)}
                  lockedPressed={() => {
                    t.includes(o) ? n(t.filter((s) => s !== o)) : n([...t, o]);
                  }}
                >
                  <PokemonSheet showButtons="addAndLock" />
                </StaticPokemonProvider>
              ))}
            {r.map((o) => (
              <StaticPokemonProvider
                key={o.id}
                pokemon={o}
                isLocked={t.includes(o)}
                lockedPressed={() => {
                  t.includes(o) ? n(t.filter((s) => s !== o)) : n([...t, o]);
                }}
              >
                <PokemonSheet showButtons="addAndLock" />
              </StaticPokemonProvider>
            ))}
          </div>
        </div>
      </ScrollArea>
    </Box>
  );
};
const GeneratedItemList = () => {
  const { content: e } = useGeneratorContent(),
    t = e ?? [];
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
            {t.length === 0 && (
              <Text size="text-md" className="text-center col-span-full">
                {" "}
                - No Generated Items -{" "}
              </Text>
            )}
            {t.map((n, r) => (
              <div
                key={r}
                className="flex flex-row items-center col-span-full xl:col-span-1 gap-4"
              >
                <Text size="text-3xl" font="font-move" className="text-center">
                  {n.count}x
                </Text>
                <ItemCard item={n.item} className="flex-grow" />
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </Box>
  );
};
const GeneratorPanel = () => {
  const { generator: e } = useParams(),
    t = useMediaQuery("(min-width: 768px)");
  if (e === undefined)
    return (
      <div className="flex flex-col justify-center items-center h-full gap-2">
        <Text size="text-5xl" color="text-white">
          No Generator Selected
        </Text>
        <Text size="text-2xl" color="text-white" font="font-move">
          {"Please select a generator "}
          {t ? "from the left" : "above"}
        </Text>
      </div>
    );
  const n = {
    pokemon: <GeneratedPokemonList />,
    items: <GeneratedItemList />,
  };
  return <>{n[e]}</>;
};
const SeedInput = ({
  value: e,
  onChange: t,
  useRandomSeed: n,
  setUseRandomSeed: r,
}) => (
  <>
    <Text font="font-move" size="text-xl">
      Seed
    </Text>
    <Input
      type="number"
      value={e}
      onChange={(o) => (t == null ? undefined : t(o.target.value))}
      disabled={n}
    />
    <Text font="font-move" size="text-sm">
      Random Seed
    </Text>
    <Checkbox
      checked={n}
      onCheckedChange={(o) => {
        typeof o == "boolean" && r(o);
      }}
    />
  </>
);
const formatHabitat = (e) => {
  switch (e) {
    case Habitat.CITIES:
      return "Cities";
    case Habitat.TEMPERATE_DECIDUOUS_FORESTS:
      return "Temperate Deciduous Forests";
    case Habitat.BADLANDS_SCRUBLANDS_AND_WASTELANDS:
      return "Badlands, Scrublands, and Wastelands";
    case Habitat.ELECTROMAGNETICALLY_ACTIVE_AREAS:
      return "Electromagnetically Active Areas";
    case Habitat.WOODLANDS:
      return "Woodlands";
    case Habitat.TROPICAL_JUNGLES:
      return "Tropical Jungles";
    case Habitat.CAVES:
      return "Caves";
    case Habitat.FIELDS_AND_MEADOWS:
      return "Fields and Meadows";
    case Habitat.SWAMPS_BOGS_AND_MARSHES:
      return "Swamps, Bogs, and Marshes";
    case Habitat.GRASSLANDS_SAVANNAS_PLAINS_AND_PRAIRIES:
      return "Grasslands, Savannas, Plains, and Prairies";
    case Habitat.MOUNTAINS:
      return "Mountains";
    case Habitat.RUINS_AND_CEMETERIES:
      return "Ruins and Cemeteries";
    case Habitat.TUNDRAS_AND_BOREAL_FORESTS:
      return "Tundras and Boreal Forests";
    case Habitat.LAKESIDES_AND_RIVERSIDES:
      return "Lakesides and Riversides";
    case Habitat.GLACIERS_MOUNTAIN_PEAKS_AND_ICY_CAVES:
      return "Glaciers, Mountain Peaks, and Icy Caves";
    case Habitat.VOLCANOES:
      return "Volcanoes";
    case Habitat.LAKES:
      return "Lakes";
    case Habitat.BEACHES:
      return "Beaches";
    case Habitat.PONDS:
      return "Ponds";
    case Habitat.STREAMS_AND_RIVERS:
      return "Streams and Rivers";
    case Habitat.OCEANIC_ABYSSES:
      return "Oceanic Abysses";
    case Habitat.POLAR_SEAS:
      return "Polar Seas";
    case Habitat.TROPICAL_SEAS_AND_CORAL_REEFS:
      return "Tropical Seas and Coral Reefs";
    case Habitat.OPEN_OCEAN_AND_THE_CONTINENTAL_SHELF:
      return "Open Ocean and the Continental Shelf";
    case Habitat.DESERTS:
      return "Deserts";
  }
};
const PokemonGenerator = () => {
  var h, m, v;
  const { setContent: e } = useGeneratorContent(),
    [t, n] = React.useState(true),
    [r, o] = React.useState(false),
    { toast: s } = useToast(),
    [i, l] = React.useState({
      seed: new Date().getTime(),
      rankUpMethod: RankUpMethod.RANDOM,
      habitats: [],
      includeLegendary: LegendaryFilter.NONE,
      numberToGenerate: 1,
      pokemonTemplateId: undefined,
      rankOrBelow: true,
      rank: Rank.STARTER,
    }),
    { mutate: c } = usePokemonControllerGenerate({
      onSuccess: (g) => {
        e(g), o(false);
      },
      onError: () => {
        o(false),
          s({
            title: "Failed to generate pokemon",
            description: "Please try again",
          });
      },
    }),
    { state: u } = useCampaignFilter(),
    { isAuthenticated: f } = useAuth(),
    p = () => {
      const g = {
        ...i,
      };
      t && ((g.seed = new Date().getTime()), l(g));
      const b = f
        ? {
            campaignIds: u.campaignIds,
            includeCore: u.includeCore,
          }
        : {
            campaignIds: [],
            includeCore: true,
          };
      o(true),
        c({
          body: {
            ...g,
            ...b,
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
          value={i.numberToGenerate}
          onChange={(g) => {
            l({
              ...i,
              numberToGenerate: isNaN(parseInt(g.target.value))
                ? 0
                : parseInt(g.target.value),
            }),
              (g.target.value = i.numberToGenerate.toString());
          }}
          className="max-w-16 text-center"
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <Text font="font-move" size="text-xl">
          Pokemon
        </Text>
        <CampaignFilter
          onChange={(g) => {
            l({
              ...i,
              pokemonTemplateId: g,
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
          items={Object.values(Rank).map((g) => ({
            label: (
              <div className="flex items-center space-x-1">
                <RankIcon rank={Rank[g]} size="sm" /> <span>{g}</span>
              </div>
            ),
            searchValue: g,
            value: g.toLowerCase(),
          }))}
          value={i.rank.toLowerCase()}
          onChange={(g) => {
            l({
              ...i,
              rank:
                Object.values(Rank).find((b) => b.toLowerCase() === g) ??
                i.rank,
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
          items={Object.values(RankUpMethod).map((g) => ({
            label: g.replace(/_/g, " "),
            value: g.toLowerCase(),
          }))}
          value={(h = i.rankUpMethod) == null ? undefined : h.toLowerCase()}
          onChange={(g) => {
            l({
              ...i,
              rankUpMethod: g.toUpperCase(),
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
          value={(m = i.includeLegendary) == null ? undefined : m.toLowerCase()}
          onChange={(g) => {
            l({
              ...i,
              includeLegendary: g.toUpperCase(),
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
          options={Object.values(Habitat).map((g) => ({
            label: formatHabitat(g),
            value: Habitat[g],
          }))}
          selected={
            ((v = i.habitats) == null ? undefined : v.map((g) => Habitat[g])) ??
            []
          }
          onChange={(g) => {
            l({
              ...i,
              habitats: g.map((b) => b),
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
          checked={i.rankOrBelow}
          onCheckedChange={(g) => {
            l({
              ...i,
              rankOrBelow: g === "indeterminate" ? true : g,
            });
          }}
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <SeedInput
          value={i.seed}
          onChange={(g) => {
            l({
              ...i,
              seed: parseInt(g),
            });
          }}
          useRandomSeed={t}
          setUseRandomSeed={n}
        />
      </div>
      <Button
        id="generator-generate-button"
        onClick={p}
        disabled={
          i.numberToGenerate < 1 ||
          i.numberToGenerate == null ||
          i.numberToGenerate === undefined ||
          r
        }
      >
        {r ? <LoadingSpinner className="h-6" /> : "Generate"}
      </Button>
    </Box>
  );
};
const ItemGenerator = ({ className: e }) => {
  var h, m;
  const { setContent: t } = useGeneratorContent(),
    [n, r] = React.useState(true),
    [o, s] = React.useState(false),
    [i, l] = React.useState({
      seed: new Date().getTime(),
      numberToGenerate: 1,
      categories: [],
      pockets: [],
    }),
    { mutate: c } = useItemsControllerGenerate({
      onSuccess: (v) => {
        t(v), s(false);
      },
    }),
    { state: u } = useCampaignFilter(),
    { isAuthenticated: f } = useAuth(),
    p = () => {
      const v = {
        ...i,
      };
      n && ((v.seed = new Date().getTime()), l(v));
      const g = f
        ? {
            campaignIds: u.campaignIds,
            includeCore: u.includeCore,
          }
        : {
            campaignIds: [],
            includeCore: true,
          };
      s(true),
        c({
          body: {
            ...v,
            ...g,
          },
        });
    };
  return (
    <Box color="bg-pokerole-beige" className={cn("p-2 flex flex-col gap-2", e)}>
      <Text size="text-2xl" color="text-pokerole-black" className="text-center">
        Item Generator
      </Text>
      <div className="flex flex-row gap-2 items-center">
        <Text font="font-move" size="text-xl" className="whitespace-nowrap">
          Number to Generate
        </Text>
        <Input
          type="number"
          value={i.numberToGenerate}
          onChange={(v) => {
            l({
              ...i,
              numberToGenerate: isNaN(parseInt(v.target.value))
                ? 0
                : parseInt(v.target.value),
            }),
              (v.target.value = i.numberToGenerate.toString());
          }}
          className="max-w-16 text-center"
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <Text font="font-move" size="text-xl">
          Pockets
        </Text>
        <MultiSelect
          options={Object.values(ItemPocket).map((v) => ({
            label: v.replace(/_/g, " "),
            value: v.toLowerCase(),
          }))}
          selected={
            ((h = i.pockets) == null
              ? undefined
              : h.map((v) => v.toLowerCase())) ?? []
          }
          onChange={(v) => {
            l({
              ...i,
              pockets: v.map((g) => g.toUpperCase()),
            });
          }}
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <Text font="font-move" size="text-xl">
          Categories
        </Text>
        <MultiSelect
          options={Object.values(ItemCategory).map((v) => ({
            label: v.replace(/_/g, " "),
            value: v.toLowerCase(),
          }))}
          selected={
            ((m = i.categories) == null
              ? undefined
              : m.map((v) => v.toLowerCase())) ?? []
          }
          onChange={(v) => {
            l({
              ...i,
              categories: v.map((g) => g.toUpperCase()),
            });
          }}
        />
      </div>
      <div className="flex flex-row gap-2 items-center flex-grow">
        <SeedInput
          value={i.seed}
          onChange={(v) => {
            l({
              ...i,
              seed: parseInt(v),
            });
          }}
          useRandomSeed={n}
          setUseRandomSeed={r}
        />
      </div>
      <Button
        onClick={p}
        disabled={
          i.numberToGenerate < 1 ||
          i.numberToGenerate == null ||
          i.numberToGenerate === undefined ||
          o
        }
      >
        {o ? <LoadingSpinner className="h-6" /> : "Generate"}
      </Button>
    </Box>
  );
};
const SelectedGenerator = () => {
  const { generator: e } = useParams();
  if (e === undefined) return <></>;
  const t = {
    pokemon: <PokemonGenerator />,
    items: <ItemGenerator />,
  };
  return <>{t[e]}</>;
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
