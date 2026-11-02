import * as React from "react";
import { Plus, RotateCcw, X } from "lucide-react";
import type * as T from "../../../shared/types";
import { apiFetch } from "@/api/client";
import { usePokemonControllerFindAllMinimal } from "@/api/components";
import { Rank } from "@/api/schemas";
import { button } from "@/components/kit/button";
import { Picker } from "@/components/kit/Picker";
import { Segmented, segmentPanelProps } from "@/components/kit/Segmented";
import { Sheet } from "@/components/kit/Sheet";
import { Sprite } from "@/components/kit/Sprite";
import { ShinyMark } from "@/components/kit/Shiny";
import { PokemonProvider, StaticPokemonProvider } from "@/components/pokemon-sheet/context";
import { PokemonSheet } from "@/components/pokemon-sheet/PokemonSheet";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { useDex } from "@/hooks/use-dex";
import { useToast } from "@/hooks/use-toast";
import { getTotalStat } from "@/lib/stats";
import { formatEnumName } from "@/lib/utils";
import { EncounterContext, isShiny } from "./encounter-context";

const clampHp = (pokemon: T.Pokemon): T.Pokemon => {
  const maxHp = pokemon.pokemonTemplate.baseHp + getTotalStat(pokemon, "vitality");
  return { ...pokemon, currentHp: Math.max(0, Math.min(maxHp, pokemon.currentHp)) };
};


const TabLabel = ({ index, name, image, shiny, turn }: { index: number; name: string; image: string; shiny?: boolean; turn: number }) => (
  <span className="flex items-center justify-center gap-2">
    <Sprite image={image} set="box" className="size-7" />
    <span className="max-w-40 truncate">
      {index + 1}. {name}
    </span>
    {shiny && <ShinyMark compact />}
    <span className="font-normal whitespace-nowrap text-label-2 tabular-nums">· Turn {turn}</span>
  </span>
);

const AddAllyPanel = ({ onAdded }: { onAdded: (key: string) => void }) => {
  const { allies, setAllies, settings } = React.useContext(EncounterContext);
  const { state: campaignFilter } = useCampaignFilter();
  const { toast } = useToast();
  const { data: owned, isFetching: ownedLoading } = usePokemonControllerFindAllMinimal({});
  const { data: dex, isFetching: dexLoading } = useDex();
  const [pending, setPending] = React.useState(false);
  const ownedItems = React.useMemo(
    () =>
      [...(owned ?? [])]
        .sort((first, second) => (first.name ?? "").localeCompare(second.name ?? ""))
        .map((pokemon) => ({
          value: pokemon.id,
          label: pokemon.name,
          detail: [formatEnumName(pokemon.rank), ...pokemon.types.map(formatEnumName)].join(" · "),
        })),
    [owned],
  );
  const speciesItems = React.useMemo(
    () =>
      (dex ?? []).map((species) => ({
        value: species.id,
        label: species.name,
        detail: `#${species.dexID || species.number} · ${formatEnumName(species.recommendedRank)}`,
      })),
    [dex],
  );
  const addOwned = (id: string) => {
    const pokemon = owned?.find((other) => other.id === id);
    if (!pokemon) return;
    const key = `ally-${pokemon.id}`;
    if (!allies.some((ally) => ally.key === key))
      setAllies((allies) => [...allies, { key, kind: "owned", pokemonId: pokemon.id, name: pokemon.name, image: pokemon.image, shiny: pokemon.shiny }]);
    onAdded(key);
  };
  const addSpecies = async (id: string) => {
    const species = dex?.find((other) => other.id === id);
    if (!species) return;
    setPending(true);
    try {
      const [pokemon] = await apiFetch<T.Pokemon[]>({
        url: "/pokemon/generate",
        method: "post",
        body: {
          pokemonTemplateId: species.id,
          rank: species.recommendedRank === Rank.UNRANKED ? Rank.STARTER : species.recommendedRank,
          numberToGenerate: 1,
          seed: Date.now(),
          rankUpMethod: settings.rankUpMethod,
          campaignIds: campaignFilter.campaignIds,
          includeCore: campaignFilter.includeCore,
        } satisfies T.GeneratePokemonBody,
      });
      if (!pokemon) throw new Error("No Pokémon generated");
      const key = `ally-${pokemon.id}`;
      setAllies((allies) => [...allies, { key, kind: "species", pokemon }]);
      onAdded(key);
    } catch {
      toast({ title: `Couldn’t add ${species.name}`, description: "Please try again." });
    } finally {
      setPending(false);
    }
  };
  return (
    <fieldset disabled={pending} aria-busy={pending} className="grid min-w-0 gap-2 sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-footnote text-label-2">From My Pokémon</span>
        <Picker
          label="Add from My Pokémon"
          items={ownedItems}
          value=""
          onChange={addOwned}
          placeholder={owned?.length === 0 ? "No Pokémon yet" : "Choose one of your Pokémon"}
          loading={ownedLoading}
          clearable={false}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-footnote text-label-2">Any Pokémon by name</span>
        <Picker
          label="Add any Pokémon"
          items={speciesItems}
          value=""
          onChange={addSpecies}
          placeholder={pending ? "Adding…" : "Search a species"}
          loading={dexLoading}
          clearable={false}
        />
      </div>
    </fieldset>
  );
};

export const EncounterDetails = ({
  selectedId,
  onSelect,
  showTyping,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showTyping: boolean;
}) => {
  const { entries, setEntries, isGenerating, allies, setAllies, turns, setTurns } = React.useContext(EncounterContext);
  const idPrefix = React.useId();
  const [adding, setAdding] = React.useState(false);
  const selectedEnemy = entries.find((entry) => entry.pokemon.id === selectedId);
  const selectedAlly = allies.find((ally) => ally.key === selectedId);
  const revealSelectedTab = React.useCallback(
    (element: HTMLDivElement | null) => {
      element?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
    },
    [selectedId],
  );
  const updatePokemon = (changes: Partial<T.Pokemon>) => {
    setEntries((entries) =>
      entries.map((entry) => (entry.pokemon.id === selectedId ? { ...entry, pokemon: clampHp({ ...entry.pokemon, ...changes }) } : entry)),
    );
  };
  const updateAlly = (changes: Partial<T.Pokemon>) => {
    setAllies((allies) =>
      allies.map((ally) => (ally.key === selectedId && ally.kind === "species" ? { ...ally, pokemon: clampHp({ ...ally.pokemon, ...changes }) } : ally)),
    );
  };
  const removeAlly = (key: string) => {
    const index = allies.findIndex((ally) => ally.key === key);
    const rest = allies.filter((ally) => ally.key !== key);
    setAllies(rest);
    setTurns(({ [key]: _removed, ...turns }) => turns);
    onSelect(rest[Math.min(index, rest.length - 1)]?.key ?? entries[0]?.pokemon.id ?? null);
  };
  const turnOf = (key: string) => turns[key] ?? 0;
  const turnControl = (key: string) => ({
    value: turnOf(key),
    onChange: (value: number) => setTurns((turns) => ({ ...turns, [key]: value })),
  });
  const removeAllyButton = selectedAlly && (
    <button type="button" onClick={() => removeAlly(selectedAlly.key)} className={button({ variant: "destructive" })}>
      <X aria-hidden className="size-4" />
      Remove from encounter
    </button>
  );
  return (
    <Sheet
      open={selectedEnemy !== undefined || selectedAlly !== undefined}
      onOpenChange={(open) => {
        if (open) return;
        onSelect(null);
        setAdding(false);
      }}
      title="Encounter details"
      description="Switch Pokémon using the tabs. Tap a move to roll accuracy or damage. Track each Pokémon's turn: the Nth action in a round needs N successes."
      initialExpanded
      className="lg:max-w-5xl"
    >
      {(selectedEnemy || selectedAlly) && (
        <>
          <div ref={revealSelectedTab} className="sticky top-0 z-20 flex flex-col gap-2 border-b border-hairline bg-canvas p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-footnote font-semibold text-label-2 uppercase">Your Pokémon</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-expanded={adding}
                  onClick={() => setAdding(!adding)}
                  className={button({ variant: adding ? "tinted" : "gray", size: "sm" })}
                >
                  <Plus aria-hidden className="size-3.5" strokeWidth={2.5} />
                  Add Pokémon
                </button>
                <button
                  type="button"
                  disabled={Object.values(turns).every((turn) => turn === 0)}
                  onClick={() => setTurns({})}
                  className={button({ variant: "gray", size: "sm" })}
                >
                  <RotateCcw aria-hidden className="size-3.5" />
                  Refresh round
                </button>
              </div>
            </div>
            {adding && (
              <AddAllyPanel
                onAdded={(key) => {
                  onSelect(key);
                  setAdding(false);
                }}
              />
            )}
            {allies.length > 0 ? (
              <div className="overflow-x-auto">
                <Segmented
                  label="Your Pokémon"
                  idPrefix={idPrefix}
                  value={selectedAlly?.key ?? ""}
                  onChange={onSelect}
                  options={allies.map((ally, index) => ({
                    value: ally.key,
                    label:
                      ally.kind === "owned" ? (
                        <TabLabel index={index} name={ally.name} image={ally.image} shiny={ally.shiny} turn={turnOf(ally.key)} />
                      ) : (
                        <TabLabel
                          index={index}
                          name={ally.pokemon.pokemonTemplate.name}
                          image={ally.pokemon.pokemonTemplate.image}
                          turn={turnOf(ally.key)}
                        />
                      ),
                  }))}
                  className="w-max min-w-full"
                />
              </div>
            ) : (
              !adding && <p className="text-footnote text-label-2">Add your Pokémon, or any species, to track them alongside the encounter.</p>
            )}
            <h3 className="mt-1 text-footnote font-semibold text-label-2 uppercase">Encounter Pokémon</h3>
            {entries.length > 0 ? (
              <div className="overflow-x-auto">
                <Segmented
                  label="Encounter Pokémon"
                  idPrefix={idPrefix}
                  value={selectedEnemy?.pokemon.id ?? ""}
                  onChange={onSelect}
                  options={entries.map((entry, index) => ({
                    value: entry.pokemon.id,
                    label: (
                      <TabLabel
                        index={index}
                        name={entry.pokemon.pokemonTemplate.name}
                        image={entry.pokemon.pokemonTemplate.image}
                        shiny={isShiny(entry)}
                        turn={turnOf(entry.pokemon.id)}
                      />
                    ),
                  }))}
                  className="w-max min-w-full"
                />
              </div>
            ) : (
              <p className="text-footnote text-label-2">No encounter Pokémon.</p>
            )}
          </div>
          {selectedEnemy && (
            <div key={selectedEnemy.pokemon.id} {...segmentPanelProps(idPrefix, selectedEnemy.pokemon.id)}>
              <StaticPokemonProvider
                pokemon={{ ...selectedEnemy.pokemon, shiny: isShiny(selectedEnemy) }}
                onChange={isGenerating ? undefined : updatePokemon}
              >
                <p className="px-4 pt-3 text-footnote text-label-2">
                  Nature: {selectedEnemy.pokemon.nature?.name ?? "—"} · Confidence: {selectedEnemy.pokemon.nature?.confidence ?? "—"}
                </p>
                <PokemonSheet showButtons="add" showTyping={showTyping} embedded turn={turnControl(selectedEnemy.pokemon.id)} />
              </StaticPokemonProvider>
            </div>
          )}
          {selectedAlly && (
            <div key={selectedAlly.key} {...segmentPanelProps(idPrefix, selectedAlly.key)}>
              {selectedAlly.kind === "owned" ? (
                <PokemonProvider id={selectedAlly.pokemonId}>
                  <p className="px-4 pt-3 text-footnote text-label-2">Your Pokémon: HP, Will and edits are saved to My Pokémon.</p>
                  <PokemonSheet embedded allowRemoval={false} turn={turnControl(selectedAlly.key)} extraActions={removeAllyButton} />
                </PokemonProvider>
              ) : (
                <StaticPokemonProvider pokemon={selectedAlly.pokemon} onChange={updateAlly}>
                  <p className="px-4 pt-3 text-footnote text-label-2">
                    Nature: {selectedAlly.pokemon.nature?.name ?? "—"} · Confidence: {selectedAlly.pokemon.nature?.confidence ?? "—"}
                  </p>
                  <PokemonSheet showButtons="add" embedded turn={turnControl(selectedAlly.key)} extraActions={removeAllyButton} />
                </StaticPokemonProvider>
              )}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
};
