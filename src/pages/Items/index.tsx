// @ts-nocheck
import { useDebounce, useMediaQuery } from "@uidotdev/usehooks";
import * as React from "react";
import { CgPokemon } from "react-icons/cg";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/api/client";
import {
  useItemsControllerFindByCampaigns,
  useItemsControllerFindOne,
} from "@/api/components";
import { ItemCategory, ItemPocket } from "@/api/schemas";
import { Box } from "@/components/Box";
import { FilterSection } from "@/components/FilterSection";
import { ItemCard, getItemColor } from "@/components/ItemCard";
import { ItemImage } from "@/components/ItemImage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MultiSelect } from "@/components/MultiSelect";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { formatEnumName } from "@/lib/utils";
const ItemListCard = ({
  name: e,
  source: t,
  pocket: n,
  category: r,
  image: o,
  className: s,
  onClick: i,
}) => (
  <Box
    color={`bg-${getItemColor(n, r)}`}
    className={`${s} flex flex-col space-y-2 p-3 bg-gradient-to-br from-${getItemColor(n, r)}-light justify-between ${i != null ? `hover:bg-${getItemColor(n, r)}/80` : ""}`}
    onClick={i}
  >
    <div className="flex flex-row justify-between">
      <Text size="text-xl" color="text-white">
        {e}
      </Text>
      <Text
        size="text-xl"
        color="text-white"
        className="opacity-50"
      >{`${t}`}</Text>
    </div>
    <div className="flex flex-row space-x-2 justify-between">
      <div className="flex flex-col items-center justify-end space-y-1">
        <Text size="text-xl" color="text-white">
          {"Pocket: "}
          {formatEnumName(n ?? "-")}
        </Text>
      </div>
      <ItemImage imageFileName={o} className="w-20 h-20" />
    </div>
  </Box>
);
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
          options={Object.values(ItemCategory).map((s) => ({
            label: s.replace(/(_)/g, " "),
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
const usePocketFilter = () => {
  const [e, t] = React.useState([]);
  return {
    filter: (r) => (e.length === 0 ? true : e.some((o) => r.pocket === o)),
    selectedPockets: e,
    setSelectedPockets: t,
  };
};
const PocketFilter = ({ filters: e, setFilters: t }) => {
  const {
    filter: n,
    selectedPockets: r,
    setSelectedPockets: o,
  } = usePocketFilter();
  return (
    React.useEffect(() => {
      const s = e.filter((i) => i.id !== "pocket");
      s.push({
        filter: n,
        id: "pocket",
      }),
        t(s);
    }, [n]),
    (
      <div className="flex flex-row gap-2 items-center">
        <Text size="text-xl">Pocket:</Text>
        <MultiSelect
          options={Object.values(ItemPocket).map((s) => ({
            label: s.replace(/(_)/g, " "),
            value: s,
          }))}
          selected={r}
          onChange={(s) => {
            o(s.map((i) => i));
          }}
          className="text-xl"
          placeholder="Select pockets..."
        />
      </div>
    )
  );
};
const ItemFilters = ({ filters: e, setFilters: t, className: n }) => (
  <div className={n}>
    <CategoryFilter setFilters={t} filters={e} />
    <PocketFilter setFilters={t} filters={e} />
  </div>
);
const ItemList = ({ onClick: e, className: t }) => {
  const { isAuthenticated: r } = useAuth(),
    [o] = React.useState({
      headers: {},
    }),
    { state: i } = useCampaignFilter(),
    [l, c] = React.useState(undefined),
    [u, f] = React.useState(false),
    { mutate: p } = useItemsControllerFindByCampaigns({
      onSuccess: (T) => {
        c(T), f(false);
      },
      onError: () => f(false),
    }),
    h = u && !l,
    [m, v] = React.useState(""),
    [g, b] = React.useState([]),
    x = useDebounce(m, 200);
  React.useEffect(() => {
    if ((f(true), r)) {
      const T = o.headers;
      if (!T) {
        f(false);
        return;
      }
      p({
        body: {
          campaignIds: i.campaignIds,
          includeCore: i.includeCore,
        },
        headers: T,
      });
      return;
    }
    p({
      body: {
        campaignIds: [],
        includeCore: true,
      },
    });
  }, [o, i.campaignIds, i.includeCore, r, p]);
  const y = React.useMemo(
      () =>
        l == null
          ? undefined
          : l
              .filter((T) =>
                (T.name ?? "").toLowerCase().includes(x.toLowerCase()),
              )
              .filter((T) => g.every((O) => O.filter(T)))
              .sort((T, O) => {
                if (T.pocket == null) return 1;
                if (O.pocket == null) return -1;
                const A = T.pocket.localeCompare(O.pocket);
                if (A !== 0) return A;
                if (T.category == null) return 1;
                if (O.category == null) return -1;
                const $ = T.category.localeCompare(O.category);
                return $ !== 0 ? $ : (T.name ?? "").localeCompare(O.name ?? "");
              }),
      [l, x, g],
    ),
    S = 30,
    [E, j] = React.useState(S),
    w = React.useRef(null),
    N = React.useRef(null);
  React.useEffect(() => {
    j(S);
  }, [x, g, l]),
    React.useEffect(() => {
      var Y;
      const T =
        (Y = w.current) == null
          ? undefined
          : Y.querySelector('[data-slot="scroll-area-viewport"]');
      if (T === null || N.current === null) return;
      const O = new IntersectionObserver(
        (F) => {
          for (const ne of F)
            ne.isIntersecting &&
              j((se) =>
                Math.min((y == null ? undefined : y.length) ?? 0, se + S),
              );
        },
        {
          root: T,
          rootMargin: "200px",
        },
      );
      O.observe(N.current);
      const $ = setTimeout(() => {
        const F = T;
        if (F === null) return;
        let ne = 0;
        for (
          ;
          F.scrollHeight <= F.clientHeight &&
          ((y == null ? undefined : y.length) ?? 0) > E &&
          ne < 20;

        )
          j((se) => Math.min((y == null ? undefined : y.length) ?? 0, se + S)),
            ne++;
      }, 50);
      return () => {
        O.disconnect(), clearTimeout($);
      };
    }, [y]);
  const k = React.useMemo(() => {
    const T = y == null ? undefined : y.slice(0, E);
    return T == null
      ? undefined
      : T.map((O) => (
          <Link key={O.id} to={`/items/${O.id}`} className="flex flex-col">
            <ItemListCard
              name={O.name}
              source={O.source}
              pocket={O.pocket}
              category={O.category}
              image={O.image}
              onClick={() => (e == null ? undefined : e(O.id))}
              className="flex-grow"
            />
          </Link>
        ));
  }, [y, E]);
  return (
    <div className={`flex flex-col gap-2 h-full ${t}`}>
      <div className="flex flex-row space-x-2">
        <Input
          id="items-search-input"
          className="rounded-3xl"
          placeholder="Search..."
          value={m}
          onChange={(T) => {
            v(T.target.value);
          }}
        />
        <Button id="items-search-button" className="rounded-3xl">
          Search
        </Button>
      </div>
      <FilterSection label="Filters">
        <ItemFilters
          filters={g}
          setFilters={b}
          className="flex md:flex-row flex-col gap-2 mt-2"
        />
      </FilterSection>
      <ScrollArea ref={w} className="md:rounded-t-3xl rounded-3xl flex-1">
        <div className="grid xs:grid-cols-2 2xl:grid-cols-3 md:grid-cols-1 lg:grid-cols-2 grid-cols-1 gap-2">
          {!!h && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center h-full w-full">
              <LoadingSpinner />
            </div>
          )}
          {k}
          <div ref={N} className="h-1 w-full col-span-full" />
        </div>
      </ScrollArea>
    </div>
  );
};
const ItemDetail = ({ itemId: e }) => {
  const {
    data: t,
    isLoading: n,
    isError: r,
  } = useItemsControllerFindOne(
    {
      pathParams: {
        id: e ?? "",
      },
    },
    {
      enabled: e !== undefined,
    },
  );
  return e === undefined ? (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="md:h-[80%] max-md:w-1/2">
        <CgPokemon size="100%" color="#5f5c54" />
      </div>
    </div>
  ) : n ? (
    <div className="flex flex-row flex-grow justify-center items-center h-full">
      <LoadingSpinner />
    </div>
  ) : t === undefined || r ? (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="md:h-[80%] max-md:w-1/2">
        <CgPokemon size="100%" color="#5f5c54" />
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full">
      <ItemCard item={t} />
    </div>
  );
};
export const ItemsPage = () => {
  const { id: e } = useParams(),
    [t, n] = React.useState(e),
    r = useMediaQuery("(min-width: 768px)");
  React.useEffect(() => {
    n(e);
  }, [e]);
  const OComponent = r ? ScrollArea : "div";
  return (
    <div className="catalog-layout p-2 pb-0 grid md:h-[calc(100vh-1rem)] md:grid-rows-1 grid-cols-5 box-border gap-3">
      <ItemList
        className="md:col-span-2 col-span-full max-md:min-h-[30vh] max-md:max-h-[50vh] overflow-hidden"
        onClick={n}
      />
      <OComponent className="md:col-span-3 col-span-full max-md:pb-2 h-full">
        <ItemDetail itemId={t} />
      </OComponent>
    </div>
  );
};
