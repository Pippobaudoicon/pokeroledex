import { useDebounce, useMediaQuery } from "@uidotdev/usehooks";
import * as React from "react";
import type * as T from "../../../shared/types";
import { CgPokemon } from "react-icons/cg";
import { Link, useParams } from "react-router-dom";
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
import { useScrollToDetail } from "@/hooks/use-scroll-to-detail";
const ItemListCard = ({
  name,
  source,
  pocket,
  category,
  image,
  className,
  onClick,
}: Pick<T.Item, "name" | "source" | "pocket" | "category" | "image"> & {
  className?: string;
  onClick?: () => void;
}) => (
  <Box
    color={`bg-${getItemColor(pocket, category)}`}
    className={`${className} flex flex-col space-y-2 p-3 bg-linear-to-br/srgb from-${getItemColor(pocket, category)}-light justify-between ${onClick != null ? `hover:bg-${getItemColor(pocket, category)}/80` : ""}`}
    onClick={onClick}
  >
    <div className="flex flex-row justify-between">
      <Text size="text-xl" color="text-white">
        {name}
      </Text>
      <Text
        size="text-xl"
        color="text-white"
        className="opacity-50"
      >{`${source}`}</Text>
    </div>
    <div className="flex flex-row space-x-2 justify-between">
      <div className="flex flex-col items-center justify-end space-y-1">
        <Text size="text-xl" color="text-white">
          {"Pocket: "}
          {formatEnumName(pocket ?? "-")}
        </Text>
      </div>
      <ItemImage imageFileName={image} className="w-20 h-20" />
    </div>
  </Box>
);

interface ItemFilter {
  id: string;
  filter: (item: T.Item) => boolean;
}

interface FilterProps {
  filters: ItemFilter[];
  setFilters: (filters: ItemFilter[]) => void;
  className?: string;
}

const useCategoryFilter = () => {
  const [selectedCategories, setSelectedCategories] = React.useState<
    ItemCategory[]
  >([]);
  return {
    filter: (item: T.Item) =>
      selectedCategories.length === 0 ||
      selectedCategories.some((category) => item.category === category),
    selectedCategories,
    setSelectedCategories,
  };
};
const CategoryFilter = ({ filters, setFilters }: FilterProps) => {
  const { filter, selectedCategories, setSelectedCategories } =
    useCategoryFilter();
  React.useEffect(() => {
    const otherFilters = filters.filter((other) => other.id !== "category");
    otherFilters.push({ filter, id: "category" });
    setFilters(otherFilters);
  }, [filter]);
  return (
    <div className="flex flex-row gap-2 items-center">
      <Text size="text-xl">Category:</Text>
      <MultiSelect
        options={Object.values(ItemCategory).map((category) => ({
          label: category.replace(/(_)/g, " "),
          value: category,
        }))}
        selected={selectedCategories}
        onChange={setSelectedCategories}
        className="text-xl"
        placeholder="Select categories..."
      />
    </div>
  );
};

const usePocketFilter = () => {
  const [selectedPockets, setSelectedPockets] = React.useState<ItemPocket[]>(
    [],
  );
  return {
    filter: (item: T.Item) =>
      selectedPockets.length === 0 ||
      selectedPockets.some((pocket) => item.pocket === pocket),
    selectedPockets,
    setSelectedPockets,
  };
};
const PocketFilter = ({ filters, setFilters }: FilterProps) => {
  const { filter, selectedPockets, setSelectedPockets } = usePocketFilter();
  React.useEffect(() => {
    const otherFilters = filters.filter((other) => other.id !== "pocket");
    otherFilters.push({ filter, id: "pocket" });
    setFilters(otherFilters);
  }, [filter]);
  return (
    <div className="flex flex-row gap-2 items-center">
      <Text size="text-xl">Pocket:</Text>
      <MultiSelect
        options={Object.values(ItemPocket).map((pocket) => ({
          label: pocket.replace(/(_)/g, " "),
          value: pocket,
        }))}
        selected={selectedPockets}
        onChange={setSelectedPockets}
        className="text-xl"
        placeholder="Select pockets..."
      />
    </div>
  );
};

const ItemFilters = ({ filters, setFilters, className }: FilterProps) => (
  <div className={className}>
    <CategoryFilter setFilters={setFilters} filters={filters} />
    <PocketFilter setFilters={setFilters} filters={filters} />
  </div>
);
const ItemList = ({
  onClick,
  className,
}: {
  onClick?: (id: string) => void;
  className?: string;
}) => {
  const { state: campaignFilter } = useCampaignFilter();
  const [items, setItems] = React.useState<T.Item[] | undefined>(undefined);
  const [isFetching, setIsFetching] = React.useState(false);
  const { mutate: fetchItems } = useItemsControllerFindByCampaigns({
    onSuccess: (items) => {
      setItems(items);
      setIsFetching(false);
    },
    onError: () => setIsFetching(false),
  });
  const showSpinner = isFetching && !items;
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<ItemFilter[]>([]);
  const debouncedSearch = useDebounce(search, 200);
  React.useEffect(() => {
    setIsFetching(true);
    fetchItems({
      body: {
        campaignIds: campaignFilter.campaignIds,
        includeCore: campaignFilter.includeCore,
      },
      headers: {},
    });
  }, [campaignFilter.campaignIds, campaignFilter.includeCore, fetchItems]);
  const filteredItems = React.useMemo(
    () =>
      items
        ?.filter((item) =>
          (item.name ?? "")
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()),
        )
        .filter((item) => filters.every((filter) => filter.filter(item)))
        .sort((first, second) => {
          if (first.pocket == null) return 1;
          if (second.pocket == null) return -1;
          const byPocket = first.pocket.localeCompare(second.pocket);
          if (byPocket !== 0) return byPocket;
          if (first.category == null) return 1;
          if (second.category == null) return -1;
          const byCategory = first.category.localeCompare(second.category);
          return byCategory !== 0
            ? byCategory
            : (first.name ?? "").localeCompare(second.name ?? "");
        }),
    [items, debouncedSearch, filters],
  );

  const [visibleCount, setVisibleCount] = React.useState(30);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setVisibleCount(30);
  }, [debouncedSearch, filters, items]);
  React.useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport === null || sentinelRef.current === null) return;
    const showMore = () =>
      setVisibleCount((count) =>
        Math.min(filteredItems?.length ?? 0, count + 30),
      );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) showMore();
      },
      { root: viewport, rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    const timeout = setTimeout(() => {
      if (viewport == null) return;
      for (
        let attempts = 0;
        viewport.scrollHeight <= viewport.clientHeight &&
        (filteredItems?.length ?? 0) > visibleCount &&
        attempts < 20;
        attempts++
      ) {
        showMore();
      }
    }, 50);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [filteredItems]);

  const itemCards = React.useMemo(
    () =>
      filteredItems?.slice(0, visibleCount).map((item) => (
        <Link key={item.id} to={`/items/${item.id}`} className="flex flex-col">
          <ItemListCard
            name={item.name}
            source={item.source}
            pocket={item.pocket}
            category={item.category}
            image={item.image}
            onClick={() => onClick?.(item.id)}
            className="flex-grow"
          />
        </Link>
      )),
    [filteredItems, visibleCount],
  );
  return (
    <div className={`flex flex-col gap-2 h-full ${className}`}>
      <div className="flex flex-row space-x-2">
        <Input
          id="items-search-input"
          className="rounded-3xl"
          placeholder="Search..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <Button id="items-search-button" className="rounded-3xl">
          Search
        </Button>
      </div>
      <FilterSection label="Filters">
        <ItemFilters
          filters={filters}
          setFilters={setFilters}
          className="flex md:flex-row flex-col gap-2 mt-2"
        />
      </FilterSection>
      <ScrollArea
        ref={scrollAreaRef}
        className="md:rounded-t-3xl rounded-3xl flex-1"
      >
        <div className="grid xs:grid-cols-2 2xl:grid-cols-3 md:grid-cols-1 lg:grid-cols-2 grid-cols-1 gap-2">
          {showSpinner && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center h-full w-full">
              <LoadingSpinner />
            </div>
          )}
          {itemCards}
          <div
            ref={sentinelRef}
            className="h-1 w-full col-span-full"
          />
        </div>
      </ScrollArea>
    </div>
  );
};
const ItemDetail = ({ itemId }: { itemId?: string }) => {
  const {
    data: item,
    isLoading,
    isError,
  } = useItemsControllerFindOne(
    {
      pathParams: {
        id: itemId ?? "",
      },
    },
    {
      enabled: itemId !== undefined,
    },
  );
  return itemId === undefined ? (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="md:h-[80%] max-md:w-1/2">
        <CgPokemon size="100%" color="#5f5c54" />
      </div>
    </div>
  ) : isLoading ? (
    <div className="flex flex-row flex-grow justify-center items-center h-full">
      <LoadingSpinner />
    </div>
  ) : item === undefined || isError ? (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="md:h-[80%] max-md:w-1/2">
        <CgPokemon size="100%" color="#5f5c54" />
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full">
      <ItemCard item={item} />
    </div>
  );
};
export const ItemsPage = () => {
  const { id } = useParams();
  const [selectedItemId, setSelectedItemId] = React.useState(id);
  const detailRef = useScrollToDetail(selectedItemId);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  React.useEffect(() => {
    setSelectedItemId(id);
  }, [id]);
  const DetailContainer = isDesktop ? ScrollArea : "div";
  return (
    <div className="catalog-layout p-2 pb-0 grid md:h-[calc(100vh-1rem)] md:grid-rows-1 grid-cols-5 box-border gap-3">
      <ItemList
        className="md:col-span-2 col-span-full max-md:min-h-[30vh] max-md:max-h-[50vh] overflow-hidden"
        onClick={setSelectedItemId}
      />
      <DetailContainer ref={detailRef} className="md:col-span-3 col-span-full max-md:pb-2 h-full">
        <ItemDetail itemId={selectedItemId} />
      </DetailContainer>
    </div>
  );
};
