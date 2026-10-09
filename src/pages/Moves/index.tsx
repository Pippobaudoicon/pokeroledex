// @ts-nocheck
import { useDebounce } from "@uidotdev/usehooks";
import * as React from "react";
import { useAuth } from "@/api/client";
import { useMovesControllerFindByCampaigns } from "@/api/components";
import { MoveCategory, PokemonType } from "@/api/schemas";
import { FilterSection } from "@/components/FilterSection";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MoveCard } from "@/components/MoveCard";
import { MultiSelect } from "@/components/MultiSelect";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
const useCategoryFilter = () => {
  const [e, t] = React.useState([]);
  return {
    filter: (r) => (e.length === 0 ? true : e.some((o) => r.category === o)),
    selectedCategories: e,
    setSelectedCategories: t,
  };
};
const CategoryFilter = ({ filters: e, setFilters: t }) => {
  const {
    filter: n,
    selectedCategories: r,
    setSelectedCategories: o,
  } = useCategoryFilter();
  return (
    React.useEffect(() => {
      const s = e.filter((i) => i.id !== "category");
      s.push({
        filter: n,
        id: "category",
      }),
        t(s);
    }, [n]),
    (
      <div className="flex flex-row gap-2 items-center">
        <Text size="text-xl">Category:</Text>
        <MultiSelect
          options={Object.values(MoveCategory).map((s) => ({
            label: s,
            value: s,
          }))}
          selected={r}
          onChange={(s) => {
            o(s.map((i) => i));
          }}
          className="text-xl"
          placeholder="Select categories..."
        />
      </div>
    )
  );
};
const useTypeFilter = () => {
  const [e, t] = React.useState([]);
  return {
    filter: (r) => (e.length === 0 ? true : e.some((o) => r.type === o)),
    selectedTypes: e,
    setSelectedTypes: t,
  };
};
const TypeFilter = ({ filters: e, setFilters: t }) => {
  const { filter: n, selectedTypes: r, setSelectedTypes: o } = useTypeFilter();
  return (
    React.useEffect(() => {
      const s = e.filter((i) => i.id !== "type");
      s.push({
        filter: n,
        id: "type",
      }),
        t(s);
    }, [n]),
    (
      <div className="flex flex-row gap-2 items-center">
        <Text size="text-xl">Type:</Text>
        <MultiSelect
          options={Object.values(PokemonType).map((s) => ({
            label: s,
            value: s,
          }))}
          selected={r}
          onChange={(s) => {
            o(s.map((i) => i));
          }}
          className="text-xl"
          placeholder="Select types..."
        />
      </div>
    )
  );
};
const MoveFilters = ({ filters: e, setFilters: t, className: n }) => (
  <div className={n}>
    <TypeFilter setFilters={t} filters={e} />
    <CategoryFilter setFilters={t} filters={e} />
  </div>
);
const MoveList = ({ className: e }) => {
  const { state: t } = useCampaignFilter(),
    { isAuthenticated: n } = useAuth(),
    [r, o] = React.useState(undefined),
    [s, i] = React.useState(false),
    { mutate: l } = useMovesControllerFindByCampaigns({
      onSuccess: (j) => {
        o(j), i(false);
      },
      onError: () => i(false),
    }),
    c = s && !r,
    [u, f] = React.useState(""),
    [p, h] = React.useState([]),
    m = useDebounce(u, 200),
    v = React.useMemo(
      () =>
        r == null
          ? undefined
          : r
              .filter((j) =>
                (j.name ?? "").toLowerCase().includes(m.toLowerCase()),
              )
              .filter((j) => p.every((w) => w.filter(j)))
              .sort((j, w) => {
                const N = (j.type ?? "").localeCompare(w.type ?? "");
                return N !== 0 ? N : (j.name ?? "").localeCompare(w.name ?? "");
              }),
      [r, m, p],
    );
  React.useEffect(() => {
    i(true);
    const j = n
      ? {
          campaignIds: t.campaignIds,
          includeCore: t.includeCore,
        }
      : {
          campaignIds: [],
          includeCore: true,
        };
    l({
      body: j,
    });
  }, [t.campaignIds, t.includeCore, n, l]);
  const g = 30,
    [b, x] = React.useState(g),
    y = React.useRef(null),
    S = React.useRef(null);
  React.useEffect(() => {
    x(g);
  }, [m, p, r]),
    React.useEffect(() => {
      var T;
      const j =
        (T = y.current) == null
          ? undefined
          : T.querySelector('[data-slot="scroll-area-viewport"]');
      if (j === null || S.current === null) return;
      const w = new IntersectionObserver(
        (O) => {
          for (const A of O)
            A.isIntersecting &&
              x(($) =>
                Math.min((v == null ? undefined : v.length) ?? 0, $ + g),
              );
        },
        {
          root: j,
          rootMargin: "200px",
        },
      );
      w.observe(S.current);
      const k = setTimeout(() => {
        const O = j;
        if (O === null) return;
        let A = 0;
        for (
          ;
          O.scrollHeight <= O.clientHeight &&
          ((v == null ? undefined : v.length) ?? 0) > b &&
          A < 20;

        )
          x(($) => Math.min((v == null ? undefined : v.length) ?? 0, $ + g)),
            A++;
      }, 50);
      return () => {
        w.disconnect(), clearTimeout(k);
      };
    }, [v]);
  const E = React.useMemo(() => {
    const j = v == null ? undefined : v.slice(0, b);
    return j == null
      ? undefined
      : j.map((w) => <MoveCard key={w.id} move={w} />);
  }, [v, b]);
  return (
    <div className={`flex flex-col h-full ${e} gap-2`}>
      <div className="flex flex-row space-x-2">
        <Input
          id="moves-search-input"
          className="rounded-3xl"
          placeholder="Search..."
          value={u}
          onChange={(j) => {
            f(j.target.value);
          }}
        />
        <Button id="moves-search-button" className="rounded-3xl">
          Search
        </Button>
      </div>
      <FilterSection label="Filters">
        <MoveFilters
          filters={p}
          setFilters={h}
          className="flex md:flex-row flex-col gap-2 mt-2"
        />
      </FilterSection>
      <ScrollArea ref={y} className="rounded-t-3xl flex-1">
        <div className="grid md:grid-cols-2 grid-cols-1 gap-2">
          {!!c && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center h-full w-full">
              <LoadingSpinner />
            </div>
          )}
          {E}
          <div ref={S} className="h-1 w-full col-span-full" />
        </div>
      </ScrollArea>
    </div>
  );
};
export const MovesPage = () => (
  <div className="moves-layout p-2 pb-0 md:h-[calc(100vh-1rem)] max-md:pb-2">
    <MoveList className="overflow-hidden" />
  </div>
);
