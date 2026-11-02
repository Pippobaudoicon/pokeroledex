import * as React from "react";
import { ChevronDown, Copy, Lock, Sparkles, Tag, Unlock, X } from "lucide-react";
import type * as T from "../../../shared/types";
import { generationFor, isMythical } from "../../../shared/encounters";
import { apiFetch } from "@/api/client";
import { PokemonType, Rank, RankUpMethod } from "@/api/schemas";
import { HabitatPicker } from "@/components/HabitatPicker";
import { habitatName } from "../../../shared/habitats";
import { button } from "@/components/kit/button";
import { Stepper } from "@/components/kit/Controls";
import { Group } from "@/components/kit/List";
import { RankBadge, RankBall, TypeDot, TypePill } from "@/components/kit/Pills";
import { Sheet } from "@/components/kit/Sheet";
import { Sprite } from "@/components/kit/Sprite";
import { ShinyMark, shinyRing } from "@/components/kit/Shiny";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { useScrollToDetail } from "@/hooks/use-scroll-to-detail";
import { useToast } from "@/hooks/use-toast";
import { getTotalStat } from "@/lib/stats";
import { cn, formatEnumName } from "@/lib/utils";
import { defaultSettings, EncounterContext, type EncounterEntry, isShiny, rollShiny } from "./encounter-context";
import { EncounterDetails } from "./EncounterDetails";
import { ChoiceGroup, CollapsibleGroup, Field, fieldClass, GeneratorEmpty, ToggleField } from "./fields";

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
