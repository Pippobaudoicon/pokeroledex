import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { CITY_SKILLS, CRAFTING_SKILLS } from "../../../shared/types";
import { speciesWorkProfile } from "../../../shared/crafting-data";
import { habitatMacros, habitatName, normalizeHabitats } from "../../../shared/habitats";
import { Link, useNavigate } from "react-router-dom";
import { usePokemonControllerCreate, usePokemonTemplatesControllerFindOne } from "@/api/components";
import { Rank } from "@/api/schemas";
import { button } from "@/components/kit/button";
import { Group, Row } from "@/components/kit/List";
import { MoveRow } from "@/components/kit/MoveRow";
import { PageHeader } from "@/components/kit/PageHeader";
import { RankBadge, RankBall, TypePill, typeColor } from "@/components/kit/Pills";
import { Pokeball } from "@/components/kit/Pokeball";
import { Segmented, segmentPanelProps } from "@/components/kit/Segmented";
import { Sprite } from "@/components/kit/Sprite";
import { useDex } from "@/hooks/use-dex";
import { useToast } from "@/hooks/use-toast";
import { useTypeEffectiveness } from "@/lib/type-chart";
import { cn, formatEnumName } from "@/lib/utils";
import { attributeNames } from "@/pages/PokemonCatalog/filters";

type Summary = T.PokemonTemplateSummary;
type Layout = "page" | "sheet" | "inspector";

const ranks = Object.values(Rank);

/** Type-tinted wash behind the artwork. */
export const typeWash = (types: T.PokemonType[]) =>
  `linear-gradient(160deg, color-mix(in oklab, ${typeColor(types[0])} 34%, var(--color-surface)) 0%, color-mix(in oklab, ${typeColor(types[1] ?? types[0])} 16%, var(--color-surface)) 70%, var(--color-surface) 100%)`;

const AddButton = ({ template, className }: { template: Summary; className?: string }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [added, setAdded] = React.useState<string>();
  const { mutate, isPending } = usePokemonControllerCreate({
    onSuccess: (pokemon) => {
      setAdded(pokemon.id);
      queryClient.invalidateQueries({ queryKey: ["pokemon"] });
      toast({
        title: `${template.name} joined your Pokémon`,
        description: "Its sheet is ready to fill in.",
        action: (
          <button type="button" onClick={() => navigate(`/myPokemon/${pokemon.id}`)} className={button({ variant: "tinted", size: "sm" })}>
            Open
          </button>
        ),
      });
    },
    onError: () => toast({ title: "Couldn’t add the Pokémon", description: "Check your connection and try again." }),
  });
  if (added)
    return (
      <Link to={`/myPokemon/${added}`} className={cn(button({ variant: "tinted", size: "lg" }), className)}>
        <Check aria-hidden className="size-5 lg:size-4" />
        Added · Open sheet
      </Link>
    );
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => mutate({ body: { pokemonTemplateId: template.id, rank: Rank.UNRANKED, moveIds: [] } })}
      className={cn(button({ variant: "filled", size: "lg" }), className)}
    >
      <Plus aria-hidden className="size-5 lg:size-4" strokeWidth={2.5} />
      {isPending ? "Adding…" : "Add to My Pokémon"}
    </button>
  );
};

const Hero = ({ template, layout, onClose }: { template: Summary; layout: Layout; onClose?: () => void }) => (
  <div className="relative overflow-hidden" style={{ backgroundImage: typeWash(template.types) }}>
    <Pokeball className="absolute -top-16 -right-16 size-72 text-surface/50" strokeWidth={3.5} />
    {layout === "inspector" && (
      <div className="relative flex justify-end gap-1 p-2">
        <button type="button" onClick={onClose} aria-label="Close details" className={cn(button({ variant: "gray", size: "icon" }), "bg-surface/60 hover:bg-surface/80")}>
          <X className="size-4" />
        </button>
      </div>
    )}
    <div className={cn("relative flex items-end gap-3 px-4 pb-4 @lg:gap-5 @lg:px-6", layout === "page" && "pt-4", layout === "sheet" && "pt-10")}>
      <div className="min-w-0 flex-1 pb-1">
        <p className="text-subhead font-medium text-label-2 tabular-nums">
          #{template.dexID || template.number}
          {template.dexCategory && <span className="font-normal"> · {template.dexCategory}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-x-2">
          <h2 className="font-display text-title-1 leading-tight break-words">{template.name}</h2>
          <RankBadge rank={template.recommendedRank} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {template.types.map((type) => (
            <TypePill key={type} type={type} />
          ))}
          {template.legendary && <span className="inline-flex h-6 items-center rounded-full bg-surface/70 px-2.5 text-footnote font-semibold">Legendary</span>}
          {template.goodStarter && <span className="inline-flex h-6 items-center rounded-full bg-surface/70 px-2.5 text-footnote font-semibold">Good starter</span>}
        </div>
      </div>
      <Sprite image={template.image} set="book" eager className="size-32 drop-shadow-[0_8px_16px_rgb(0_0_0/0.18)] @lg:size-40" />
    </div>
  </div>
);

/** Base attribute as filled pips, the room to grow to its max as hollow ones. */
const AttributeRow = ({ name, base, max }: { name: string; base: number; max: number }) => (
  <div className="flex items-center gap-3 border-b border-hairline py-2 pr-4 pl-4 last:border-b-0 lg:py-1.5 lg:pr-3 lg:pl-3">
    <span className="w-22 shrink-0 text-body">{name}</span>
    <span className="flex flex-1 gap-1" aria-hidden>
      {Array.from({ length: Math.max(max, base) }, (_, index) => (
        <span
          key={index}
          className={cn("h-2.5 max-w-6 flex-1 rounded-full", index < base ? "bg-label" : "border-[1.5px] border-label/35 bg-transparent")}
        />
      ))}
    </span>
    <span className="w-12 shrink-0 text-right text-subhead text-label-2 tabular-nums">
      <span className="sr-only">{`base ${base}, max ${max}`}</span>
      <span aria-hidden>
        <span className="font-semibold text-label">{base}</span>/{max}
      </span>
    </span>
  </div>
);

const matchupRows: [4 | 2 | 0.5 | 0.25 | 0, string, string, string][] = [
  [4, "4×", "bg-green-700", "Very weak to"],
  [2, "2×", "bg-green-600", "Weak to"],
  [0.5, "½×", "bg-red-600", "Resists"],
  [0.25, "¼×", "bg-red-700", "Strongly resists"],
  [0, "0×", "bg-purple-700", "Immune to"],
];

/** Attacking types that don't hit this type combination for normal damage, by multiplier. Also the Pokémon sheet's type hover. */
export const MatchupTable = ({ types }: { types: T.PokemonType[] }) => {
  const chart = useTypeEffectiveness().getDefensiveChart(types[0], types[1]);
  return (
    <table className="w-full">
      <tbody>
        {matchupRows
          .filter(([multiplier]) => chart[multiplier].length > 0)
          .map(([multiplier, text, color, label]) => (
            <tr key={multiplier} className="border-b border-hairline last:border-b-0">
              <th scope="row" className="w-11 py-2 pr-2 align-top">
                <span className={cn("grid h-6 w-9 place-items-center rounded-md text-footnote font-semibold text-white", color)}>{text}</span>
              </th>
              <td className="py-2">
                <span className="block text-footnote text-label-2">{label}</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {chart[multiplier].map((type) => (
                    <TypePill key={type} type={type} size="sm" />
                  ))}
                </span>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
};

const Matchups = ({ types }: { types: T.PokemonType[] }) => (
  <Group title="Type matchups">
    <div className="px-4 lg:px-3">
      <MatchupTable types={types} />
    </div>
  </Group>
);

/** Which city skills this species can work, from shared/crafting.ts and its exceptions. */
const CityWork = ({ template, dex }: { template: Summary; dex: Summary[] }) => {
  const profile = speciesWorkProfile(template, dex);
  const skills = CITY_SKILLS.filter((skill): skill is T.ProfileSkill => skill !== "catalyst" && !!profile[skill]);
  return (
    <Group title="City work" footer="In a city it adds its full bonus to full skills and half to half skills. Any Pokémon can be a Catalyst.">
      {skills.map((skill) => (
        <Row key={skill} title={formatEnumName(skill)} subtitle={(CRAFTING_SKILLS as readonly string[]).includes(skill) ? "Crafting" : "Support"}
          value={<span className={cn("font-semibold", profile[skill] === "full" ? "text-label" : "text-label-2")}>{profile[skill] === "full" ? "Full" : "Half"}</span>} />
      ))}
    </Group>
  );
};

const abilityList = (template: Summary) =>
  (
    [
      [template.abilityOne, undefined],
      [template.abilityTwo, undefined],
      [template.hiddenAbility, "Hidden"],
      [template.eventAbility, "Event"],
    ] as const
  ).filter((entry): entry is [T.Ability, "Hidden" | "Event" | undefined] => entry[0] != null);

const Overview = ({ template, dex }: { template: Summary; dex: Summary[] }) => (
  <div className="grid gap-6 @2xl:grid-cols-2 @2xl:gap-5">
    <div className="flex flex-col gap-6 @2xl:gap-5">
      <Group title="Attributes" footer="Filled: base. Hollow: room to grow up to the max.">
        {(Object.keys(attributeNames) as T.Attribute[]).map((stat) => (
          <AttributeRow key={stat} name={attributeNames[stat]} base={template.baseStats[stat]} max={template.maxStats[stat]} />
        ))}
      </Group>
      <Group title="Abilities">
        {abilityList(template).map(([ability, tag]) => (
          <div key={ability.id} className="border-b border-hairline px-4 py-2.5 last:border-b-0 lg:px-3 lg:py-2">
            <p className="flex items-center gap-2 text-body font-semibold">
              {ability.name}
              {tag && <span className="rounded-full bg-fill px-2 py-0.5 text-caption font-semibold text-label-2">{tag}</span>}
            </p>
            {ability.effect && <p className="mt-0.5 text-subhead text-label-2">{ability.effect}</p>}
          </div>
        ))}
      </Group>
    </div>
    <div className="flex flex-col gap-6 @2xl:gap-5">
      <Group title="Profile">
        <Row title="Base HP" value={<span className="font-semibold text-label tabular-nums">{template.baseHp}</span>} />
        <Row title="Recommended rank" value={<span className="inline-flex items-center gap-1.5"><RankBall rank={template.recommendedRank} />{formatEnumName(template.recommendedRank)}</span>} />
        <Row title="Height" value={`${template.height} m`} />
        <Row title="Weight" value={`${template.weight} kg`} />
        {template.habitats.length > 0 && (
          <>
            <Row title="Macro habitats" subtitle={habitatMacros(template.habitats).map(habitatName).join(", ")} />
            <Row title="Habitats" subtitle={normalizeHabitats(template.habitats).map(habitatName).join(", ")} />
          </>
        )}
        {template.habitatProvenance && (
          <Row title="Habitat source" subtitle={
            <span>
              {template.habitatProvenance.status === "needs-review" ? "Default habitats · awaiting review" :
                template.habitatProvenance.status === "inherited" ? "Bulbapedia · inherited from species" :
                  template.habitatProvenance.status === "not-applicable" ? "Not applicable" : "Bulbapedia"}
              {template.habitatProvenance.source && (
                <> · <a className="underline" href={`${template.habitatProvenance.source.url}?oldid=${template.habitatProvenance.source.revisionId}`} target="_blank" rel="noreferrer">View source</a></>
              )}
            </span>
          } />
        )}
      </Group>
      <Matchups types={template.types} />
      <CityWork template={template} dex={dex} />
      {template.description && (
        <Group title="Pokédex entry">
          <p className="px-4 py-3 text-body leading-relaxed text-label lg:px-3">{template.description}</p>
        </Group>
      )}
    </div>
  </div>
);

const Moves = ({ id }: { id: string }) => {
  const { data, isError } = usePokemonTemplatesControllerFindOne({ pathParams: { id } });
  if (isError) return <p className="rounded-xl bg-surface p-6 text-center text-subhead text-label-2 shadow-card">Moves didn’t load.</p>;
  if (!data)
    return (
      <div className="overflow-hidden rounded-xl bg-surface shadow-card">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex h-13 items-center gap-3 border-b border-hairline px-4 last:border-b-0">
            <div className="skeleton size-6 rounded-full" />
            <div className="skeleton h-4 w-40 rounded" />
          </div>
        ))}
      </div>
    );
  const byRank = ranks
    .map((rank) => ({
      rank,
      moves: data.possibleMoves.filter((possible) => possible.rank === rank).sort((first, second) => first.move.name.localeCompare(second.move.name)),
    }))
    .filter((group) => group.moves.length > 0);
  if (byRank.length === 0) return <p className="rounded-xl bg-surface p-6 text-center text-subhead text-label-2 shadow-card">No moves listed.</p>;
  return (
    <div className="flex flex-col gap-6 @2xl:gap-5">
      {byRank.map((group) => (
        <Group
          key={group.rank}
          title={
            <span className="inline-flex items-center gap-1.5">
              <RankBall rank={group.rank} className="size-3.5" />
              {formatEnumName(group.rank)}
            </span>
          }
        >
          <ul>
            {group.moves.map((possible) => (
              <MoveRow key={possible.move.id} move={possible.move} />
            ))}
          </ul>
        </Group>
      ))}
    </div>
  );
};

const evolutionCondition = (evolution: T.Evolution) => {
  const detail = evolution.item ?? evolution.special ?? (evolution.value !== undefined ? String(evolution.value) : undefined);
  return [formatEnumName(evolution.kind), detail, evolution.speed && evolution.speed !== "Unknown" ? `${evolution.speed} pace` : undefined]
    .filter(Boolean)
    .join(" · ");
};

const Evolutions = ({ template, dex }: { template: Summary; dex: Summary[] }) => {
  const groups = [
    { title: "Evolves from", list: template.evolutions.filter((evolution) => evolution.type === "FROM") },
    { title: "Evolves into", list: template.evolutions.filter((evolution) => evolution.type === "TO") },
  ].filter((group) => group.list.length > 0);
  if (groups.length === 0)
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl bg-surface p-8 text-center shadow-card">
        <Pokeball className="size-10 text-label-3" />
        <p className="text-subhead text-label-2">{template.name} doesn’t evolve.</p>
      </div>
    );
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <Group key={group.title} title={group.title}>
          {group.list.map((evolution, index) => {
            const target = dex.find((pokemon) => pokemon.id === evolution.targetId);
            return (
              <Row
                key={`${evolution.targetId}-${index}`}
                to={target ? `/pokemon/${target.id}` : undefined}
                replace
                icon={<Sprite image={target?.image} set="box" className="h-11 w-14 -my-1" />}
                title={target?.name ?? "Unknown Pokémon"}
                subtitle={evolutionCondition(evolution)}
              />
            );
          })}
        </Group>
      ))}
    </div>
  );
};

type Tab = "overview" | "moves" | "evolutions";

/**
 * A species' page. The summary already cached for the list renders at once; moves load on demand.
 * `sheet` sits in the phone sheet, `inspector` beside the desktop grid, `page` stands alone.
 */
export const PokemonDetail = ({ id, layout, onClose }: { id: string; layout: Layout; onClose?: () => void }) => {
  const { data: dex, isError } = useDex();
  const [tab, setTab] = React.useState<Tab>("overview");
  const template = dex?.find((pokemon) => pokemon.id === id);
  const header = layout === "page" && <PageHeader compact title={template?.name ?? "Pokémon"} back={{ to: "/pokemon", label: "Pokédex" }} />;

  if (!template)
    return (
      <>
        {header}
        {dex || isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Pokeball className="size-14 text-label-3" />
            <h2 className="text-title-3 font-semibold">Pokémon not found</h2>
            <p className="max-w-xs text-subhead text-label-2">It may belong to a campaign that isn’t selected, or the link is out of date.</p>
            <Link to="/pokemon" className={button({ variant: "tinted" })}>
              Browse the Pokédex
            </Link>
          </div>
        ) : (
          <div aria-busy className="p-4">
            <div className="skeleton h-44 rounded-2xl" />
            <div className="skeleton mt-4 h-10 rounded-xl" />
            <div className="skeleton mt-4 h-60 rounded-xl" />
          </div>
        )}
      </>
    );

  const evolutionCount = template.evolutions.length;
  return (
    <article className="@container min-h-full bg-canvas" aria-label={template.name}>
      {header}
      <Hero template={template} layout={layout} onClose={onClose} />
      <div className="flex flex-col gap-4 px-4 pt-3 pb-8 @lg:px-6">
        <AddButton key={template.id} template={template} className="w-full lg:w-auto lg:self-start" />
        <div
          className={cn(
            "z-20 -mx-4 bg-canvas/85 px-4 py-2 backdrop-blur-xl @lg:-mx-6 @lg:px-6",
            // In the phone sheet the floating close button owns the top edge, so the control scrolls away there.
            layout === "page" && "sticky top-[calc(52px+env(safe-area-inset-top))]",
            layout === "inspector" && "sticky top-0",
          )}
        >
        <Segmented
          label="Section"
          idPrefix="dex"
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "moves", label: "Moves" },
            { value: "evolutions", label: evolutionCount ? `Evolutions · ${evolutionCount}` : "Evolutions" },
          ]}
        />
        </div>
        <div {...segmentPanelProps("dex", tab)} tabIndex={-1} className="outline-none animate-in fade-in-0 [--tw-duration:150ms]" key={tab}>
          {tab === "overview" && <Overview template={template} dex={dex ?? []} />}
          {tab === "moves" && <Moves id={id} />}
          {tab === "evolutions" && <Evolutions template={template} dex={dex ?? []} />}
        </div>
      </div>
    </article>
  );
};
