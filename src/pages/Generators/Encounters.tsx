import * as React from "react";
import { ChevronDown, ChevronUp, Lock, Unlock, X } from "lucide-react";
import { Link } from "react-router-dom";
import type * as T from "../../../shared/types";
import { generationFor, isMythical } from "../../../shared/encounters";
import { apiFetch } from "@/api/client";
import { Habitat, LegendaryFilter, PokemonType, Rank, RankUpMethod } from "@/api/schemas";
import { Box } from "@/components/Box";
import { Combobox } from "@/components/Combobox";
import { MultiSelect } from "@/components/MultiSelect";
import { PokemonTemplateCard } from "@/components/PokemonTemplateCard";
import { StaticPokemonProvider } from "@/components/pokemon-sheet/context";
import { PokemonSheet } from "@/components/pokemon-sheet/PokemonSheet";
import { RankIcon } from "@/components/RankIcon";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { useScrollToDetail } from "@/hooks/use-scroll-to-detail";
import { useToast } from "@/hooks/use-toast";
import { getTotalStat } from "@/lib/stats";
import { habitatNames, SeedInput } from "./fields";

interface EncounterEntry {
  pokemon: T.Pokemon;
  locked: boolean;
  shinyRoll: [number, number];
}

const rollShiny = (): [number, number] => [
  Math.floor(Math.random() * 20) + 1,
  Math.floor(Math.random() * 20) + 1,
];
const isShiny = (entry: EncounterEntry) => entry.shinyRoll.every((die) => die === 20);
const defaultSettings = (): T.GenerateEncounterBody => ({
  numberToGenerate: 1, name: "", types: [], generations: [], habitats: [], ranks: [],
  includeLegendary: LegendaryFilter.NONE, includeMythical: false, excludeForms: true,
  rankOrBelow: true, allowDuplicates: true, excludeStarters: true, fossils: "NONE",
  seed: Date.now(), rankUpMethod: RankUpMethod.RANDOM,
});

const EncounterContext = React.createContext<{
  entries: EncounterEntry[];
  setEntries: React.Dispatch<React.SetStateAction<EncounterEntry[]>>;
  history: T.PokemonTemplateSummary[];
  setHistory: React.Dispatch<React.SetStateAction<T.PokemonTemplateSummary[]>>;
  settings: T.GenerateEncounterBody;
  setSettings: React.Dispatch<React.SetStateAction<T.GenerateEncounterBody>>;
  useRandomSeed: boolean;
  setUseRandomSeed: (value: boolean) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  status: string;
  setStatus: (value: string) => void;
}>(null!);

export const EncounterProvider = ({ children }: { children: React.ReactNode }) => {
  const [entries, setEntries] = React.useState<EncounterEntry[]>([]);
  const [history, setHistory] = React.useState<T.PokemonTemplateSummary[]>([]);
  const [settings, setSettings] = React.useState(defaultSettings);
  const [useRandomSeed, setUseRandomSeed] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [status, setStatus] = React.useState("Choose filters and generate an encounter.");
  return (
    <EncounterContext.Provider value={{ entries, setEntries, history, setHistory, settings, setSettings, useRandomSeed, setUseRandomSeed, isGenerating, setIsGenerating, status, setStatus }}>
      {children}
    </EncounterContext.Provider>
  );
};

export const EncounterGenerator = () => {
  const { entries, setEntries, history, setHistory, settings, setSettings, useRandomSeed, setUseRandomSeed, isGenerating, setIsGenerating, setStatus } = React.useContext(EncounterContext);
  const { state: campaignFilter } = useCampaignFilter();
  const { toast } = useToast();
  const locked = entries.filter((entry) => entry.locked);
  const count = settings.numberToGenerate ?? 1;
  const generate = async () => {
    const seed = useRandomSeed ? Date.now() : settings.seed;
    setSettings({ ...settings, seed });
    if (locked.length >= count) {
      setStatus(`${locked.length} locked Pokémon retained. Unlock one or increase the count to generate more.`);
      return;
    }
    setIsGenerating(true);
    setStatus("Generating encounter…");
    try {
      const pokemon = await apiFetch<T.Pokemon[]>({
        url: "/pokemon/encounter", method: "post",
        body: {
          ...settings, seed, numberToGenerate: count - locked.length,
          campaignIds: campaignFilter.campaignIds, includeCore: campaignFilter.includeCore,
          excludedTemplateIds: [...new Set([
            ...history.map((species) => species.id),
            ...(!settings.allowDuplicates ? locked.map((entry) => entry.pokemon.pokemonTemplateId) : []),
          ])],
        } satisfies T.GenerateEncounterBody,
      });
      const next = [...locked, ...pokemon.map((pokemon) => ({ pokemon, locked: false, shinyRoll: rollShiny() }))];
      setEntries(next);
      setHistory([...new Map(next.map((entry) => [entry.pokemon.pokemonTemplateId, entry.pokemon.pokemonTemplate])).values()]);
      setStatus(`${next.length} of ${count} Pokémon · Seed ${seed}${next.length < count ? " · Broaden filters or remove entries from history to find more." : ""}`);
    } catch {
      setStatus("Generation failed. Your current encounter has been kept.");
      toast({ title: "Failed to generate encounter", description: "Please try again." });
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <Box color="bg-pokerole-beige" className="p-2 flex flex-col gap-2 encounter-controls">
      <Text size="text-2xl" className="text-center">Encounter Generator</Text>
      <fieldset disabled={isGenerating} className="flex flex-col gap-2">
        <label className="font-move">
          Number to generate (1–12)
          <Input type="number" min={1} max={12} value={count} onChange={(event) => setSettings({ ...settings, numberToGenerate: Number(event.target.value) })} />
        </label>
        <label className="font-move">
          Pokémon name
          <Input value={settings.name} placeholder="eevee, charmander, graveler" onChange={(event) => setSettings({ ...settings, name: event.target.value })} />
          <span className="text-sm">Separate names with commas; partial names work too.</span>
        </label>
        <p className="font-move text-sm">Uses your active <Link to="/campaigns" className="underline">campaign selection</Link>.</p>
        <Text font="font-move" size="text-xl">Types (any selected)</Text>
        <MultiSelect<T.PokemonType>
          options={Object.values(PokemonType).filter((type): type is T.PokemonType => type !== "TYPELESS" && type !== "VARIES").map((type) => ({ label: type, value: type }))}
          selected={settings.types ?? []} onChange={(types) => setSettings({ ...settings, types })} placeholder="Any type"
        />
        <Text font="font-move" size="text-xl">Generations</Text>
        <MultiSelect
          options={Array.from({ length: 9 }, (_, i) => ({ label: `Generation ${i + 1}`, value: String(i + 1) }))}
          selected={(settings.generations ?? []).map(String)} onChange={(generations) => setSettings({ ...settings, generations: generations.map(Number) })} placeholder="Any generation"
        />
        <Text font="font-move" size="text-xl">Habitats</Text>
        <MultiSelect
          options={Object.values(Habitat).sort((a, b) => habitatNames[a].localeCompare(habitatNames[b])).map((habitat) => ({ label: habitatNames[habitat], value: habitat }))}
          selected={settings.habitats ?? []} onChange={(habitats) => setSettings({ ...settings, habitats })} placeholder="Any habitat"
        />
        <Text font="font-move" size="text-xl">Recommended ranks</Text>
        <MultiSelect
          options={Object.values(Rank).map((rank) => ({ label: <span className="flex items-center gap-1"><RankIcon rank={rank} size="sm" />{rank}</span>, value: rank }))}
          selected={settings.ranks ?? []} onChange={(ranks) => setSettings({ ...settings, ranks })} placeholder="Any rank"
        />
        <Text font="font-move" size="text-xl">Legendaries</Text>
        <Combobox
          items={[{ label: "No legendaries", value: "NONE" }, { label: "Include legendaries", value: "ALL" }, { label: "Only legendaries", value: "ONLY" }]}
          value={settings.includeLegendary} className="text-md" onChange={(value) => setSettings({ ...settings, includeLegendary: (value || "NONE") as T.LegendaryFilter })}
        />
        <Text font="font-move" size="text-xl">Fossils</Text>
        <Combobox
          items={[{ label: "Include fossils", value: "ALL" }, { label: "No fossils", value: "NONE" }, { label: "Only fossils", value: "ONLY" }]}
          value={settings.fossils} className="text-md" onChange={(value) => setSettings({ ...settings, fossils: (value || "NONE") as T.GenerateEncounterBody["fossils"] })}
        />
        <Text font="font-move" size="text-xl">Rank up method</Text>
        <Combobox
          items={Object.values(RankUpMethod).map((method) => ({ label: method.replace(/_/g, " "), value: method }))}
          value={settings.rankUpMethod} className="text-md" onChange={(value) => setSettings({ ...settings, rankUpMethod: (value || "RANDOM") as T.RankUpMethod })}
        />
        {([
          ["rankOrBelow", "Recommended rank or lower"], ["includeMythical", "Include mythical"],
          ["excludeForms", "Exclude form variants"], ["allowDuplicates", "Allow duplicate Pokémon"],
          ["excludeStarters", "Exclude starter families"],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex flex-row items-center gap-2 font-move">
            <Checkbox checked={settings[key]} onCheckedChange={(checked) => setSettings({ ...settings, [key]: checked === true })} />{label}
          </label>
        ))}
        <div className="flex flex-row gap-2 items-center">
          <SeedInput value={settings.seed ?? 0} onChange={(value) => setSettings({ ...settings, seed: Number(value) })} useRandomSeed={useRandomSeed} setUseRandomSeed={setUseRandomSeed} />
        </div>
      </fieldset>
      <Button onClick={generate} disabled={isGenerating || !Number.isInteger(count) || count < 1 || count > 12 || !Number.isFinite(settings.seed)}>
        {isGenerating ? "Generating…" : "Generate encounter"}
      </Button>
      <Button variant="white" disabled={isGenerating} onClick={() => {
        setSettings(defaultSettings()); setUseRandomSeed(true); setEntries([]); setHistory([]);
        setStatus("Filters reset. Choose filters and generate an encounter.");
      }}>Reset filters</Button>
    </Box>
  );
};

const EncounterCard = ({ entry }: { entry: EncounterEntry }) => {
  const { setEntries, isGenerating } = React.useContext(EncounterContext);
  const [expanded, setExpanded] = React.useState(false);
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
  const update = (changes: Partial<EncounterEntry>) => setEntries((entries) => entries.map((other) => other.pokemon.id === pokemon.id ? { ...other, ...changes } : other));
  const updatePokemon = (changes: Partial<T.Pokemon>) => {
    if (changes.currentHp !== undefined) changes.currentHp = Math.max(0, Math.min(maxHp, changes.currentHp));
    update({ pokemon: { ...pokemon, ...changes } });
  };
  return (
    <Box color="bg-pokerole-beige-light" className={`p-2 flex flex-col gap-2 encounter-card ${expanded ? "encounter-expanded" : ""} ${shiny ? "encounter-shiny" : ""}`}>
      <PokemonTemplateCard name={species.name} number={species.number} types={species.types} image={species.image} />
      <div className="flex flex-row flex-wrap gap-2 items-center font-move">
        <RankIcon rank={pokemon.rank} size="sm" /><span>{pokemon.rank}</span>
        <span>Gen {generationFor(species.number) ?? "—"}</span>
        {isMythical(species.number) ? <span>Mythical</span> : species.legendary && <span>Legendary</span>}
        {shiny && <strong>✨ SHINY</strong>}
      </div>
      <p className="font-move text-sm">{species.habitats.map((habitat) => habitatNames[habitat]).join(", ") || "No habitat listed"}</p>
      <div className="encounter-card-actions">
        <Button variant="white" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}{expanded ? "Hide details" : "Details"}
        </Button>
        <Button variant={entry.locked ? "green" : "white"} disabled={isGenerating} aria-pressed={entry.locked} onClick={() => update({ locked: !entry.locked })}>
          {entry.locked ? <Lock size={18} /> : <Unlock size={18} />}{entry.locked ? "Unlock" : "Lock"}
        </Button>
        <Button variant="red" disabled={isGenerating} aria-label={`Remove ${species.name}`} onClick={() => setEntries((entries) => entries.filter((other) => other.pokemon.id !== pokemon.id))}><X size={18} /></Button>
      </div>
      <Button variant={shiny ? "yellow" : "white"} disabled={shiny || rolling || isGenerating} onClick={() => { update({ shinyRoll: rollShiny() }); setRolling(true); }}>
        {shiny ? "✨ Shiny!" : `${rolling ? "Rolled" : "Roll shiny"} · ${entry.shinyRoll[0]} + ${entry.shinyRoll[1]}${rolling ? ` = ${entry.shinyRoll[0] + entry.shinyRoll[1]}` : ""}`}
      </Button>
      <div className="flex flex-row items-center gap-2 font-move">
        <Button variant="white" disabled={isGenerating || pokemon.currentHp <= 0} aria-label={`Decrease HP for ${species.name}`} onClick={() => updatePokemon({ currentHp: pokemon.currentHp - 1 })}>−</Button>
        <span className="flex-grow text-center">HP: {pokemon.currentHp} / {maxHp}</span>
        <Button variant="white" disabled={isGenerating || pokemon.currentHp >= maxHp} aria-label={`Increase HP for ${species.name}`} onClick={() => updatePokemon({ currentHp: pokemon.currentHp + 1 })}>+</Button>
      </div>
      {expanded && (
        <StaticPokemonProvider pokemon={pokemon} onChange={isGenerating ? undefined : updatePokemon}>
          <p className="font-move">Nature: {pokemon.nature?.name ?? "—"} · Confidence: {pokemon.nature?.confidence ?? "—"}</p>
          <PokemonSheet showButtons="add" showMovePools />
        </StaticPokemonProvider>
      )}
    </Box>
  );
};

const EncounterHistory = () => {
  const { history, setHistory, isGenerating } = React.useContext(EncounterContext);
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="white">View history ({history.length})</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generated History</DialogTitle>
          <DialogDescription>Pokémon from the last encounter are excluded from the next roll. Remove an entry to allow it again.</DialogDescription>
        </DialogHeader>
        <div className="encounter-history-list">
          {history.length === 0 && <p className="font-move">No Pokémon in history.</p>}
          {history.map((species) => (
            <div key={species.id} className="flex flex-row items-center gap-2">
              <div className="flex-grow"><PokemonTemplateCard name={species.name} number={species.number} types={species.types} image={species.image} /></div>
              <Button variant="red" disabled={isGenerating} aria-label={`Remove ${species.name} from history`} onClick={() => setHistory(history.filter((other) => other.id !== species.id))}><X size={18} /></Button>
            </div>
          ))}
        </div>
        <Button variant="red" disabled={isGenerating || history.length === 0} onClick={() => setHistory([])}>Remove all from history</Button>
      </DialogContent>
    </Dialog>
  );
};

export const GeneratedEncounterList = () => {
  const { entries, status } = React.useContext(EncounterContext);
  const resultsRef = useScrollToDetail(entries.map((entry) => entry.pokemon.id).join(",") || undefined);
  const { toast } = useToast();
  const copy = async () => {
    const lines = entries.map(({ pokemon, shinyRoll }) => {
      const species = pokemon.pokemonTemplate;
      return `${species.name} (#${species.number}) | Rank ${pokemon.rank} | Types: ${species.types.join(", ")} | Habitat: ${species.habitats.map((habitat) => habitatNames[habitat]).join(", ")} | HP: ${pokemon.currentHp}/${species.baseHp + getTotalStat(pokemon, "vitality")}${shinyRoll.every((die) => die === 20) ? " | SHINY" : ""}`;
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast({ title: "Encounter copied" });
    } catch {
      toast({ title: "Could not copy encounter", description: "Select the encounter text and copy it manually." });
    }
  };
  return (
    <div ref={resultsRef} className="encounter-results h-full">
      <Box color="bg-pokerole-beige" className="p-3 h-full flex flex-col overflow-hidden">
        <div className="flex flex-row flex-wrap items-center justify-between gap-2">
          <Text size="text-3xl">Generated Encounter</Text>
          <div className="flex flex-row flex-wrap gap-2"><EncounterHistory /><Button variant="white" disabled={entries.length === 0} onClick={copy}>Copy encounter</Button></div>
        </div>
        <p role="status" className="font-move text-sm p-2">{status}</p>
        <ScrollArea className="flex-1 rounded-3xl">
          {entries.length === 0 ? <p className="text-center font-move p-3">No encounter yet. Broaden your filters if nothing matches.</p> : (
            <div className="encounter-card-grid">{entries.map((entry) => <EncounterCard key={entry.pokemon.id} entry={entry} />)}</div>
          )}
        </ScrollArea>
      </Box>
    </div>
  );
};
