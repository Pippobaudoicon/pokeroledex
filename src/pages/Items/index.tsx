import { useMediaQuery } from "@uidotdev/usehooks";
import { Search, SlidersHorizontal, X } from "lucide-react";
import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type * as T from "../../../shared/types";
import { useItemsControllerFindOne } from "@/api/components";
import { ItemCategory, ItemPocket } from "@/api/schemas";
import { getItemColor } from "@/components/ItemCard";
import { ItemImage } from "@/components/ItemImage";
import { button } from "@/components/kit/button";
import { Chip } from "@/components/kit/Controls";
import { Group, Row } from "@/components/kit/List";
import { PageHeader } from "@/components/kit/PageHeader";
import { Sheet } from "@/components/kit/Sheet";
import { fold, useItemIndex } from "@/hooks/use-dex";
import { cn, formatEnumName } from "@/lib/utils";

const ItemDetail = ({ id }: { id: string }) => {
  const { data: item, isError, refetch } = useItemsControllerFindOne({ pathParams: { id } });
  if (isError)
    return (
      <div className="p-6 text-center">
        <p className="mb-3 text-body">This item couldn’t be loaded.</p>
        <button type="button" className={button({ variant: "tinted" })} onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  if (!item)
    return (
      <div aria-hidden className="space-y-4 p-4">
        <div className="skeleton h-40 rounded-xl" />
        <div className="skeleton h-24 rounded-xl" />
      </div>
    );
  return (
    <div className="flex flex-col gap-6 p-4">
      <div
        className="flex flex-col items-center gap-3 rounded-2xl p-5 text-center"
        style={{
          background: `linear-gradient(150deg, color-mix(in oklab, var(--color-${getItemColor(item.pocket, item.category)}) 20%, var(--color-surface)), var(--color-surface))`,
        }}
      >
        <ItemImage imageFileName={item.image} className="size-24" />
        <h2 className="font-display text-title-1">{item.name}</h2>
        <p className="text-subhead text-label-2">
          {formatEnumName(item.pocket ?? "Unassigned")}
          {item.category && ` · ${formatEnumName(item.category)}`}
        </p>
      </div>
      <Group title="Description">
        <p className="p-4 text-body whitespace-pre-wrap">{item.description || "No description available."}</p>
      </Group>
      <Group title="Details">
        <Row title="Pocket" value={formatEnumName(item.pocket ?? "Unassigned")} />
        {item.category && <Row title="Category" value={formatEnumName(item.category)} />}
        <Row title="Trainer price" value={item.trainerPrice ?? "—"} />
        <Row title="PMD price" value={item.pmdPrice ?? "—"} />
        <Row title="Single use" value={item.oneUse ? "Yes" : "No"} />
        <Row title="PMD item" value={item.PMD ? "Yes" : "No"} />
        {item.source && <Row title="Source" subtitle={item.source} />}
      </Group>
    </div>
  );
};

const PAGE_SIZE = 60;

export const ItemsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const { data: items, isError, refetch } = useItemIndex();
  const [params] = useSearchParams();
  const search = params.toString();
  const [query, setQuery] = React.useState(params.get("search") ?? "");
  React.useEffect(() => setQuery(params.get("search") ?? ""), [params]);
  const deferredQuery = React.useDeferredValue(query);
  const [pockets, setPockets] = React.useState<T.ItemPocket[]>([]);
  const [categories, setCategories] = React.useState<T.ItemCategory[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [listSeen, setListSeen] = React.useState(!id);
  React.useEffect(() => {
    if (!id) setListSeen(true);
  }, [id]);
  const close = () => (listSeen ? navigate(-1) : navigate("/items", { replace: true }));
  const list = React.useMemo(() => {
    const needle = fold(deferredQuery.trim());
    return items
      ?.filter(
        (item) =>
          (!needle || fold(`${item.name} ${item.description}`).includes(needle)) &&
          (!pockets.length || pockets.includes(item.pocket)) &&
          (!categories.length || (item.category !== null && categories.includes(item.category))),
      )
      .sort((a, b) =>
        (a.pocket ?? "\uffff").localeCompare(b.pocket ?? "\uffff") ||
        (a.category ?? "\uffff").localeCompare(b.category ?? "\uffff") ||
        a.name.localeCompare(b.name),
      );
  }, [items, deferredQuery, pockets, categories]);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const sentinel = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => setVisibleCount(PAGE_SIZE), [list]);
  React.useEffect(() => {
    if (!sentinel.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((count) => count + PAGE_SIZE);
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [list, visibleCount]);
  const clearFilters = () => {
    setPockets([]);
    setCategories([]);
  };
  return (
    <div className="lg:flex">
      <div className="mx-auto min-w-0 max-w-6xl flex-1 pb-8">
        <PageHeader title="Items">
          <p className="text-subhead text-label-2">Equipment, medicine and everything in your bag.</p>
          <div className="mt-3 flex gap-2">
            <label className="relative flex min-w-0 flex-1 items-center lg:max-w-md">
              <span className="sr-only">Search items</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 size-4.5 text-label-2 lg:left-2.5 lg:size-4" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or description"
                className="h-11 w-full rounded-xl bg-fill pr-3 pl-10 text-body outline-none placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-focus lg:h-8 lg:rounded-lg lg:pl-8"
              />
            </label>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              className={button({ variant: categories.length ? "tinted" : "gray" })}
            >
              <SlidersHorizontal aria-hidden className="size-4" />
              Filters
              {categories.length > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-tint text-caption text-on-tint">{categories.length}</span>
              )}
            </button>
          </div>
        </PageHeader>
        <div role="group" aria-label="Filter by pocket" className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-3 lg:px-8">
          {Object.values(ItemPocket).map((pocket) => (
            <Chip
              key={pocket}
              pressed={pockets.includes(pocket)}
              onClick={() => setPockets(pockets.includes(pocket) ? pockets.filter((entry) => entry !== pocket) : [...pockets, pocket])}
            >
              {formatEnumName(pocket)}
            </Chip>
          ))}
        </div>
        <div className="px-4 lg:px-8">
          <div className="mb-3 flex min-h-8 flex-wrap items-center gap-1.5 px-1" aria-live="polite">
            <p className="mr-1 text-footnote font-medium text-label-2">{list ? `${list.length} items` : "Loading…"}</p>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                aria-label={`Remove filter: ${formatEnumName(category)}`}
                onClick={() => setCategories(categories.filter((entry) => entry !== category))}
                className="inline-flex items-center gap-1 rounded-full bg-tint/10 px-2.5 py-1 text-footnote text-tint"
              >
                {formatEnumName(category)}
                <X aria-hidden className="size-3" />
              </button>
            ))}
            {(pockets.length > 0 || categories.length > 0) && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full px-2 py-1 text-footnote font-semibold text-tint hover:bg-tint/10"
              >
                Clear filters
              </button>
            )}
          </div>
          {isError ? (
            <div className="rounded-2xl bg-surface p-8 text-center shadow-card">
              <p className="mb-3 text-body">Items couldn’t be loaded.</p>
              <button type="button" className={button({ variant: "tinted" })} onClick={() => refetch()}>
                Try again
              </button>
            </div>
          ) : !list ? (
            <div aria-hidden className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="skeleton h-40 rounded-xl" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-2xl bg-surface p-8 text-center shadow-card">
              <p className="text-body">No items match your search and filters.</p>
              <button
                type="button"
                className={cn(button({ variant: "tinted" }), "mt-3")}
                onClick={() => {
                  setQuery("");
                  clearFilters();
                }}
              >
                Reset search
              </button>
            </div>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,160px)] justify-center gap-3 sm:grid-cols-[repeat(auto-fill,180px)] sm:justify-start">
              {list.slice(0, visibleCount).map((item) => (
                <li key={item.id}>
                  <Link
                    to={{ pathname: `/items/${item.id}`, search: search ? `?${search}` : "" }}
                    replace={!!id}
                    aria-current={item.id === id ? "true" : undefined}
                    className="flex h-full flex-col items-center gap-2 rounded-xl bg-surface p-3 text-center shadow-card transition-colors hover:bg-raised aria-[current]:ring-2 aria-[current]:ring-tint"
                  >
                    <ItemImage imageFileName={item.image} className="my-1 size-16" />
                    <span className="line-clamp-2 min-h-[2.8em] w-full text-body font-semibold">{item.name}</span>
                    <span className="mt-auto text-caption text-label-2">{formatEnumName(item.category ?? item.pocket ?? "Item")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {list && visibleCount < list.length && (
            <button
              ref={sentinel}
              type="button"
              className={cn(button({ variant: "gray" }), "mx-auto mt-6 flex")}
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Load more items
            </button>
          )}
        </div>
      </div>
      {id && desktop && (
        <aside
          aria-label="Item details"
          className="sticky top-0 h-dvh w-88 shrink-0 overflow-y-auto border-l border-hairline bg-canvas xl:w-96"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-canvas/90 px-4 py-2 backdrop-blur-xl">
            <span className="text-headline font-semibold">Item details</span>
            <button type="button" onClick={close} aria-label="Close item details" className={button({ variant: "gray", size: "icon" })}>
              <X aria-hidden className="size-4" />
            </button>
          </div>
          <ItemDetail id={id} />
        </aside>
      )}
      <Sheet
        open={!!id && !desktop}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title="Item details"
        initialExpanded
      >
        {id && <ItemDetail id={id} />}
      </Sheet>
      <Sheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filter items"
        initialExpanded
        toolbar={
          <button type="button" className={button({ variant: "plain", size: "sm" })} onClick={clearFilters}>
            Reset
          </button>
        }
      >
        <div className="flex flex-col gap-6 p-4">
          <Group title="Category" footer="Matches any of the selected categories.">
            <div className="flex flex-wrap gap-2 p-3">
              {Object.values(ItemCategory).map((category) => (
                <Chip
                  key={category}
                  pressed={categories.includes(category)}
                  onClick={() =>
                    setCategories(
                      categories.includes(category) ? categories.filter((entry) => entry !== category) : [...categories, category],
                    )
                  }
                >
                  {formatEnumName(category)}
                </Chip>
              ))}
            </div>
          </Group>
          <button type="button" className={button({ variant: "filled" })} onClick={() => setFiltersOpen(false)}>
            Show {list?.length ?? 0} items
          </button>
        </div>
      </Sheet>
    </div>
  );
};
