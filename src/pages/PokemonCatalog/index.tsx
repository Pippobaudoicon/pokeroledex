// @ts-nocheck
import { useDebounce, useMediaQuery } from "@uidotdev/usehooks";
import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/api/client";
import { usePokemonTemplatesControllerFindByCampaignsMinimal } from "@/api/components";
import { Habitat, PokemonType, Rank } from "@/api/schemas";
import { FilterSection } from "@/components/FilterSection";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MultiSelect } from "@/components/MultiSelect";
import { PokemonTemplateCard } from "@/components/PokemonTemplateCard";
import { RankSelect } from "@/components/RankSelect";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { PokemonDetail } from "@/pages/PokemonCatalog/PokemonDetail";
const useHabitatFilter = () => {
  const [e, t] = React.useState([]);
  return {
    filter: (r) =>
      e.length === 0 ? true : e.some((o) => r.habitats.includes(o)),
    selectedHabitats: e,
    setSelectedHabitats: t,
  };
};
const HabitatFilter = ({ filters: e, setFilters: t }) => {
  const {
    filter: n,
    selectedHabitats: r,
    setSelectedHabitats: o,
  } = useHabitatFilter();
  return (
    React.useEffect(() => {
      const s = e.filter((i) => i.id !== "habitat");
      s.push({
        filter: n,
        id: "habitat",
      }),
        t(s);
    }, [n]),
    (
      <div className="flex flex-row gap-2 items-center">
        <Text size="text-xl">Habitat:</Text>
        <MultiSelect
          options={Object.values(Habitat)
            .map((s) => ({
              label: s.replace(/_/g, " "),
              value: s,
            }))
            .sort((s, i) => s.label.localeCompare(i.label))}
          selected={r}
          onChange={(s) => {
            o(s.map((i) => i));
          }}
          className="text-xl"
          placeholder="Select habitats..."
        />
      </div>
    )
  );
};
const useRankFilter = () => {
  const [e, t] = React.useState(undefined),
    [n, r] = React.useState(false);
  return {
    filter: (s) =>
      e == null
        ? true
        : n
          ? Object.values(Rank).indexOf(s.recommendedRank) <=
            Object.values(Rank).indexOf(e)
          : Object.values(Rank).indexOf(s.recommendedRank) ===
            Object.values(Rank).indexOf(e),
    selectedRank: e,
    setSelectedRank: t,
    andLower: n,
    setAndLower: r,
  };
};
const RankFilter = ({ filters: e, setFilters: t }) => {
  const {
    filter: n,
    selectedRank: r,
    setSelectedRank: o,
    andLower: s,
    setAndLower: i,
  } = useRankFilter();
  return (
    React.useEffect(() => {
      const l = e.filter((c) => c.id !== "rank");
      l.push({
        filter: n,
        id: "rank",
      }),
        t(l);
    }, [n]),
    (
      <div className="flex flex-row gap-2 items-center">
        <Text size="text-xl">Rank:</Text>
        <RankSelect
          onSelect={o}
          rank={r}
          placeholder="Select rank..."
          comboBoxClassName="text-xl"
        />
        <Checkbox checked={s} onCheckedChange={i} />
        <Text size="text-md">And lower</Text>
      </div>
    )
  );
};
const useTypeFilter = () => {
  const [e, t] = React.useState([]);
  return {
    filter: (r) => (e.length === 0 ? true : e.some((o) => r.types.includes(o))),
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
          options={Object.values(PokemonType)
            .filter((s) => s !== PokemonType.TYPELESS)
            .map((s) => ({
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
const PokemonFilters = ({ filters: e, setFilters: t, className: n }) => (
  <div className={n}>
    <TypeFilter setFilters={t} filters={e} />
    <RankFilter setFilters={t} filters={e} />
    <HabitatFilter setFilters={t} filters={e} />
  </div>
);
const PokemonTemplateList = ({ onClick: e, className: t }) => {
  const { state: n } = useCampaignFilter(),
    { isAuthenticated: r } = useAuth(),
    [o, s] = React.useState(undefined),
    [i, l] = React.useState(false),
    { mutate: c } = usePokemonTemplatesControllerFindByCampaignsMinimal({
      onSuccess: (w) => {
        s(w), l(false);
      },
      onError: () => {
        l(false);
      },
    }),
    u = i && o == null,
    [f, p] = React.useState(""),
    [h, m] = React.useState([]),
    v = useDebounce(f, 200),
    g = React.useMemo(
      () =>
        o == null
          ? undefined
          : o
              .sort((w, N) => (w.dexID ?? "").localeCompare(N.dexID ?? ""))
              .filter((w) =>
                (w.name ?? "").toLowerCase().includes(v.toLowerCase()),
              )
              .filter((w) => h.every((N) => N.filter(w))),
      [o, v, h],
    );
  React.useEffect(() => {
    l(true);
    const w = r
      ? {
          campaignIds: n.campaignIds,
          includeCore: n.includeCore,
        }
      : {
          campaignIds: [],
          includeCore: true,
        };
    c({
      body: w,
    });
  }, [n.campaignIds, n.includeCore, r, c]);
  const b = 60,
    [x, y] = React.useState(b),
    S = React.useRef(null),
    E = React.useRef(null);
  React.useEffect(() => {
    y(b);
  }, [v, h, o]),
    React.useEffect(() => {
      var O;
      const w =
        (O = S.current) == null
          ? undefined
          : O.querySelector('[data-slot="scroll-area-viewport"]');
      if (w === null || E.current === null) return;
      const N = new IntersectionObserver(
        (A) => {
          for (const $ of A)
            $.isIntersecting &&
              y((Y) =>
                Math.min((g == null ? undefined : g.length) ?? 0, Y + b),
              );
        },
        {
          root: w,
          rootMargin: "200px",
        },
      );
      N.observe(E.current);
      const T = setTimeout(() => {
        const A = w;
        if (A === null) return;
        let $ = 0;
        for (
          ;
          A.scrollHeight <= A.clientHeight &&
          ((g == null ? undefined : g.length) ?? 0) > x &&
          $ < 20;

        )
          y((Y) => Math.min((g == null ? undefined : g.length) ?? 0, Y + b)),
            $++;
      }, 50);
      return () => {
        N.disconnect(), clearTimeout(T);
      };
    }, [g]);
  const j = React.useMemo(() => {
    const w = g == null ? undefined : g.slice(0, x);
    return w == null
      ? undefined
      : w.map((N) => (
          <Link key={N.id} to={`/pokemon/${N.id}`} className="flex flex-col">
            <PokemonTemplateCard
              name={N.name}
              image={N.image}
              number={N.number}
              types={N.types}
              onClick={() => (e == null ? undefined : e(N.id))}
              className="flex-grow"
              numberClassName="md:hidden lg:block max-xs:hidden"
            />
          </Link>
        ));
  }, [g, x]);
  return (
    <div className={`flex flex-col gap-2 h-full overflow-hidden ${t}`}>
      <div className="flex flex-row space-x-2 shrink-0">
        <Input
          id="pokemon-search-input"
          className="rounded-3xl"
          placeholder="Search..."
          value={f}
          onChange={(w) => {
            p(w.target.value);
          }}
        />
        <Button id="pokemon-search-button" className="rounded-3xl">
          Search
        </Button>
      </div>
      <div className="shrink-0">
        <FilterSection label="Filters">
          <PokemonFilters
            filters={h}
            setFilters={m}
            className="flex md:flex-row flex-col gap-2 mt-2 flex-wrap"
          />
        </FilterSection>
      </div>
      <ScrollArea ref={S} className="md:rounded-t-3xl rounded-3xl flex-1">
        <div className="pokemon-card-grid grid gap-2">
          {!!u && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center h-full w-full">
              <LoadingSpinner />
            </div>
          )}
          {j}
          <div ref={E} className="h-1 w-full col-span-full" />
        </div>
      </ScrollArea>
    </div>
  );
};
export const PokemonCatalogPage = () => {
  const { id: e } = useParams(),
    [t, n] = React.useState(e),
    r = useMediaQuery("(min-width: 768px)");
  React.useEffect(() => {
    n(e);
  }, [e]);
  const OComponent = r ? ScrollArea : "div";
  return (
    <div className="catalog-layout p-2 pb-0 grid md:h-[calc(100vh-1rem)] md:grid-rows-1 grid-cols-5 box-border gap-3">
      <PokemonTemplateList
        className="md:col-span-2 col-span-full max-md:min-h-[30vh] max-md:max-h-[50vh]"
        onClick={n}
      />
      <OComponent className="md:col-span-3 col-span-full max-md:pb-2 h-full">
        <PokemonDetail pokemonTemplateId={t} />
      </OComponent>
    </div>
  );
};
