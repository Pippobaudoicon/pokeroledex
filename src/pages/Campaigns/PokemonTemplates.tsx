// @ts-nocheck
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { FaGenderless, FaMars, FaVenus } from "react-icons/fa";
import { FaPenToSquare, FaPlus, FaTrash } from "react-icons/fa6";
import { TbGenderBigender } from "react-icons/tb";
import { v4 } from "uuid";
import {
  fetchPokemonTemplatesControllerFindAllByCampaign,
  useAbilitiesControllerFindAllByCampaign,
  useMovesControllerFindAllByCampaign,
  usePokemonTemplatesControllerCreate,
  usePokemonTemplatesControllerFindAllByCampaign,
  usePokemonTemplatesControllerRemove,
  usePokemonTemplatesControllerUpdate,
} from "@/api/components";
import { useApiContext } from "@/api/context";
import {
  EvolutionDirection,
  EvolutionKind,
  Habitat,
  PokemonType,
  Rank,
} from "@/api/schemas";
import { Combobox } from "@/components/Combobox";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MultiSelect } from "@/components/MultiSelect";
import { RankIcon } from "@/components/RankIcon";
import { RankSelect } from "@/components/RankSelect";
import { Text } from "@/components/Text";
import { TypeBadge } from "@/components/TypeBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatEnumName } from "@/lib/utils";
import { useCampaign } from "@/pages/Campaigns/context";
const NO_GENDER_VALUE = "both";
const genderTypeOptions = [
  {
    label: (
      <div className="flex items-center gap-2">
        <FaMars color="#03adfc" size={18} />
        <span>Male</span>
      </div>
    ),
    value: "m",
    searchValue: "Male",
  },
  {
    label: (
      <div className="flex items-center gap-2">
        <FaVenus color="#f781f1" size={18} />
        <span>Female</span>
      </div>
    ),
    value: "f",
    searchValue: "Female",
  },
  {
    label: (
      <div className="flex items-center gap-2">
        <FaGenderless color="gray" size={18} />
        <span>Neutral</span>
      </div>
    ),
    value: "n",
    searchValue: "Neutral",
  },
  {
    label: (
      <div className="flex items-center gap-2">
        <TbGenderBigender color="#9b59b6" size={18} />
        <span>Both</span>
      </div>
    ),
    value: NO_GENDER_VALUE,
    searchValue: "Both",
  },
];
function GenderTypeSelect({
  value: e,
  disabled: t = false,
  onChange: n,
  className: r,
}) {
  const o = (l) =>
      l === "" ? NO_GENDER_VALUE : l == null ? undefined : l.toLowerCase(),
    s = (l) => (l === NO_GENDER_VALUE ? "" : l.toUpperCase()),
    i = (l) => {
      n != null && n(s(l));
    };
  return (
    <Combobox
      items={genderTypeOptions}
      value={o(e)}
      disabled={t}
      onChange={i}
      className={r}
      placeholder="Select gender..."
    />
  );
}
const MIN_ATTRIBUTES = {
  strength: 1,
  dexterity: 1,
  vitality: 1,
  special: 1,
  insight: 1,
};
const MAX_ATTRIBUTES = {
  strength: 5,
  dexterity: 5,
  vitality: 5,
  special: 5,
  insight: 5,
};
const emptyPokemonTemplate = () => ({
  name: "",
  dexID: "",
  number: 0,
  types: [],
  recommendedRank: Rank.STARTER,
  dexCategory: "",
  image: "",
  legendary: false,
  goodStarter: false,
  genderType: "",
  baseHp: 3,
  height: 1,
  weight: 10,
  baseStats: {
    ...MIN_ATTRIBUTES,
  },
  maxStats: {
    ...MAX_ATTRIBUTES,
  },
  abilityOneId: "",
  abilityTwoId: "",
  hiddenAbilityId: "",
  eventAbilityId: "",
  habitats: [],
  moves: [],
  evolutions: [],
  description: "",
});
const PokemonTemplateForm = ({
  formData: e,
  onChange: t,
  abilities: n,
  moves: r,
  pokemonTemplates: o,
  isLoadingData: s,
}) => {
  const i = (w, N) => {
      t({
        ...e,
        [w]: N,
      });
    },
    l = (w, N) => {
      t({
        ...e,
        baseStats: {
          ...e.baseStats,
          [w]: N,
        },
      });
    },
    c = (w, N) => {
      t({
        ...e,
        maxStats: {
          ...e.maxStats,
          [w]: N,
        },
      });
    },
    u = () => {
      t({
        ...e,
        moves: [
          ...e.moves,
          {
            moveId: "",
            rank: Rank.STARTER,
          },
        ],
      });
    },
    f = (w) => {
      const N = [...e.moves];
      N.splice(w, 1),
        t({
          ...e,
          moves: N,
        });
    },
    p = (w, N, k) => {
      const T = [...e.moves];
      (T[w] = {
        ...T[w],
        [N]: k,
      }),
        t({
          ...e,
          moves: T,
        });
    },
    h = () => {
      t({
        ...e,
        evolutions: [
          ...e.evolutions,
          {
            type: EvolutionDirection.FROM,
            kind: EvolutionKind.LEVEL,
            targetId: "",
            speed: "Medium",
          },
        ],
      });
    },
    m = (w) => {
      const N = [...e.evolutions];
      N.splice(w, 1),
        t({
          ...e,
          evolutions: N,
        });
    },
    v = (w, N, k) => {
      const T = [...e.evolutions];
      (T[w] = {
        ...T[w],
        [N]: k,
      }),
        t({
          ...e,
          evolutions: T,
        });
    },
    g = Object.values(PokemonType).map((w) => ({
      label: formatEnumName(w),
      value: w,
    })),
    b = Object.values(Habitat)
      .map((w) => ({
        label: formatEnumName(w),
        value: w,
      }))
      .sort((w, N) => w.label.localeCompare(N.label)),
    x = n.map((w) => ({
      label: w.name,
      value: w.id,
    })),
    y = r.map((w) => ({
      label: `${w.name} (${formatEnumName(w.type)})`,
      value: w.id,
    })),
    S = o.map((w) => ({
      label: w.name,
      value: w.id,
    })),
    E = Object.values(EvolutionDirection).map((w) => ({
      label: formatEnumName(w),
      value: w,
    })),
    j = Object.values(EvolutionKind).map((w) => ({
      label: formatEnumName(w),
      value: w,
    }));
  return s ? (
    <div className="flex items-center justify-center py-8">
      <Text>Loading form data...</Text>
    </div>
  ) : (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="flex flex-col gap-6 p-1">
        <div className="space-y-3">
          <Text size="text-lg" className="font-bold border-b pb-1">
            Basic Identity
          </Text>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="col-span-1 md:col-span-3">
              <Text font="font-move" className="text-sm font-medium">
                Name *
              </Text>
              <Input
                placeholder="Pokemon name"
                value={e.name}
                onChange={(w) => {
                  i("name", w.target.value);
                }}
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Text font="font-move" className="text-sm font-medium">
                Dex ID
              </Text>
              <Input
                placeholder="0001"
                value={e.dexID}
                onChange={(w) => {
                  i("dexID", w.target.value);
                }}
              />
            </div>
            <div className="col-span-1 md:col-span-1">
              <Text font="font-move" className="text-sm font-medium">
                #
              </Text>
              <Input
                type="number"
                placeholder="1"
                value={e.number}
                onChange={(w) => {
                  const N = parseInt(w.target.value, 10);
                  i("number", Number.isNaN(N) ? 0 : N);
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Types *
              </Text>
              <MultiSelect
                options={g}
                selected={e.types}
                onChange={(w) => {
                  i("types", w);
                }}
                placeholder="Select types..."
                maxSelected={2}
                exceedMessage="You can select at most 2 types."
              />
            </div>
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Recommended Rank *
              </Text>
              <RankSelect
                rank={e.recommendedRank}
                onSelect={(w) => {
                  w != null && i("recommendedRank", w);
                }}
                comboBoxClassName="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Dex Category
              </Text>
              <Input
                placeholder="e.g., Seed Pokémon"
                value={e.dexCategory}
                onChange={(w) => {
                  i("dexCategory", w.target.value);
                }}
              />
            </div>
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Image URL
              </Text>
              <Input
                placeholder="pokemon.png"
                value={e.image}
                onChange={(w) => {
                  i("image", w.target.value);
                }}
              />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <Text size="text-lg" className="font-bold border-b pb-1">
            Characteristics
          </Text>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <div className="flex items-center gap-2">
              <Checkbox
                id="legendary"
                checked={e.legendary}
                onCheckedChange={(w) => {
                  i("legendary", w === true);
                }}
              />
              <Text font="font-move" className="text-sm">
                Legendary
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="goodStarter"
                checked={e.goodStarter}
                onCheckedChange={(w) => {
                  i("goodStarter", w === true);
                }}
              />
              <Text font="font-move" className="text-sm">
                Good Starter
              </Text>
            </div>
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Gender Type
              </Text>
              <GenderTypeSelect
                value={e.genderType}
                onChange={(w) => {
                  i("genderType", w);
                }}
                className="ml-2"
              />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <Text size="text-lg" className="font-bold border-b pb-1">
            Physical Stats
          </Text>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Base HP *
              </Text>
              <Input
                type="number"
                min={1}
                value={e.baseHp}
                onChange={(w) => {
                  const N = parseInt(w.target.value, 10);
                  i("baseHp", Number.isNaN(N) ? 1 : N);
                }}
              />
            </div>
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Height (m)
              </Text>
              <Input
                type="number"
                step="0.1"
                min={0}
                value={e.height}
                onChange={(w) => {
                  const N = parseFloat(w.target.value);
                  i("height", Number.isNaN(N) ? 0 : N);
                }}
              />
            </div>
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Weight (kg)
              </Text>
              <Input
                type="number"
                step="0.1"
                min={0}
                value={e.weight}
                onChange={(w) => {
                  const N = parseFloat(w.target.value);
                  i("weight", Number.isNaN(N) ? 0 : N);
                }}
              />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <Text size="text-lg" className="font-bold border-b pb-1">
            Attributes
          </Text>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Text font="font-move" className="text-md">
              Stat
            </Text>
            <Text font="font-move" className="font-medium text-md text-center">
              Base
            </Text>
            <Text font="font-move" className="font-medium text-md text-center">
              Max
            </Text>
            {["strength", "dexterity", "vitality", "special", "insight"].map(
              (w) => (
                <>
                  <Text
                    key={`${w}-label`}
                    font="font-move"
                    className="text-sm flex items-center capitalize"
                  >
                    {w}
                  </Text>
                  <Input
                    key={`${w}-base`}
                    type="number"
                    min={0}
                    max={10}
                    value={e.baseStats[w]}
                    onChange={(N) => {
                      const k = parseInt(N.target.value, 10);
                      l(w, Number.isNaN(k) ? 0 : k);
                    }}
                    className="text-center"
                  />
                  <Input
                    key={`${w}-max`}
                    type="number"
                    min={0}
                    max={10}
                    value={e.maxStats[w]}
                    onChange={(N) => {
                      const k = parseInt(N.target.value, 10);
                      c(w, Number.isNaN(k) ? 0 : k);
                    }}
                    className="text-center"
                  />
                </>
              ),
            )}
          </div>
        </div>
        <div className="space-y-3">
          <Text size="text-lg" className="font-bold border-b pb-1">
            Abilities
          </Text>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Ability 1 *
              </Text>
              <Combobox
                items={x}
                value={e.abilityOneId}
                onChange={(w) => {
                  i("abilityOneId", w ?? "");
                }}
                className="w-full"
              />
            </div>
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Ability 2
              </Text>
              <Combobox
                items={x}
                value={e.abilityTwoId}
                onChange={(w) => {
                  i("abilityTwoId", w ?? "");
                }}
                className="w-full"
              />
            </div>
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Hidden Ability
              </Text>
              <Combobox
                items={x}
                value={e.hiddenAbilityId}
                onChange={(w) => {
                  i("hiddenAbilityId", w ?? "");
                }}
                className="w-full"
              />
            </div>
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Event Ability
              </Text>
              <Combobox
                items={x}
                value={e.eventAbilityId}
                onChange={(w) => {
                  i("eventAbilityId", w ?? "");
                }}
                className="w-full"
              />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <Text size="text-lg" className="font-bold border-b pb-1">
            Habitats
          </Text>
          <MultiSelect
            options={b}
            selected={e.habitats}
            onChange={(w) => {
              i("habitats", w);
            }}
            placeholder="Select habitats..."
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-1">
            <Text size="text-lg" className="font-bold">
              Moves
            </Text>
            <div>
              <Button
                type="button"
                variant="green"
                size="equalPadding"
                onClick={u}
              >
                <FaPlus size={16} />
              </Button>
            </div>
          </div>
          {e.moves.length === 0 ? (
            <Text
              color="text-pokerole-black-light"
              size="text-sm"
              className="text-center py-2"
            >
              No moves added. Click + to add learnable moves.
            </Text>
          ) : (
            <div className="space-y-2">
              {e.moves.map((w, N) => (
                <div
                  key={N}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-1 md:col-span-6">
                    <Combobox
                      items={y}
                      value={w.moveId}
                      onChange={(k) => {
                        p(N, "moveId", k ?? "");
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-5">
                    <RankSelect
                      rank={w.rank}
                      onSelect={(k) => {
                        k != null && p(N, "rank", k);
                      }}
                      comboBoxClassName="w-full"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-1 justify-center flex">
                    <Button
                      type="button"
                      variant="red"
                      size="equalPadding"
                      onClick={() => {
                        f(N);
                      }}
                    >
                      <FaTrash size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-1">
            <Text size="text-lg" className="font-bold">
              Evolutions
            </Text>
            <div>
              <Button
                type="button"
                variant="green"
                size="equalPadding"
                onClick={h}
              >
                <FaPlus size={16} />
              </Button>
            </div>
          </div>
          {e.evolutions.length === 0 ? (
            <Text
              color="text-pokerole-black-light"
              size="text-sm"
              className="text-center py-2"
            >
              No evolutions added. Click + to add evolution paths.
            </Text>
          ) : (
            <div className="space-y-2">
              {e.evolutions.map((w, N) => (
                <div
                  key={N}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-1 md:col-span-3">
                    <Combobox
                      items={[
                        ...S,
                        {
                          label: w.targetId,
                          value: w.targetId,
                        },
                      ]}
                      value={w.targetId}
                      onChange={(k) => {
                        v(N, "targetId", k ?? "");
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Combobox
                      items={E}
                      value={w.type}
                      onChange={(k) => {
                        v(N, "type", k);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Combobox
                      items={j}
                      value={w.kind}
                      onChange={(k) => {
                        v(N, "kind", k);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Input
                      placeholder="Speed"
                      value={w.speed ?? ""}
                      onChange={(k) => {
                        v(N, "speed", k.target.value);
                      }}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Input
                      placeholder="Item"
                      value={w.item ?? ""}
                      onChange={(k) => {
                        v(N, "item", k.target.value);
                      }}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-1 justify-center flex">
                    <Button
                      type="button"
                      variant="red"
                      size="equalPadding"
                      onClick={() => {
                        m(N);
                      }}
                    >
                      <FaTrash size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <Text size="text-lg" className="font-bold border-b pb-1">
            Description
          </Text>
          <Textarea
            placeholder="Enter the Pokédex description..."
            value={e.description}
            onChange={(w) => {
              i("description", w.target.value);
            }}
            rows={4}
          />
        </div>
      </div>
    </ScrollArea>
  );
};
const CreatePokemonTemplateDialog = ({ trigger: e }) => {
  const [t, n] = React.useState(false),
    [r, o] = React.useState(emptyPokemonTemplate()),
    [s, i] = React.useState([]),
    [l, c] = React.useState([]),
    [u, f] = React.useState([]),
    [p, h] = React.useState(true),
    { campaign: m } = useCampaign(),
    { toast: v } = useToast(),
    g = useQueryClient(),
    b = React.useRef(0),
    { mutate: x } = useAbilitiesControllerFindAllByCampaign({
      onSuccess: (k) => {
        const T = [...k].sort((O, A) => O.name.localeCompare(A.name));
        i(T), (b.current -= 1), b.current <= 0 && h(false);
      },
      onError: () => {
        (b.current -= 1), b.current <= 0 && h(false);
      },
    }),
    { mutate: y } = useMovesControllerFindAllByCampaign({
      onSuccess: (k) => {
        const T = [...k].sort((O, A) => O.name.localeCompare(A.name));
        c(T), (b.current -= 1), b.current <= 0 && h(false);
      },
      onError: () => {
        (b.current -= 1), b.current <= 0 && h(false);
      },
    }),
    { mutate: S } = usePokemonTemplatesControllerFindAllByCampaign({
      onSuccess: (k) => {
        const T = [...k].sort((O, A) => O.name.localeCompare(A.name));
        f(T), (b.current -= 1), b.current <= 0 && h(false);
      },
      onError: () => {
        (b.current -= 1), b.current <= 0 && h(false);
      },
    }),
    { mutate: E, isPending: j } = usePokemonTemplatesControllerCreate({
      onSuccess: () => {
        v({
          title: "Pokemon Template Created",
          description: `${r.name} has been created successfully.`,
        }),
          g.invalidateQueries({
            predicate: (k) => {
              var T, O;
              return (
                ((O = (T = k.queryKey[0]) == null ? undefined : T.includes) ==
                null
                  ? undefined
                  : O.call(T, "pokemon-templates")) ?? false
              );
            },
          }),
          n(false),
          o(emptyPokemonTemplate());
      },
      onError: (k) => {
        v({
          title: "Failed to create Pokemon Template",
          description:
            (k == null ? undefined : k.payload) ?? "An error occurred",
          variant: "destructive",
        });
      },
    });
  React.useEffect(() => {
    t &&
      m !== undefined &&
      (h(true),
      (b.current = 3),
      x({
        pathParams: {
          id: m.id,
        },
        body: {
          includeCore: true,
        },
      }),
      y({
        pathParams: {
          id: m.id,
        },
        body: {
          includeCore: true,
        },
      }),
      S({
        pathParams: {
          id: m.id,
        },
        body: {
          includeCore: true,
        },
      }));
  }, [t, m]);
  const w = () => {
      if (m === undefined) return;
      if (r.name.trim() === "") {
        v({
          title: "Validation Error",
          description: "Name is required.",
          variant: "destructive",
        });
        return;
      }
      if (r.types.length === 0) {
        v({
          title: "Validation Error",
          description: "At least one type is required.",
          variant: "destructive",
        });
        return;
      }
      if (r.abilityOneId === "") {
        v({
          title: "Validation Error",
          description: "Ability 1 is required.",
          variant: "destructive",
        });
        return;
      }
      const k = r.moves
        .filter((T) => T.moveId !== "")
        .map((T) => ({
          rank: T.rank,
          moveId: T.moveId,
        }));
      E({
        body: {
          id: v4(),
          campaignId: m.id,
          name: r.name,
          dexID:
            r.dexID !== "" ? r.dexID : r.number.toString().padStart(4, "0"),
          number: r.number,
          types: r.types,
          recommendedRank: r.recommendedRank,
          dexCategory: r.dexCategory,
          image: r.image,
          legendary: r.legendary,
          goodStarter: r.goodStarter,
          genderType: r.genderType !== "" ? r.genderType : undefined,
          baseHp: r.baseHp,
          height: r.height,
          weight: r.weight,
          baseStats: r.baseStats,
          maxStats: r.maxStats,
          abilityOneId: r.abilityOneId,
          abilityTwoId: r.abilityTwoId !== "" ? r.abilityTwoId : undefined,
          hiddenAbilityId:
            r.hiddenAbilityId !== "" ? r.hiddenAbilityId : undefined,
          eventAbilityId:
            r.eventAbilityId !== "" ? r.eventAbilityId : undefined,
          habitats: r.habitats,
          possibleMoves: k,
          evolutions: r.evolutions,
          description: r.description !== "" ? r.description : undefined,
        },
      });
    },
    N = r.name.trim() !== "" && r.types.length > 0 && r.abilityOneId !== "";
  return (
    <Dialog open={t} onOpenChange={n}>
      <DialogTrigger asChild={true}>{e}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add Pokemon Template</DialogTitle>
          <DialogDescription>
            Create a new custom Pokemon template for this campaign.
          </DialogDescription>
        </DialogHeader>
        <PokemonTemplateForm
          formData={r}
          onChange={o}
          abilities={s}
          moves={l}
          pokemonTemplates={u}
          isLoadingData={p}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              n(false);
            }}
            disabled={j}
          >
            Cancel
          </Button>
          <Button variant="green" onClick={w} disabled={!N || j}>
            {j ? "Creating..." : "Create Pokemon Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const EditPokemonTemplateDialog = ({ trigger: e, pokemonTemplate: t }) => {
  const [n, r] = React.useState(false),
    [o, s] = React.useState(emptyPokemonTemplate()),
    [i, l] = React.useState([]),
    [c, u] = React.useState([]),
    [f, p] = React.useState([]),
    [h, m] = React.useState(true),
    { campaign: v } = useCampaign(),
    { toast: g } = useToast(),
    b = useQueryClient(),
    x = React.useRef(0),
    { mutate: y } = useAbilitiesControllerFindAllByCampaign({
      onSuccess: (O) => {
        const A = [...O].sort(($, Y) => $.name.localeCompare(Y.name));
        l(A), (x.current -= 1), x.current <= 0 && m(false);
      },
      onError: () => {
        (x.current -= 1), x.current <= 0 && m(false);
      },
    }),
    { mutate: S } = useMovesControllerFindAllByCampaign({
      onSuccess: (O) => {
        const A = [...O].sort(($, Y) => $.name.localeCompare(Y.name));
        u(A), (x.current -= 1), x.current <= 0 && m(false);
      },
      onError: () => {
        (x.current -= 1), x.current <= 0 && m(false);
      },
    }),
    { mutate: E } = usePokemonTemplatesControllerFindAllByCampaign({
      onSuccess: (O) => {
        const A = [...O].sort(($, Y) => $.name.localeCompare(Y.name));
        p(A), (x.current -= 1), x.current <= 0 && m(false);
      },
      onError: () => {
        (x.current -= 1), x.current <= 0 && m(false);
      },
    }),
    { mutate: j, isPending: w } = usePokemonTemplatesControllerUpdate({
      onSuccess: () => {
        g({
          title: "Pokemon Template Updated",
          description: `${o.name} updated successfully.`,
        }),
          b.invalidateQueries({
            predicate: (O) => {
              var A, $;
              return (
                (($ = (A = O.queryKey[0]) == null ? undefined : A.includes) ==
                null
                  ? undefined
                  : $.call(A, "pokemon-templates")) ?? false
              );
            },
          }),
          r(false);
      },
      onError: (O) => {
        g({
          title: "Failed to update Pokemon Template",
          description:
            (O == null ? undefined : O.payload) ?? "An error occurred",
          variant: "destructive",
        });
      },
    }),
    N = (O) => {
      var A, $, Y, F;
      return {
        name: O.name ?? "",
        dexID: O.dexID ?? "",
        number: O.number ?? 0,
        types: O.types ?? [],
        recommendedRank: O.recommendedRank,
        dexCategory: O.dexCategory ?? "",
        image: O.image ?? "",
        legendary: O.legendary ?? false,
        goodStarter: O.goodStarter ?? false,
        genderType: O.genderType ?? "",
        baseHp: O.baseHp ?? 1,
        height: O.height ?? 0,
        weight: O.weight ?? 0,
        baseStats: O.baseStats ?? emptyPokemonTemplate().baseStats,
        maxStats: O.maxStats ?? emptyPokemonTemplate().maxStats,
        abilityOneId: ((A = O.abilityOne) == null ? undefined : A.id) ?? "",
        abilityTwoId: (($ = O.abilityTwo) == null ? undefined : $.id) ?? "",
        hiddenAbilityId:
          ((Y = O.hiddenAbility) == null ? undefined : Y.id) ?? "",
        eventAbilityId: ((F = O.eventAbility) == null ? undefined : F.id) ?? "",
        habitats: O.habitats ?? [],
        moves: (O.possibleMoves ?? []).map((ne) => ({
          moveId: ne.move.id,
          rank: ne.rank,
        })),
        evolutions: O.evolutions ?? [],
        description: O.description ?? "",
      };
    };
  React.useEffect(() => {
    n &&
      v !== undefined &&
      (m(true),
      (x.current = 3),
      y({
        pathParams: {
          id: v.id,
        },
        body: {
          includeCore: true,
        },
      }),
      S({
        pathParams: {
          id: v.id,
        },
        body: {
          includeCore: true,
        },
      }),
      E({
        pathParams: {
          id: v.id,
        },
        body: {
          includeCore: true,
        },
      }),
      s(N(t)));
  }, [n, v, t]);
  const k = () => {
      if (t === undefined) return;
      if (o.name.trim() === "") {
        g({
          title: "Validation Error",
          description: "Name is required.",
          variant: "destructive",
        });
        return;
      }
      if (o.types.length === 0) {
        g({
          title: "Validation Error",
          description: "At least one type is required.",
          variant: "destructive",
        });
        return;
      }
      if (o.abilityOneId === "") {
        g({
          title: "Validation Error",
          description: "Ability 1 is required.",
          variant: "destructive",
        });
        return;
      }
      const O = N(t),
        A = (ge, Me) => JSON.stringify(ge) === JSON.stringify(Me),
        $ = {
          id: t.id,
        };
      o.name !== O.name && ($.name = o.name),
        o.number !== O.number && ($.number = o.number);
      const Y = o.dexID !== "" ? o.dexID : o.number.toString().padStart(4, "0");
      Y !== O.dexID && ($.dexID = Y),
        o.dexCategory !== O.dexCategory && ($.dexCategory = o.dexCategory),
        o.image !== O.image && ($.image = o.image),
        o.legendary !== O.legendary && ($.legendary = o.legendary),
        o.goodStarter !== O.goodStarter && ($.goodStarter = o.goodStarter);
      const F = o.genderType !== "" ? o.genderType : undefined,
        ne = O.genderType !== "" ? O.genderType : undefined;
      F !== ne && ($.genderType = F),
        o.baseHp !== O.baseHp && ($.baseHp = o.baseHp),
        o.height !== O.height && ($.height = o.height),
        o.weight !== O.weight && ($.weight = o.weight);
      const se = o.description !== "" ? o.description : undefined,
        Z = O.description !== "" ? O.description : undefined;
      se !== Z && ($.description = se),
        A(o.types, O.types) || ($.types = o.types),
        o.recommendedRank !== O.recommendedRank &&
          ($.recommendedRank = o.recommendedRank),
        A(o.habitats, O.habitats) || ($.habitats = o.habitats),
        A(o.baseStats, O.baseStats) || ($.baseStats = o.baseStats),
        A(o.maxStats, O.maxStats) || ($.maxStats = o.maxStats),
        o.abilityOneId !== O.abilityOneId && ($.abilityOneId = o.abilityOneId);
      const z = o.abilityTwoId !== "" ? o.abilityTwoId : undefined,
        q = O.abilityTwoId !== "" ? O.abilityTwoId : undefined;
      z !== q && ($.abilityTwoId = z);
      const L = o.hiddenAbilityId !== "" ? o.hiddenAbilityId : undefined,
        B = O.hiddenAbilityId !== "" ? O.hiddenAbilityId : undefined;
      L !== B && ($.hiddenAbilityId = L);
      const V = o.eventAbilityId !== "" ? o.eventAbilityId : undefined,
        J = O.eventAbilityId !== "" ? O.eventAbilityId : undefined;
      V !== J && ($.eventAbilityId = V),
        A(o.evolutions, O.evolutions) || ($.evolutions = o.evolutions);
      const pe = [...o.moves]
          .filter((ge) => ge.moveId !== "")
          .sort(
            (ge, Me) =>
              ge.moveId.localeCompare(Me.moveId) ||
              ge.rank.localeCompare(Me.rank),
          ),
        $e = [...O.moves]
          .filter((ge) => ge.moveId !== "")
          .sort(
            (ge, Me) =>
              ge.moveId.localeCompare(Me.moveId) ||
              ge.rank.localeCompare(Me.rank),
          );
      if (!A(pe, $e)) {
        const ge = t.possibleMoves ?? [];
        $.possibleMoves = o.moves
          .filter((Me) => Me.moveId !== "")
          .map((Me) => {
            const vo = ge.find(
              (Dr) => Dr.move.id === Me.moveId && Dr.rank === Me.rank,
            );
            return {
              rank: Me.rank,
              moveId: Me.moveId,
              ...(vo
                ? {
                    id: vo.id,
                  }
                : {}),
            };
          });
      }
      j({
        body: $,
      });
    },
    T = o.name.trim() !== "" && o.types.length > 0 && o.abilityOneId !== "";
  return (
    <Dialog open={n} onOpenChange={r}>
      <DialogTrigger asChild={true}>{e}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Pokemon Template</DialogTitle>
          <DialogDescription>
            Update the selected Pokemon template for this campaign.
          </DialogDescription>
        </DialogHeader>
        <PokemonTemplateForm
          formData={o}
          onChange={s}
          abilities={i}
          moves={c}
          pokemonTemplates={f}
          isLoadingData={h}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              r(false);
            }}
            disabled={w}
          >
            Cancel
          </Button>
          <Button variant="green" onClick={k} disabled={!T || w}>
            {w ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const DeletePokemonTemplateDialog = ({ children: e, pokemonTemplate: t }) => {
  const [n, r] = React.useState(false),
    { toast: o } = useToast(),
    s = useQueryClient(),
    { mutate: i, isPending: l } = usePokemonTemplatesControllerRemove({
      onSuccess: () => {
        o({
          title: "Pokemon Template deleted",
          description: `${t.name} has been deleted.`,
        }),
          s.invalidateQueries({
            predicate: (u) => {
              var f, p;
              return (
                ((p = (f = u.queryKey[0]) == null ? undefined : f.includes) ==
                null
                  ? undefined
                  : p.call(f, "pokemon-templates")) ?? false
              );
            },
          }),
          r(false);
      },
      onError: (u) => {
        o({
          title: "Failed to delete Pokemon Template",
          description:
            (u == null ? undefined : u.payload) ?? "An error occurred",
          variant: "destructive",
        });
      },
    }),
    c = () => {
      i({
        pathParams: {
          id: t.id,
        },
      });
    };
  return (
    <Dialog open={n} onOpenChange={r}>
      <DialogTrigger asChild={true}>{e}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {"Are you sure you want to delete "}
            {t.name}?
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <Button variant="red" onClick={c} disabled={l}>
          {l ? "Deleting..." : "Delete"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
export const CampaignPokemonTemplates = () => {
  const { campaign: e } = useCampaign(),
    { fetcherOptions: t } = useApiContext(),
    n = [
      "pokemon-templates",
      "all",
      (e == null ? undefined : e.id) ?? "",
      {
        includeCore: false,
      },
    ],
    { data: r, isLoading: o } = useQuery({
      queryKey: n,
      queryFn: () =>
        fetchPokemonTemplatesControllerFindAllByCampaign(
          {
            ...t,
            pathParams: {
              id: (e == null ? undefined : e.id) ?? "",
            },
            body: {
              includeCore: false,
            },
          },
          undefined,
        ),
      enabled: !!(e != null && e.id),
    });
  if (e === undefined) return <div>No campaign selected</div>;
  if (o)
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  const s = (r ?? []).slice().sort((i, l) => (i.number ?? 0) - (l.number ?? 0));
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex flex-row items-center justify-between">
        <Text size="text-2xl" className="font-bold">
          Pokemon
        </Text>
        <CreatePokemonTemplateDialog
          trigger={
            <Button variant="green" size="sm">
              <FaPlus size={20} className="mr-1" />
              Add Pokemon Template
            </Button>
          }
        />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Types</TableHead>
              <TableHead>Recommended Rank</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Text color="text-pokerole-black-light">
                    {
                      'No Pokemon templates yet. Click "Add Pokemon Template" to create one.'
                    }
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              s.map((i) => {
                var l;
                return (
                  <TableRow key={i.id}>
                    <TableCell>{i.number}</TableCell>
                    <TableCell>{i.name}</TableCell>
                    <TableCell className="flex flex-row gap-1">
                      {(l = i.types) == null
                        ? undefined
                        : l.map((c) => (
                            <TypeBadge key={c} type={c} className="flex-1" />
                          ))}
                    </TableCell>
                    <TableCell>
                      <div className="max-h-8 max-w-8">
                        <RankIcon rank={i.recommendedRank} size="md" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-row justify-end">
                        <EditPokemonTemplateDialog
                          trigger={
                            <Button variant="ghost" size="icon">
                              <FaPenToSquare size={16} />
                            </Button>
                          }
                          pokemonTemplate={i}
                        />
                        <DeletePokemonTemplateDialog pokemonTemplate={i}>
                          <Button variant="ghost" size="icon">
                            <FaTrash size={16} />
                          </Button>
                        </DeletePokemonTemplateDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
