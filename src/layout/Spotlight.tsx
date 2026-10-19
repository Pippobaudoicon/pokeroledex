import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { BookOpen, CornerDownLeft, Search } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { chapters } from "../../shared/rulebook-sections";
import { usePokemonControllerFindAllMinimal } from "@/api/components";
import { TypeDot } from "@/components/kit/Pills";
import { Sprite } from "@/components/kit/Sprite";
import { fold, useDex, useItemIndex, useMoveIndex } from "@/hooks/use-dex";
import { allNavItems } from "@/layout/nav";
import { formatEnumName } from "@/lib/utils";
import { quickReference } from "@/pages/Rulebook/quick-reference";

const SpotlightContext = React.createContext<{ open: () => void }>({ open: () => {} });
export const useSpotlight = () => React.useContext(SpotlightContext);

interface Hit {
  key: string;
  to: string;
  title: string;
  subtitle?: string;
  meta?: string;
  visual: React.ReactNode;
}

/** 0 for a prefix match, 1 for a word start, 2 anywhere, -1 for no match. */
const score = (key: string, query: string) => {
  if (key.startsWith(query)) return 0;
  const at = key.indexOf(query);
  if (at === -1) return -1;
  return /[\s(\-/]/.test(key[at - 1]) ? 1 : 2;
};

const best = <E,>(entries: E[] | undefined, query: string, keyOf: (entry: E) => string, limit: number) => {
  if (!entries) return [];
  const ranked: { entry: E; rank: number; index: number }[] = [];
  entries.forEach((entry, index) => {
    const rank = score(keyOf(entry), query);
    if (rank !== -1) ranked.push({ entry, rank, index });
  });
  return ranked
    .sort((first, second) => first.rank - second.rank || first.index - second.index)
    .slice(0, limit)
    .map(({ entry }) => entry);
};

const rulebookEntries = [
  ...chapters.flatMap(([chapter, sections]) =>
    sections.map(([page, title]) => ({ title, chapter, to: `/rulebook?page=${page}`, page, key: fold(`${title} ${chapter}`) })),
  ),
  ...quickReference.map((section) => ({
    title: section.title,
    chapter: "Quick reference",
    to: "/rulebook?tab=quick",
    page: section.pages[0],
    key: fold(section.title),
  })),
];

const Results = ({ query, onPick }: { query: string; onPick: (to: string) => void }) => {
  const dex = useDex();
  const moves = useMoveIndex();
  const items = useItemIndex();
  const { data: myPokemon } = usePokemonControllerFindAllMinimal({});
  const folded = fold(query.trim());
  const dexKeys = React.useMemo(() => new Map(dex.data?.map((template) => [template, fold(template.name)])), [dex.data]);
  const groups: { heading: string; hits: Hit[]; loading?: boolean }[] = React.useMemo(() => {
    if (folded === "")
      return [
        {
          heading: "Go to",
          hits: allNavItems.map((item) => ({ key: item.to, to: item.to, title: item.label, subtitle: item.hint, visual: <NavVisual icon={item.icon} tile={item.tile} /> })),
        },
      ];
    const number = /^#?\d+$/.test(folded) ? Number(folded.replace("#", "")) : undefined;
    const pokemon =
      number !== undefined
        ? (dex.data ?? []).filter((template) => template.number === number).slice(0, 6)
        : best(dex.data, folded, (template) => dexKeys.get(template) ?? "", 6);
    return [
      {
        heading: "Pokédex",
        loading: dex.isPending,
        hits: pokemon.map((template) => ({
          key: `p-${template.id}`,
          to: `/pokemon/${template.id}`,
          title: template.name,
          subtitle: template.types.map(formatEnumName).join(" · "),
          meta: `#${template.dexID ?? template.number}`,
          visual: <Sprite image={template.image} set="box" className="size-9" />,
        })),
      },
      {
        heading: "My Pokémon",
        hits: best(myPokemon, folded, (entry) => fold(entry.name ?? ""), 4).map((entry) => ({
          key: `m-${entry.id}`,
          to: `/myPokemon/${entry.id}`,
          title: entry.name,
          subtitle: formatEnumName(entry.rank),
          visual: <Sprite image={entry.image} set="box" className="size-9" />,
        })),
      },
      {
        heading: "Moves",
        loading: moves.isPending,
        hits: best(moves.data, folded, (move) => fold(move.name), 5).map((move) => ({
          key: `v-${move.id}`,
          to: `/moves?search=${encodeURIComponent(move.name)}`,
          title: move.name,
          subtitle: [formatEnumName(move.category).replace(" ", "/"), move.damagePower && move.damagePower !== "0" ? `Power ${move.damagePower}` : undefined]
            .filter(Boolean)
            .join(" · "),
          visual: <TypeDot type={move.type} className="size-7" />,
        })),
      },
      {
        heading: "Items",
        loading: items.isPending,
        hits: best(items.data, folded, (item) => fold(item.name), 4).map((item) => ({
          key: `i-${item.id}`,
          to: `/items/${item.id}`,
          title: item.name,
          subtitle: formatEnumName(item.pocket),
          visual: item.image ? <img src={`/images/item/${item.image}`} alt="" className="size-7 object-contain" loading="lazy" /> : <span className="size-7" />,
        })),
      },
      {
        heading: "Rulebook",
        hits: best(rulebookEntries, folded, (entry) => entry.key, 4).map((entry) => ({
          key: `r-${entry.chapter}-${entry.title}`,
          to: entry.to,
          title: entry.title,
          subtitle: entry.chapter,
          meta: `p. ${entry.page}`,
          visual: <NavVisual icon={<BookOpen />} tile="bg-[#0e7490]" />,
        })),
      },
      {
        heading: "Go to",
        hits: best(allNavItems, folded, (item) => fold(item.label), 3).map((item) => ({
          key: item.to,
          to: item.to,
          title: item.label,
          subtitle: item.hint,
          visual: <NavVisual icon={item.icon} tile={item.tile} />,
        })),
      },
    ];
  }, [folded, dex.data, dex.isPending, dexKeys, myPokemon, moves.data, moves.isPending, items.data, items.isPending]);
  const total = groups.reduce((sum, group) => sum + group.hits.length, 0);
  const loading = groups.some((group) => group.loading);
  return (
    <Command.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 lg:max-h-[min(520px,60dvh)]">
      {total === 0 && !loading && (
        <p className="px-4 py-10 text-center text-body text-label-2">
          No results for “{query.trim()}”.
          <br />
          <span className="text-subhead">Try a Pokémon, move, item or rule, e.g. “Pikachu”, “Ember” or “Initiative”.</span>
        </p>
      )}
      {groups.map((group) =>
        group.hits.length === 0 && !group.loading ? null : (
          <Command.Group
            key={group.heading}
            heading={group.heading}
            className="pt-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-footnote [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-label-2"
          >
            {group.hits.length === 0 && group.loading && (
              <div aria-hidden className="flex items-center gap-3 px-3 py-2">
                <span className="skeleton size-8 rounded-lg" />
                <span className="skeleton h-3.5 w-40" />
              </div>
            )}
            {group.hits.map((hit) => (
              <Command.Item
                key={hit.key}
                value={hit.key.toLowerCase()}
                onSelect={() => onPick(hit.to)}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-1.5 text-label aria-selected:bg-tint aria-selected:text-white lg:min-h-10 lg:rounded-lg lg:px-2.5 group/hit"
              >
                <span className="grid size-9 shrink-0 place-items-center">{hit.visual}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">{hit.title}</span>
                  {hit.subtitle && <span className="block truncate text-footnote text-label-2 group-aria-selected/hit:text-white">{hit.subtitle}</span>}
                </span>
                {hit.meta && <span className="shrink-0 text-footnote tabular-nums text-label-2 group-aria-selected/hit:text-white">{hit.meta}</span>}
                <CornerDownLeft aria-hidden className="hidden size-4 shrink-0 opacity-0 group-aria-selected/hit:opacity-100 lg:block" />
              </Command.Item>
            ))}
          </Command.Group>
        ),
      )}
    </Command.List>
  );
};

const NavVisual = ({ icon, tile }: { icon: React.ReactNode; tile: string }) => (
  <span className={`grid size-7 place-items-center rounded-lg text-white [&>svg]:size-4 ${tile}`}>{icon}</span>
);

/** ⌘K / Ctrl+K (or "/") search over Pokémon, your Pokémon, moves, items, rulebook sections and pages. */
export const SpotlightProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const navigate = useNavigate();
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true]");
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing && !open)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const context = React.useMemo(() => ({ open: () => setOpen(true) }), []);
  const pick = (to: string) => {
    setOpen(false);
    setQuery("");
    navigate(to);
  };
  return (
    <SpotlightContext.Provider value={context}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/20 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 max-lg:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed z-50 flex flex-col overflow-hidden bg-canvas outline-none [--tw-duration:180ms] [--tw-ease:var(--ease-spring)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 max-lg:inset-0 max-lg:max-h-none! max-lg:max-w-none! max-lg:data-[state=open]:slide-in-from-bottom-8 lg:left-1/2 lg:top-[12dvh] lg:w-[min(640px,calc(100vw-48px))] lg:-translate-x-1/2 lg:rounded-2xl lg:bg-surface/90 lg:shadow-float lg:backdrop-blur-2xl lg:backdrop-saturate-150 lg:data-[state=open]:zoom-in-[0.98]"
          >
            <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
            <Command shouldFilter={false} label="Search" className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center gap-2 px-3 pt-[calc(8px+env(safe-area-inset-top))] pb-2 lg:border-b lg:border-hairline lg:px-4 lg:py-0">
                <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-fill px-3 lg:h-14 lg:bg-transparent lg:px-0">
                  <Search aria-hidden className="size-5 shrink-0 text-label-2" />
                  <Command.Input
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Pokémon, moves, items, rules…"
                    aria-label="Search Pokémon, moves, items and rules"
                    className="min-w-0 flex-1 bg-transparent text-body text-label outline-none placeholder:text-label-3! lg:text-title-3"
                  />
                </label>
                <DialogPrimitive.Close className="h-11 shrink-0 rounded-lg px-2 text-body text-tint lg:hidden">Cancel</DialogPrimitive.Close>
                <kbd className="hidden shrink-0 rounded-md border border-hairline px-1.5 py-0.5 text-caption text-label-2 lg:block">esc</kbd>
              </div>
              <Results query={query} onPick={pick} />
              <div className="hidden items-center gap-4 border-t border-hairline px-4 py-2 text-caption text-label-2 lg:flex">
                <span>
                  <kbd className="font-sans">↑↓</kbd> to move
                </span>
                <span>
                  <kbd className="font-sans">↵</kbd> to open
                </span>
                <span className="ml-auto">
                  <kbd className="font-sans">⌘K</kbd> anywhere
                </span>
              </div>
            </Command>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </SpotlightContext.Provider>
  );
};
