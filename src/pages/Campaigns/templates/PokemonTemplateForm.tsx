import { FaPlus, FaTrash } from "react-icons/fa6";
import { ATTRIBUTES } from "../../../../shared/types";
import { HABITAT_MACROS, habitatMacros, habitatName } from "../../../../shared/habitats";
import type * as T from "../../../../shared/types";
import {
  EvolutionDirection,
  EvolutionKind,
  Habitat,
  PokemonType,
  Rank,
} from "@/api/schemas";
import { Combobox } from "@/components/Combobox";
import { MultiSelect } from "@/components/MultiSelect";
import { RankSelect } from "@/components/RankSelect";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { formatEnumName } from "@/lib/utils";
import { GenderTypeSelect } from "@/pages/Campaigns/templates/GenderTypeSelect";

export interface FormMove {
  moveId: string;
  rank: Rank;
}

/** An evolution row as edited: its comboboxes yield "" when re-picked and speed is free text. */
export type FormEvolution = T.EvolutionBody;

/** Optional ids and texts are "" while unset. */
export interface TemplateFormData {
  name: string;
  dexID: string;
  number: number;
  /** The type options include TYPELESS and VARIES. */
  types: PokemonType[];
  recommendedRank: Rank;
  dexCategory: string;
  image: string;
  legendary: boolean;
  goodStarter: boolean;
  genderType: T.GenderType;
  baseHp: number;
  height: number;
  weight: number;
  baseStats: T.AttributeStats;
  maxStats: T.AttributeStats;
  abilityOneId: string;
  abilityTwoId: string;
  hiddenAbilityId: string;
  eventAbilityId: string;
  habitats: Habitat[];
  moves: FormMove[];
  evolutions: FormEvolution[];
  description: string;
}

export const emptyTemplateForm = (): TemplateFormData => ({
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
  baseStats: { strength: 1, dexterity: 1, vitality: 1, special: 1, insight: 1 },
  maxStats: { strength: 5, dexterity: 5, vitality: 5, special: 5, insight: 5 },
  abilityOneId: "",
  abilityTwoId: "",
  hiddenAbilityId: "",
  eventAbilityId: "",
  habitats: [],
  moves: [],
  evolutions: [],
  description: "",
});

/** The first missing required field, as a toast description; undefined when the form can be submitted. */
export const validationError = (form: TemplateFormData) => {
  if (form.name.trim() === "") return "Name is required.";
  if (form.types.length === 0) return "At least one type is required.";
  if (form.abilityOneId === "") return "Ability 1 is required.";
  return undefined;
};

const typeOptions = Object.values(PokemonType).map((type) => ({
  label: formatEnumName(type),
  value: type,
}));
const habitatOptions = Object.values(Habitat)
  .map((habitat) => ({ label: habitatName(habitat), value: habitat }))
  .sort((a, b) => a.label.localeCompare(b.label));
const evolutionDirectionOptions = Object.values(EvolutionDirection).map((direction) => ({
  label: formatEnumName(direction),
  value: direction,
}));
const evolutionKindOptions = Object.values(EvolutionKind).map((kind) => ({
  label: formatEnumName(kind),
  value: kind,
}));

export const PokemonTemplateForm = ({
  formData,
  onChange,
  abilities,
  moves,
  pokemonTemplates,
  isLoadingData,
}: {
  formData: TemplateFormData;
  onChange: (formData: TemplateFormData) => void;
  abilities: T.Ability[];
  moves: T.Move[];
  pokemonTemplates: T.PokemonTemplate[];
  isLoadingData: boolean;
}) => {
  const update = <K extends keyof TemplateFormData>(key: K, value: TemplateFormData[K]) => {
    onChange({ ...formData, [key]: value });
  };
  const updateBaseStat = (attribute: T.Attribute, value: number) => {
    onChange({ ...formData, baseStats: { ...formData.baseStats, [attribute]: value } });
  };
  const updateMaxStat = (attribute: T.Attribute, value: number) => {
    onChange({ ...formData, maxStats: { ...formData.maxStats, [attribute]: value } });
  };
  const addMove = () => {
    onChange({ ...formData, moves: [...formData.moves, { moveId: "", rank: Rank.STARTER }] });
  };
  const removeMove = (index: number) => {
    const nextMoves = [...formData.moves];
    nextMoves.splice(index, 1);
    onChange({ ...formData, moves: nextMoves });
  };
  const updateMove = <K extends keyof FormMove>(index: number, key: K, value: FormMove[K]) => {
    const nextMoves = [...formData.moves];
    nextMoves[index] = { ...nextMoves[index], [key]: value };
    onChange({ ...formData, moves: nextMoves });
  };
  const addEvolution = () => {
    onChange({
      ...formData,
      evolutions: [
        ...formData.evolutions,
        {
          type: EvolutionDirection.FROM,
          kind: EvolutionKind.LEVEL,
          targetId: "",
          speed: "Medium",
        },
      ],
    });
  };
  const removeEvolution = (index: number) => {
    const nextEvolutions = [...formData.evolutions];
    nextEvolutions.splice(index, 1);
    onChange({ ...formData, evolutions: nextEvolutions });
  };
  const updateEvolution = <K extends keyof FormEvolution>(
    index: number,
    key: K,
    value: FormEvolution[K],
  ) => {
    const nextEvolutions = [...formData.evolutions];
    nextEvolutions[index] = { ...nextEvolutions[index], [key]: value };
    onChange({ ...formData, evolutions: nextEvolutions });
  };

  const abilityOptions = abilities.map((ability) => ({
    label: ability.name,
    value: ability.id,
  }));
  const moveOptions = moves.map((move) => ({
    label: `${move.name} (${formatEnumName(move.type)})`,
    value: move.id,
  }));
  const templateOptions = pokemonTemplates.map((template) => ({
    label: template.name,
    value: template.id,
  }));

  if (isLoadingData)
    return (
      <div className="flex items-center justify-center py-8">
        <Text>Loading form data...</Text>
      </div>
    );
  return (
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
                value={formData.name}
                onChange={(event) => {
                  update("name", event.target.value);
                }}
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Text font="font-move" className="text-sm font-medium">
                Dex ID
              </Text>
              <Input
                placeholder="0001"
                value={formData.dexID}
                onChange={(event) => {
                  update("dexID", event.target.value);
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
                value={formData.number}
                onChange={(event) => {
                  const value = parseInt(event.target.value, 10);
                  update("number", Number.isNaN(value) ? 0 : value);
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
                options={typeOptions}
                selected={formData.types}
                onChange={(types) => {
                  update("types", types);
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
                rank={formData.recommendedRank}
                onSelect={(rank) => {
                  if (rank !== undefined) update("recommendedRank", rank);
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
                value={formData.dexCategory}
                onChange={(event) => {
                  update("dexCategory", event.target.value);
                }}
              />
            </div>
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Image URL
              </Text>
              <Input
                placeholder="pokemon.png"
                value={formData.image}
                onChange={(event) => {
                  update("image", event.target.value);
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
                checked={formData.legendary}
                onCheckedChange={(checked) => {
                  update("legendary", checked === true);
                }}
              />
              <Text font="font-move" className="text-sm">
                Legendary
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="goodStarter"
                checked={formData.goodStarter}
                onCheckedChange={(checked) => {
                  update("goodStarter", checked === true);
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
                value={formData.genderType}
                onChange={(genderType) => {
                  update("genderType", genderType);
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
                value={formData.baseHp}
                onChange={(event) => {
                  const value = parseInt(event.target.value, 10);
                  update("baseHp", Number.isNaN(value) ? 1 : value);
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
                value={formData.height}
                onChange={(event) => {
                  const value = parseFloat(event.target.value);
                  update("height", Number.isNaN(value) ? 0 : value);
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
                value={formData.weight}
                onChange={(event) => {
                  const value = parseFloat(event.target.value);
                  update("weight", Number.isNaN(value) ? 0 : value);
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
            {ATTRIBUTES.map((attribute) => (
              // Unkeyed fragment kept from the hosted build (dev-only missing-key warning).
              <>
                <Text
                  key={`${attribute}-label`}
                  font="font-move"
                  className="text-sm flex items-center capitalize"
                >
                  {attribute}
                </Text>
                <Input
                  key={`${attribute}-base`}
                  type="number"
                  min={0}
                  max={10}
                  value={formData.baseStats[attribute]}
                  onChange={(event) => {
                    const value = parseInt(event.target.value, 10);
                    updateBaseStat(attribute, Number.isNaN(value) ? 0 : value);
                  }}
                  className="text-center"
                />
                <Input
                  key={`${attribute}-max`}
                  type="number"
                  min={0}
                  max={10}
                  value={formData.maxStats[attribute]}
                  onChange={(event) => {
                    const value = parseInt(event.target.value, 10);
                    updateMaxStat(attribute, Number.isNaN(value) ? 0 : value);
                  }}
                  className="text-center"
                />
              </>
            ))}
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
                items={abilityOptions}
                value={formData.abilityOneId}
                onChange={(id) => {
                  update("abilityOneId", id);
                }}
                className="w-full"
              />
            </div>
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Ability 2
              </Text>
              <Combobox
                items={abilityOptions}
                value={formData.abilityTwoId}
                onChange={(id) => {
                  update("abilityTwoId", id);
                }}
                className="w-full"
              />
            </div>
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Hidden Ability
              </Text>
              <Combobox
                items={abilityOptions}
                value={formData.hiddenAbilityId}
                onChange={(id) => {
                  update("hiddenAbilityId", id);
                }}
                className="w-full"
              />
            </div>
            <div>
              <Text font="font-move" className="text-sm font-medium">
                Event Ability
              </Text>
              <Combobox
                items={abilityOptions}
                value={formData.eventAbilityId}
                onChange={(id) => {
                  update("eventAbilityId", id);
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
            options={habitatOptions}
            selected={formData.habitats}
            onChange={(habitats) => {
              update("habitats", habitats);
            }}
            placeholder="Select habitats..."
          />
          <p className="text-sm text-muted-foreground">
            Macro habitats: {habitatMacros(formData.habitats).map(macro => HABITAT_MACROS[macro].name).join(", ") || "None"}
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-1">
            <Text size="text-lg" className="font-bold">
              Moves
            </Text>
            <div>
              <Button type="button" variant="green" size="equalPadding" onClick={addMove}>
                <FaPlus size={16} />
              </Button>
            </div>
          </div>
          {formData.moves.length === 0 ? (
            <Text color="text-pokerole-black-light" size="text-sm" className="text-center py-2">
              No moves added. Click + to add learnable moves.
            </Text>
          ) : (
            <div className="space-y-2">
              {formData.moves.map((move, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 md:col-span-6">
                    <Combobox
                      items={moveOptions}
                      value={move.moveId}
                      onChange={(id) => {
                        updateMove(index, "moveId", id);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-5">
                    <RankSelect
                      rank={move.rank}
                      onSelect={(rank) => {
                        if (rank !== undefined) updateMove(index, "rank", rank);
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
                        removeMove(index);
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
              <Button type="button" variant="green" size="equalPadding" onClick={addEvolution}>
                <FaPlus size={16} />
              </Button>
            </div>
          </div>
          {formData.evolutions.length === 0 ? (
            <Text color="text-pokerole-black-light" size="text-sm" className="text-center py-2">
              No evolutions added. Click + to add evolution paths.
            </Text>
          ) : (
            <div className="space-y-2">
              {formData.evolutions.map((evolution, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 md:col-span-3">
                    <Combobox
                      // The current target is appended as an extra item (kept from the hosted build).
                      items={[
                        ...templateOptions,
                        { label: evolution.targetId, value: evolution.targetId },
                      ]}
                      value={evolution.targetId}
                      onChange={(id) => {
                        updateEvolution(index, "targetId", id);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Combobox
                      items={evolutionDirectionOptions}
                      value={evolution.type}
                      onChange={(direction) => {
                        updateEvolution(index, "type", direction as EvolutionDirection | "");
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Combobox
                      items={evolutionKindOptions}
                      value={evolution.kind}
                      onChange={(kind) => {
                        updateEvolution(index, "kind", kind as EvolutionKind | "");
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Input
                      placeholder="Speed"
                      value={evolution.speed ?? ""}
                      onChange={(event) => {
                        updateEvolution(index, "speed", event.target.value);
                      }}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <Input
                      placeholder="Item"
                      value={evolution.item ?? ""}
                      onChange={(event) => {
                        updateEvolution(index, "item", event.target.value);
                      }}
                    />
                  </div>
                  <div className="col-span-1 md:col-span-1 justify-center flex">
                    <Button
                      type="button"
                      variant="red"
                      size="equalPadding"
                      onClick={() => {
                        removeEvolution(index);
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
            value={formData.description}
            onChange={(event) => {
              update("description", event.target.value);
            }}
            rows={4}
          />
        </div>
      </div>
    </ScrollArea>
  );
};
