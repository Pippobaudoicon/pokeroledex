import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus } from "lucide-react";
import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type * as T from "../../../shared/types";
import { apiFetch } from "@/api/client";
import { useItemsControllerGenerate, usePokemonControllerGenerate } from "@/api/components";
import { ItemCategory, ItemPocket, LegendaryFilter, Rank, RankUpMethod } from "@/api/schemas";
import { HabitatPicker } from "@/components/HabitatPicker";
import { ItemCard } from "@/components/ItemCard";
import { button } from "@/components/kit/button";
import { Group } from "@/components/kit/List";
import { PageHeader } from "@/components/kit/PageHeader";
import { Picker } from "@/components/kit/Picker";
import { Segmented, segmentPanelProps } from "@/components/kit/Segmented";
import { StaticPokemonProvider } from "@/components/pokemon-sheet/context";
import { PokemonSheet } from "@/components/pokemon-sheet/PokemonSheet";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { useDex } from "@/hooks/use-dex";
import { useScrollToDetail } from "@/hooks/use-scroll-to-detail";
import { useToast } from "@/hooks/use-toast";
import { useMe } from "@/layout/AppShell";
import { formatEnumName } from "@/lib/utils";
import { GeneratorContentProvider, useGeneratorContent } from "./context";
import { EncounterGenerator, GeneratedEncounterList } from "./Encounters";
import { ChoiceGroup, Field, fieldClass, GeneratorEmpty, ToggleField } from "./fields";

type PokemonSettings = Required<Omit<T.GeneratePokemonBody, keyof T.SelectionBody | "pokemonTemplateId">> &
  Pick<T.GeneratePokemonBody, "pokemonTemplateId">;
type ItemSettings = Required<Omit<T.GenerateItemsBody, keyof T.SelectionBody>>;

const GeneratedPokemonList = ({
  showTyping,
  onShowTypingChange,
}: {
  showTyping: boolean;
  onShowTypingChange: (showTyping: boolean) => void;
}) => {
  const { content, setContent } = useGeneratorContent();
  const [lockedPokemon, setLockedPokemon] = React.useState<T.Pokemon[]>([]);
  const generated = (content ?? []).filter((entry): entry is T.Pokemon => "pokemonTemplate" in entry);
  const pokemon = [...lockedPokemon.filter((entry) => !generated.includes(entry)), ...generated];
  const resultsRef = useScrollToDetail(generated.map((entry) => entry.id).join(",") || undefined);
  return (
    <section ref={resultsRef} aria-label="Generated Pokémon" className="min-w-0 scroll-mt-16">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-headline font-semibold">Generated Pokémon</h2>
        <span className="text-footnote text-label-2" aria-live="polite">
          {pokemon.length} Pokémon
        </span>
      </div>
      <div className="mb-3 max-w-sm">
        <ToggleField label="Show Pokémon typing" checked={showTyping} onChange={onShowTypingChange} />
      </div>
      {pokemon.length === 0 ? (
        <GeneratorEmpty
          title="No Pokémon yet"
          description="Choose your settings and generate Pokémon. Lock a result to keep it for the next roll."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {pokemon.map((entry) => (
            <StaticPokemonProvider
              key={entry.id}
              pokemon={entry}
              onChange={(changes) => {
                const updated = { ...entry, ...changes };
                setContent(generated.map((other) => (other.id === entry.id ? updated : other)));
                setLockedPokemon((locked) => locked.map((other) => (other.id === entry.id ? updated : other)));
              }}
              isLocked={lockedPokemon.includes(entry)}
              lockedPressed={() =>
                setLockedPokemon(
                  lockedPokemon.includes(entry) ? lockedPokemon.filter((other) => other !== entry) : [...lockedPokemon, entry],
                )
              }
            >
              <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
                <PokemonSheet showButtons="addAndLock" showTyping={showTyping} embedded />
              </div>
            </StaticPokemonProvider>
          ))}
        </div>
      )}
    </section>
  );
};

const GeneratedItemList = () => {
  const { content } = useGeneratorContent();
  const client = useQueryClient();
  const { toast } = useToast();
  const me = useMe();
  const cities = useQuery({
    queryKey: ["cities"],
    queryFn: ({ signal }) => apiFetch<T.City[]>({ url: "/cities", method: "get", signal }),
  });
  const [selectedCities, setSelectedCities] = React.useState<Record<string, string>>({});
  const stock = useMutation({
    mutationFn: ({ cityId, item, count }: { cityId: string; item: T.Item; count: number }) =>
      apiFetch<T.City>({
        url: `/cities/${encodeURIComponent(cityId)}/stock`,
        method: "post",
        body: { itemId: item.id, quantity: count } satisfies T.CityStockBody,
      }),
    onSuccess: (city, { item, count }) => {
      client.setQueryData<T.City[]>(["cities"], (current) => current?.map((entry) => (entry.id === city.id ? city : entry)));
      toast({ title: `Added ${count} × ${item.name} to ${city.name}` });
    },
    onError: () => toast({ title: "The item could not be added to the city", description: "Please try again." }),
  });
  const leaderCities = cities.data?.filter((city) => city.members[0] === me.data?.email) ?? [];
  const items = (content ?? []).filter((entry): entry is T.Item => !("pokemonTemplate" in entry));
  const entries: { count: number; item: T.Item }[] = [];
  for (const item of items) {
    const entry = entries.find((entry) => entry.item.id === item.id);
    if (entry) entry.count += 1;
    else entries.push({ count: 1, item });
  }
  const resultsRef = useScrollToDetail(items.map((entry) => entry.id).join(",") || undefined);
  return (
    <section ref={resultsRef} aria-label="Generated items" className="min-w-0 scroll-mt-16">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-headline font-semibold">Generated items</h2>
        <span className="text-footnote text-label-2" aria-live="polite">
          {items.length} items
        </span>
      </div>
      {entries.length === 0 ? (
        <GeneratorEmpty
          title="No items yet"
          description="Choose pockets or categories, then generate items for loot, rewards or a shopping list."
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-4">
          {entries.map(({ item, count }) => (
            <div key={item.id} className="min-w-0">
              <p className="mb-2 flex items-center gap-1.5 text-subhead font-semibold">
                <Package aria-hidden className="size-4 text-label-2" />
                {count} × {item.name}
              </p>
              <ItemCard
                item={item}
                footer={
                  cities.isLoading || me.isLoading ? (
                    <p role="status" className="text-footnote text-label-2">Loading your cities…</p>
                  ) : cities.isError || me.isError ? (
                    <p role="alert" className="text-footnote text-label-2">Your cities could not be loaded.</p>
                  ) : leaderCities.length ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`generated-item-city-${item.id}`}>City for {item.name}</label>
                      <select
                        id={`generated-item-city-${item.id}`}
                        value={selectedCities[item.id] ?? leaderCities[0].id}
                        onChange={(event) => setSelectedCities((current) => ({ ...current, [item.id]: event.target.value }))}
                        className={fieldClass}
                      >
                        {leaderCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                      </select>
                      <button
                        type="button"
                        className={button({ variant: "tinted", size: "sm" })}
                        disabled={stock.isPending}
                        onClick={() => stock.mutate({ cityId: selectedCities[item.id] ?? leaderCities[0].id, item, count })}
                      >
                        <Plus aria-hidden className="size-4" />Add to city
                      </button>
                    </div>
                  ) : (
                    <p className="text-footnote text-label-2">You do not lead a city.</p>
                  )
                }
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const PokemonGenerator = () => {
  const { setContent } = useGeneratorContent();
  const { state: campaignFilter } = useCampaignFilter();
  const { data: templates, isFetching } = useDex();
  const [settings, setSettings] = React.useState<PokemonSettings>({
    seed: Date.now(),
    rankUpMethod: RankUpMethod.RANDOM,
    habitats: [],
    includeLegendary: LegendaryFilter.NONE,
    numberToGenerate: 1,
    pokemonTemplateId: undefined,
    rankOrBelow: true,
    rank: Rank.STARTER,
  });
  const { toast } = useToast();
  const { mutate, isPending } = usePokemonControllerGenerate({
    onSuccess: setContent,
    onError: () => toast({ title: "Pokémon couldn’t be generated", description: "Please try again." }),
  });
  const generate = () => {
    const next = { ...settings, seed: Date.now() };
    setSettings(next);
    mutate({ body: { ...next, campaignIds: campaignFilter.campaignIds, includeCore: campaignFilter.includeCore } });
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        generate();
      }}
    >
      <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-6">
        <Group title="Pokémon settings">
          <div className="flex flex-col gap-4 p-3">
            <Field label="Number to generate" hint="Generate between 1 and 100 Pokémon.">
              <input
                type="number"
                min={1}
                max={100}
                value={settings.numberToGenerate}
                onChange={(event) => setSettings({ ...settings, numberToGenerate: Number(event.target.value) })}
                className={fieldClass}
              />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-subhead font-medium">Species</span>
              <Picker
                label="Species"
                value={settings.pokemonTemplateId ?? ""}
                items={(templates ?? []).map((entry) => ({ value: entry.id, label: entry.name }))}
                onChange={(pokemonTemplateId) => setSettings({ ...settings, pokemonTemplateId: pokemonTemplateId || undefined })}
                placeholder="Random species"
                loading={isFetching}
              />
            </div>
            <Field label="Rank">
              <select
                value={settings.rank}
                onChange={(event) => setSettings({ ...settings, rank: event.target.value as Rank })}
                className={fieldClass}
              >
                {Object.values(Rank).map((rank) => (
                  <option key={rank} value={rank}>
                    {formatEnumName(rank)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rank-up method">
              <select
                value={settings.rankUpMethod}
                onChange={(event) => setSettings({ ...settings, rankUpMethod: event.target.value as RankUpMethod })}
                className={fieldClass}
              >
                {Object.values(RankUpMethod).map((method) => (
                  <option key={method} value={method}>
                    {formatEnumName(method)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Legendaries">
              <select
                value={settings.includeLegendary}
                onChange={(event) => setSettings({ ...settings, includeLegendary: event.target.value as LegendaryFilter })}
                className={fieldClass}
              >
                <option value="NONE">No legendaries</option>
                <option value="ALL">Include legendaries</option>
                <option value="ONLY">Only legendaries</option>
              </select>
            </Field>
            <ToggleField
              label="Recommended rank or lower"
              checked={settings.rankOrBelow}
              onChange={(rankOrBelow) => setSettings({ ...settings, rankOrBelow })}
            />
          </div>
        </Group>
        <Group title="Habitats">
          <HabitatPicker
            collapsible
            selected={settings.habitats}
            onChange={(habitats) => setSettings({ ...settings, habitats })}
          />
        </Group>
        <button
          id="generator-generate-button"
          type="submit"
          disabled={
            isPending ||
            !Number.isInteger(settings.numberToGenerate) ||
            settings.numberToGenerate < 1 ||
            settings.numberToGenerate > 100
          }
          className={button({ variant: "filled" })}
        >
          {isPending ? "Generating…" : "Generate Pokémon"}
        </button>
      </fieldset>
    </form>
  );
};

const ItemGenerator = () => {
  const { setContent } = useGeneratorContent();
  const { state: campaignFilter } = useCampaignFilter();
  const [settings, setSettings] = React.useState<ItemSettings>({ seed: Date.now(), numberToGenerate: 1, categories: [], pockets: [] });
  const { toast } = useToast();
  const { mutate, isPending } = useItemsControllerGenerate({
    onSuccess: setContent,
    onError: () => toast({ title: "Items couldn’t be generated", description: "Please try again." }),
  });
  const generate = () => {
    const next = { ...settings, seed: Date.now() };
    setSettings(next);
    mutate({ body: { ...next, campaignIds: campaignFilter.campaignIds, includeCore: campaignFilter.includeCore } });
  };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        generate();
      }}
    >
      <fieldset disabled={isPending} className="flex min-w-0 flex-col gap-6">
        <Group title="Item settings">
          <div className="p-3">
            <Field label="Number to generate" hint="Generate between 1 and 100 items.">
              <input
                type="number"
                min={1}
                max={100}
                value={settings.numberToGenerate}
                onChange={(event) => setSettings({ ...settings, numberToGenerate: Number(event.target.value) })}
                className={fieldClass}
              />
            </Field>
          </div>
        </Group>
        <Group title="Item filters">
          <ChoiceGroup
            label="Pockets"
            options={Object.values(ItemPocket).map((pocket) => ({ value: pocket, label: formatEnumName(pocket) }))}
            selected={settings.pockets}
            onChange={(pockets) => setSettings({ ...settings, pockets })}
          />
          <ChoiceGroup
            label="Categories"
            options={Object.values(ItemCategory).map((category) => ({ value: category, label: formatEnumName(category) }))}
            selected={settings.categories}
            onChange={(categories) => setSettings({ ...settings, categories })}
          />
        </Group>
        <button
          type="submit"
          disabled={
            isPending ||
            !Number.isInteger(settings.numberToGenerate) ||
            settings.numberToGenerate < 1 ||
            settings.numberToGenerate > 100
          }
          className={button({ variant: "filled" })}
        >
          {isPending ? "Generating…" : "Generate items"}
        </button>
      </fieldset>
    </form>
  );
};

const GeneratorPage = () => {
  const { generator } = useParams();
  const active = generator ?? "encounters";
  const navigate = useNavigate();
  const { setContent } = useGeneratorContent();
  const [showTyping, setShowTyping] = React.useState(true);
  return (
    <div className="mx-auto max-w-7xl pb-8">
      <PageHeader title="Generators">
        <p className="text-subhead text-label-2">Build encounters, prepare Pokémon and roll loot for your table.</p>
        <Segmented
          label="Generator"
          idPrefix="generator"
          options={[
            { value: "encounters", label: "Encounters" },
            { value: "pokemon", label: "Pokémon" },
            { value: "items", label: "Items" },
          ]}
          value={active}
          onChange={(value) => {
            if (value !== active) {
              setContent(null);
              navigate(`/generators/${value}`);
            }
          }}
          className="mt-3 max-w-xl"
        />
      </PageHeader>
      <div {...segmentPanelProps("generator", active)} role="tabpanel" className="px-4 lg:px-8">
        <p className="mb-5 text-footnote text-label-2">
          Uses your active{" "}
          <Link to="/campaigns" className="rounded-sm text-tint hover:underline">
            campaign selection
          </Link>
          .
        </p>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[352px_minmax(0,1fr)]">
          <div className="mx-auto w-full min-w-0 max-w-xl lg:mx-0 lg:max-w-none">
            {active === "encounters" ? (
              <EncounterGenerator />
            ) : active === "pokemon" ? (
              <PokemonGenerator />
            ) : active === "items" ? (
              <ItemGenerator />
            ) : (
              <GeneratorEmpty title="Choose a generator" description="Select Encounters, Pokémon or Items above to get started." />
            )}
          </div>
          <div className="min-w-0">
            {active === "encounters" ? (
              <GeneratedEncounterList />
            ) : active === "pokemon" ? (
              <GeneratedPokemonList showTyping={showTyping} onShowTypingChange={setShowTyping} />
            ) : active === "items" ? (
              <GeneratedItemList />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export const GeneratorsPage = () => (
  <GeneratorContentProvider>
    <GeneratorPage />
  </GeneratorContentProvider>
);
