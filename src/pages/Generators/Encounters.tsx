import * as React from "react";
import { ChevronDown, Copy, Lock, Plus, RotateCcw, Sparkles, Tag, Unlock, X } from "lucide-react";
import type * as T from "../../../shared/types";
import { generationFor, isMythical } from "../../../shared/encounters";
import { apiFetch } from "@/api/client";
import { usePokemonControllerFindAllMinimal } from "@/api/components";
import { LegendaryFilter, PokemonType, Rank, RankUpMethod } from "@/api/schemas";
import { HabitatPicker } from "@/components/HabitatPicker";
import { habitatName } from "../../../shared/habitats";
import { button } from "@/components/kit/button";
import { Stepper } from "@/components/kit/Controls";
import { Group } from "@/components/kit/List";
import { Picker } from "@/components/kit/Picker";
import { RankBadge, RankBall, TypeDot, TypePill } from "@/components/kit/Pills";
import { Segmented, segmentPanelProps } from "@/components/kit/Segmented";
import { Sheet } from "@/components/kit/Sheet";
import { Sprite } from "@/components/kit/Sprite";
import { ShinyMark, shinyRing } from "@/components/kit/Shiny";
import { PokemonProvider, StaticPokemonProvider } from "@/components/pokemon-sheet/context";
import { PokemonSheet } from "@/components/pokemon-sheet/PokemonSheet";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { useDex } from "@/hooks/use-dex";
import { useScrollToDetail } from "@/hooks/use-scroll-to-detail";
import { useToast } from "@/hooks/use-toast";
import { getTotalStat } from "@/lib/stats";
import { cn, formatEnumName } from "@/lib/utils";
import { ChoiceGroup, CollapsibleGroup, Field, fieldClass, GeneratorEmpty, ToggleField } from "./fields";

interface EncounterEntry {
  pokemon: T.Pokemon;
  locked: boolean;
  shinyRoll: [number, number];
}

/** Your side of the encounter: a Pokémon from My Pokémon (saved as you play), or any species generated for this encounter. */
type AllyEntry =
  | { key: string; kind: "owned"; pokemonId: string; name: string; image: string; shiny: boolean }
  | { key: string; kind: "species"; pokemon: T.Pokemon };

/** A Pokémon gets up to 5 actions per round; the Nth action needs N successes. */
const MAX_TURN = 5;

const rollShiny = (): [number, number] => [Math.floor(Math.random() * 20) + 1, Math.floor(Math.random() * 20) + 1];
const isShiny = (entry: EncounterEntry) => entry.shinyRoll.every((die) => die === 20);
const defaultSettings = (): T.GenerateEncounterBody => ({
  numberToGenerate: 1,
  name: "",
  types: [],
  generations: [],
  habitats: [],
  ranks: [],
  includeLegendary: LegendaryFilter.NONE,
  includeMythical: false,
  excludeForms: false,
  rankOrBelow: true,
  allowDuplicates: true,
  excludeStarters: true,
  fossils: "NONE",
  seed: Date.now(),
  rankUpMethod: RankUpMethod.RANDOM,
});

const EncounterContext = React.createContext<{
  entries: EncounterEntry[];
  setEntries: React.Dispatch<React.SetStateAction<EncounterEntry[]>>;
  history: T.PokemonTemplateSummary[];
  setHistory: React.Dispatch<React.SetStateAction<T.PokemonTemplateSummary[]>>;
  settings: T.GenerateEncounterBody;
  setSettings: React.Dispatch<React.SetStateAction<T.GenerateEncounterBody>>;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  status: string;
  setStatus: (value: string) => void;
  allies: AllyEntry[];
  setAllies: React.Dispatch<React.SetStateAction<AllyEntry[]>>;
  /** Current turn per tab key (encounter Pokémon id or ally key); missing means 0. */
  turns: Record<string, number>;
  setTurns: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}>(null!);

export const EncounterProvider = ({ children }: { children: React.ReactNode }) => {
  const [entries, setEntries] = React.useState<EncounterEntry[]>([]);
  const [history, setHistory] = React.useState<T.PokemonTemplateSummary[]>([]);
  const [settings, setSettings] = React.useState(defaultSettings);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [status, setStatus] = React.useState("Choose filters and generate an encounter.");
  const [allies, setAllies] = React.useState<AllyEntry[]>([]);
  const [turns, setTurns] = React.useState<Record<string, number>>({});
  return (
    <EncounterContext.Provider
      value={{
        entries,
        setEntries,
        history,
        setHistory,
        settings,
        setSettings,
        isGenerating,
        setIsGenerating,
        status,
        setStatus,
        allies,
        setAllies,
        turns,
        setTurns,
      }}
    >
      {children}
    </EncounterContext.Provider>
  );
};

export const EncounterGenerator = () => {
  const {
    entries,
    setEntries,
    history,
    setHistory,
    settings,
    setSettings,
    isGenerating,
    setIsGenerating,
    setStatus,
  } = React.useContext(EncounterContext);
  const { state: campaignFilter } = useCampaignFilter();
  const { toast } = useToast();
  const locked = entries.filter((entry) => entry.locked);
  const count = settings.numberToGenerate ?? 1;
  const filterSummary =
    [
      (settings.types ?? []).map(formatEnumName).join(", "),
      settings.generations?.length ? `Gen ${settings.generations.join(", ")}` : "",
      (settings.habitats ?? []).map(habitatName).join(", "),
      (settings.ranks ?? []).map(formatEnumName).join(", "),
    ]
      .filter(Boolean)
      .join(" · ") || "Any species";
  const generate = async () => {
    const seed = Date.now();
    setSettings({ ...settings, seed });
    if (locked.length >= count) {
      setStatus(`${locked.length} locked Pokémon retained. Unlock one or increase the count to generate more.`);
      return;
    }
    setIsGenerating(true);
    setStatus("Generating encounter…");
    try {
      const pokemon = await apiFetch<T.Pokemon[]>({
        url: "/pokemon/encounter",
        method: "post",
        body: {
          ...settings,
          seed,
          numberToGenerate: count - locked.length,
          campaignIds: campaignFilter.campaignIds,
          includeCore: campaignFilter.includeCore,
          excludedTemplateIds: [
            ...new Set([
              ...history.map((species) => species.id),
              ...(!settings.allowDuplicates ? locked.map((entry) => entry.pokemon.pokemonTemplateId) : []),
            ]),
          ],
        } satisfies T.GenerateEncounterBody,
      });
      const next = [...locked, ...pokemon.map((pokemon) => ({ pokemon, locked: false, shinyRoll: rollShiny() }))];
      setEntries(next);
      setHistory([...new Map(next.map((entry) => [entry.pokemon.pokemonTemplateId, entry.pokemon.pokemonTemplate])).values()]);
      setStatus(
        `${next.length} of ${count} Pokémon · Seed ${seed}${next.length < count ? " · Broaden filters or remove entries from history to find more." : ""}`,
      );
    } catch {
      setStatus("Generation failed. Your current encounter has been kept.");
      toast({ title: "Failed to generate encounter", description: "Please try again." });
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        generate();
      }}
    >
      <fieldset disabled={isGenerating} className="flex min-w-0 flex-col gap-6">
        <CollapsibleGroup
          title="Encounter settings"
          summary={`${count} Pokémon${settings.name?.trim() ? ` · ${settings.name.trim()}` : ""}`}
        >
          <div className="flex flex-col gap-4 p-3">
            <Field label="Number to generate" hint="Generate between 1 and 12 Pokémon.">
              <input
                type="number"
                min={1}
                max={12}
                value={count}
                onChange={(event) => setSettings({ ...settings, numberToGenerate: Number(event.target.value) })}
                className={fieldClass}
              />
            </Field>
            <Field label="Pokémon name" hint="Separate names with commas; partial names work too.">
              <input
                value={settings.name}
                placeholder="Eevee, Charmander, Graveler…"
                onChange={(event) => setSettings({ ...settings, name: event.target.value })}
                className={fieldClass}
              />
            </Field>
          </div>
        </CollapsibleGroup>
        <CollapsibleGroup title="Species filters" summary={filterSummary} footer="Leave a group empty to include any matching Pokémon.">
          <ChoiceGroup
            label="Types"
            options={Object.values(PokemonType)
              .filter((type): type is T.PokemonType => type !== "TYPELESS" && type !== "VARIES")
              .map((type) => ({ value: type, label: formatEnumName(type), icon: <TypeDot type={type} className="size-5" /> }))}
            selected={settings.types ?? []}
            onChange={(types) => setSettings({ ...settings, types })}
          />
          <ChoiceGroup
            label="Generations"
            options={Array.from({ length: 9 }, (_, index) => ({ value: String(index + 1), label: `Generation ${index + 1}` }))}
            selected={(settings.generations ?? []).map(String)}
            onChange={(generations) => setSettings({ ...settings, generations: generations.map(Number) })}
          />
          <HabitatPicker
            collapsible
            selected={settings.habitats ?? []}
            onChange={(habitats) => setSettings({ ...settings, habitats })}
          />
          <ChoiceGroup
            label="Recommended ranks"
            options={Object.values(Rank).map((rank) => ({ value: rank, label: formatEnumName(rank), icon: <RankBall rank={rank} /> }))}
            selected={settings.ranks ?? []}
            onChange={(ranks) => setSettings({ ...settings, ranks })}
          />
        </CollapsibleGroup>
        <CollapsibleGroup title="Encounter rules">
          <div className="flex flex-col gap-4 p-3">
            <Field label="Legendaries">
              <select
                value={settings.includeLegendary}
                onChange={(event) => setSettings({ ...settings, includeLegendary: event.target.value as T.LegendaryFilter })}
                className={fieldClass}
              >
                <option value="NONE">No legendaries</option>
                <option value="ALL">Include legendaries</option>
                <option value="ONLY">Only legendaries</option>
              </select>
            </Field>
            <Field label="Fossils">
              <select
                value={settings.fossils}
                onChange={(event) => setSettings({ ...settings, fossils: event.target.value as T.GenerateEncounterBody["fossils"] })}
                className={fieldClass}
              >
                <option value="NONE">No fossils</option>
                <option value="ALL">Include fossils</option>
                <option value="ONLY">Only fossils</option>
              </select>
            </Field>
            <Field label="Rank-up method">
              <select
                value={settings.rankUpMethod}
                onChange={(event) => setSettings({ ...settings, rankUpMethod: event.target.value as T.RankUpMethod })}
                className={fieldClass}
              >
                {Object.values(RankUpMethod).map((method) => (
                  <option key={method} value={method}>
                    {formatEnumName(method)}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              {(
                [
                  ["rankOrBelow", "Recommended rank or lower"],
                  ["includeMythical", "Include mythical"],
                  ["excludeForms", "Exclude form variants"],
                  ["allowDuplicates", "Allow duplicate Pokémon"],
                  ["excludeStarters", "Exclude starter families"],
                ] as const
              ).map(([key, label]) => (
                <ToggleField
                  key={key}
                  label={label}
                  checked={settings[key] === true}
                  onChange={(checked) => setSettings({ ...settings, [key]: checked })}
                />
              ))}
            </div>
          </div>
        </CollapsibleGroup>
        {/* Must be a direct fieldset child so it stays pinned across the whole form. */}
        <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom))] z-10 -mx-2 -mt-2 -mb-4 bg-canvas/90 px-2 py-2 backdrop-blur-xl lg:bottom-0">
          <button
            type="submit"
            disabled={isGenerating || !Number.isInteger(count) || count < 1 || count > 12}
            className={cn(button({ variant: "filled" }), "w-full")}
          >
            {isGenerating ? "Generating…" : "Generate encounter"}
          </button>
        </div>
        <button
          type="button"
          disabled={isGenerating}
          className={button({ variant: "gray" })}
          onClick={() => {
            setSettings(defaultSettings());
            setEntries([]);
            setHistory([]);
            setStatus("Filters reset. Choose filters and generate an encounter.");
          }}
        >
          Reset filters
        </button>
      </fieldset>
    </form>
  );
};

const EncounterCard = ({ entry, onDetails, showTyping }: { entry: EncounterEntry; onDetails: () => void; showTyping: boolean }) => {
  const { setEntries, isGenerating } = React.useContext(EncounterContext);
  const [rolling, setRolling] = React.useState(false);
  React.useEffect(() => {
    if (!rolling) return;
    const timer = window.setTimeout(() => setRolling(false), 2000);
    return () => window.clearTimeout(timer);
  }, [rolling]);
  const { pokemon } = entry;
  const species = pokemon.pokemonTemplate;
  const shiny = isShiny(entry);
  const maxHp = species.baseHp + getTotalStat(pokemon, "vitality");
  const update = (changes: Partial<EncounterEntry>) =>
    setEntries((entries) => entries.map((other) => (other.pokemon.id === pokemon.id ? { ...other, ...changes } : other)));
  const updatePokemon = (changes: Partial<T.Pokemon>) => {
    if (changes.currentHp !== undefined) changes.currentHp = Math.max(0, Math.min(maxHp, changes.currentHp));
    update({ pokemon: { ...pokemon, ...changes } });
  };
  return (
    <article
      aria-label={species.name}
      className={cn("@container h-full min-w-0 overflow-hidden rounded-2xl bg-surface shadow-card", shiny && shinyRing)}
    >
      <div className="flex h-full flex-col gap-2 p-2 @[220px]:p-3">
        <div className="flex items-center justify-between gap-1">
          <p className="text-footnote text-label-2 tabular-nums">#{species.dexID || String(species.number).padStart(4, "0")}</p>
          <button
            type="button"
            disabled={isGenerating}
            aria-label={`Remove ${species.name}`}
            title={`Remove ${species.name}`}
            onClick={() => setEntries((entries) => entries.filter((other) => other.pokemon.id !== pokemon.id))}
            className={button({ variant: "destructive", size: "icon" })}
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <div className="flex items-start gap-1 @[220px]:items-center @[220px]:gap-2">
          <Sprite image={species.image} set="book" className="size-10 shrink-0 @[220px]:size-16" />
          <div className="w-full min-w-0 flex-1">
            <h3 className="text-subhead font-semibold break-words">{species.name}</h3>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <RankBadge rank={pokemon.rank} />
          {showTyping && species.types.map((type) => <TypePill key={type} type={type} size="sm" />)}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-footnote text-label-2">
          <span>Gen {generationFor(species.number) ?? "—"}</span>
          {isMythical(species.number) ? <span>Mythical</span> : species.legendary && <span>Legendary</span>}
          {shiny && <ShinyMark />}
        </div>
        <p className="line-clamp-2 text-footnote text-label-2" title={species.habitats.map(habitatName).join(", ") || "No habitat listed"}>
          {species.habitats.map(habitatName).join(", ") || "No habitat listed"}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-1 [&>button]:min-w-0 [&>button]:w-full">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={`Details & moves for ${species.name}`}
            title="Details & moves"
            onClick={onDetails}
            className={button({ variant: "tinted", size: "icon" })}
          >
            <ChevronDown aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            disabled={isGenerating}
            aria-pressed={entry.locked}
            aria-label={`${entry.locked ? "Unlock" : "Lock"} ${species.name}`}
            title={entry.locked ? "Unlock" : "Lock"}
            onClick={() => update({ locked: !entry.locked })}
            className={button({ variant: entry.locked ? "tinted" : "gray", size: "icon" })}
          >
            {entry.locked ? <Lock aria-hidden className="size-4" /> : <Unlock aria-hidden className="size-4" />}
          </button>
        </div>
        <button
          type="button"
          disabled={shiny || rolling || isGenerating}
          aria-label={shiny ? `${species.name} is shiny` : `Roll shiny for ${species.name}: ${entry.shinyRoll[0]} + ${entry.shinyRoll[1]}`}
          title="Roll shiny"
          onClick={() => {
            update({ shinyRoll: rollShiny() });
            setRolling(true);
          }}
          className={button({ variant: shiny ? "tinted" : "gray" })}
        >
          <Sparkles aria-hidden className="size-4" />
          {shiny
            ? "Shiny!"
            : `${entry.shinyRoll[0]} + ${entry.shinyRoll[1]}${rolling ? ` = ${entry.shinyRoll[0] + entry.shinyRoll[1]}` : ""}`}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-1 border-t border-hairline pt-2">
          <span className="text-subhead font-medium">
            HP <span className="font-normal text-label-2">/ {maxHp}</span>
          </span>
          <Stepper
            label={`HP for ${species.name}`}
            className="max-w-full [&>output]:min-w-6"
            value={pokemon.currentHp}
            min={isGenerating ? pokemon.currentHp : 0}
            max={isGenerating ? pokemon.currentHp : maxHp}
            onChange={(currentHp) => updatePokemon({ currentHp })}
          />
        </div>
      </div>
    </article>
  );
};

const clampHp = (pokemon: T.Pokemon): T.Pokemon => {
  const maxHp = pokemon.pokemonTemplate.baseHp + getTotalStat(pokemon, "vitality");
  return { ...pokemon, currentHp: Math.max(0, Math.min(maxHp, pokemon.currentHp)) };
};

const turnHint = (turn: number) =>
  turn === 0
    ? "No actions yet this round. The first action needs 1 success."
    : `${turn === MAX_TURN ? "Last action this round" : "This action"} needs ${turn} ${turn === 1 ? "success" : "successes"}.`;

const TurnTracker = ({ tabKey, name, children }: { tabKey: string; name: string; children?: React.ReactNode }) => {
  const { turns, setTurns } = React.useContext(EncounterContext);
  const turn = turns[tabKey] ?? 0;
  return (
    <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-3 shadow-card">
      <div className="min-w-0">
        <p className="text-headline font-semibold">Turn</p>
        <p className="text-footnote text-label-2">{turnHint(turn)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Stepper
          label={`Turn for ${name}`}
          value={turn}
          min={0}
          max={MAX_TURN}
          display={
            <>
              {turn}
              <span className="font-normal text-label-2"> / {MAX_TURN}</span>
            </>
          }
          className="[&>output]:min-w-14"
          onChange={(value) => setTurns((turns) => ({ ...turns, [tabKey]: value }))}
        />
        {children}
      </div>
    </div>
  );
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

const EncounterDetails = ({
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
                <TurnTracker tabKey={selectedEnemy.pokemon.id} name={selectedEnemy.pokemon.pokemonTemplate.name} />
                <p className="px-4 pt-3 text-footnote text-label-2">
                  Nature: {selectedEnemy.pokemon.nature?.name ?? "—"} · Confidence: {selectedEnemy.pokemon.nature?.confidence ?? "—"}
                </p>
                <PokemonSheet showButtons="add" showTyping={showTyping} embedded />
              </StaticPokemonProvider>
            </div>
          )}
          {selectedAlly && (
            <div key={selectedAlly.key} {...segmentPanelProps(idPrefix, selectedAlly.key)}>
              <TurnTracker
                tabKey={selectedAlly.key}
                name={selectedAlly.kind === "owned" ? selectedAlly.name : selectedAlly.pokemon.pokemonTemplate.name}
              >
                <button
                  type="button"
                  onClick={() => removeAlly(selectedAlly.key)}
                  className={button({ variant: "destructive", size: "sm" })}
                >
                  <X aria-hidden className="size-3.5" />
                  Remove from encounter
                </button>
              </TurnTracker>
              {selectedAlly.kind === "owned" ? (
                <PokemonProvider id={selectedAlly.pokemonId}>
                  <p className="px-4 pt-3 text-footnote text-label-2">Your Pokémon: HP, Will and edits are saved to My Pokémon.</p>
                  <PokemonSheet embedded />
                </PokemonProvider>
              ) : (
                <StaticPokemonProvider pokemon={selectedAlly.pokemon} onChange={updateAlly}>
                  <p className="px-4 pt-3 text-footnote text-label-2">
                    Nature: {selectedAlly.pokemon.nature?.name ?? "—"} · Confidence: {selectedAlly.pokemon.nature?.confidence ?? "—"}
                  </p>
                  <PokemonSheet showButtons="add" embedded />
                </StaticPokemonProvider>
              )}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
};

const EncounterHistory = () => {
  const { history, setHistory, isGenerating } = React.useContext(EncounterContext);
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={button({ variant: "gray", size: "sm" })}>
        History ({history.length})
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Encounter history"
        description="Pokémon from the last encounter are excluded from the next roll. Remove an entry to allow it again."
        initialExpanded
      >
        <div className="flex flex-col gap-4 p-4">
          <Group>
            {history.length === 0 ? (
              <p className="p-4 text-subhead text-label-2">No Pokémon in history.</p>
            ) : (
              <ul>
                {history.map((species) => (
                  <li key={species.id} className="flex items-center gap-3 border-b border-hairline px-3 py-2 last:border-b-0">
                    <Sprite image={species.image} set="box" className="h-14 w-17" />
                    <div className="min-w-0 flex-1">
                      <span className="block text-body font-medium">{species.name}</span>
                      <span className="text-footnote text-label-2">{species.types.map(formatEnumName).join(" · ")}</span>
                    </div>
                    <button
                      type="button"
                      disabled={isGenerating}
                      aria-label={`Remove ${species.name} from history`}
                      onClick={() => setHistory(history.filter((other) => other.id !== species.id))}
                      className={button({ variant: "destructive", size: "icon" })}
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Group>
          <button
            type="button"
            disabled={isGenerating || history.length === 0}
            onClick={() => setHistory([])}
            className={button({ variant: "destructive" })}
          >
            Clear history
          </button>
        </div>
      </Sheet>
    </>
  );
};

export const GeneratedEncounterList = ({
  showTyping,
  onShowTypingChange,
}: {
  showTyping: boolean;
  onShowTypingChange: (showTyping: boolean) => void;
}) => {
  const { entries, status } = React.useContext(EncounterContext);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const resultsRef = useScrollToDetail(entries.map((entry) => entry.pokemon.id).join(",") || undefined);
  const { toast } = useToast();
  const copy = async () => {
    const lines = entries.map(({ pokemon, shinyRoll }) => {
      const species = pokemon.pokemonTemplate;
      return `${species.name} (#${species.number}) | Rank ${pokemon.rank} | Types: ${species.types.join(", ")} | Habitat: ${species.habitats.map(habitatName).join(", ")} | HP: ${pokemon.currentHp}/${species.baseHp + getTotalStat(pokemon, "vitality")}${shinyRoll.every((die) => die === 20) ? " | SHINY" : ""}`;
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast({ title: "Encounter copied" });
    } catch {
      toast({ title: "Could not copy encounter", description: "Select the encounter text and copy it manually." });
    }
  };
  return (
    <section ref={resultsRef} aria-label="Generated encounter" className="@container min-w-0 scroll-mt-16">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-headline font-semibold">Generated encounter</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={showTyping}
            onClick={() => onShowTypingChange(!showTyping)}
            className={button({ variant: showTyping ? "tinted" : "gray", size: "sm" })}
          >
            <Tag aria-hidden className="size-3.5" />
            Typing
          </button>
          <EncounterHistory />
          <button type="button" disabled={entries.length === 0} onClick={copy} className={button({ variant: "gray", size: "sm" })}>
            <Copy aria-hidden className="size-3.5" />
            Copy
          </button>
        </div>
      </div>
      <p role="status" className="mb-4 text-footnote text-label-2">
        {status}
      </p>
      {entries.length === 0 ? (
        <GeneratorEmpty
          title="No encounter yet"
          description="Choose your filters and generate an encounter. Broaden the filters if nothing matches."
        />
      ) : (
        <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-2 @[480px]:grid-cols-3 @[640px]:grid-cols-4 @[640px]:gap-3">
          {entries.map((entry) => (
            <EncounterCard key={entry.pokemon.id} entry={entry} showTyping={showTyping} onDetails={() => setSelectedId(entry.pokemon.id)} />
          ))}
        </div>
      )}
      <EncounterDetails selectedId={selectedId} onSelect={setSelectedId} showTyping={showTyping} />
    </section>
  );
};
