import { useMediaQuery } from "@uidotdev/usehooks";
import * as React from "react";
import { CgPokemon } from "react-icons/cg";
import { Link, useParams } from "react-router-dom";
import { usePokemonControllerFindAllMinimal } from "@/api/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PokemonProvider } from "@/components/pokemon-sheet/context";
import { PokemonSheet } from "@/components/pokemon-sheet/PokemonSheet";
import { PokemonTemplateCard } from "@/components/PokemonTemplateCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
const PokemonList = ({
  className,
  onClick,
}: {
  className?: string;
  onClick?: (id: string) => void;
}) => {
  const { data: pokemon, isFetching } = usePokemonControllerFindAllMinimal({});
  const isLoading = isFetching && pokemon == null;
  const [search, setSearch] = React.useState("");
  // Sorts the cached query data in place, as the original did.
  const filteredPokemon = React.useMemo(
    () =>
      pokemon
        ?.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
        .filter((p) => (p.name ?? "").toLowerCase().includes(search.toLowerCase())),
    [pokemon, search],
  );
  const cards = React.useMemo(
    () =>
      filteredPokemon?.map((p) => (
        <Link key={p.id} to={`/myPokemon/${p.id}`} className="flex flex-col">
          <PokemonTemplateCard
            name={p.name ?? ""}
            image={p.image ?? ""}
            number={p.number ?? 0}
            types={p.types ?? ["TYPELESS"]}
            onClick={() => onClick?.(p.id)}
            className="flex-grow"
          />
        </Link>
      )),
    [filteredPokemon],
  );
  return (
    <div
      className={`flex flex-col space-y-2 h-full overflow-hidden ${className}`}
      id="my-pokemon-list"
    >
      <div className="flex flex-row space-x-2 shrink-0">
        <Input
          className="rounded-3xl"
          placeholder="Search..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <Button className="rounded-3xl">Search</Button>
      </div>
      <ScrollArea className="md:rounded-t-3xl max-md:rounded-3xl flex-1">
        <div className="grid 2xs:grid-cols-2 md:grid-cols-1 2xl:grid-cols-2 grid-cols-1 gap-2">
          {isLoading && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center h-full w-full">
              <LoadingSpinner />
            </div>
          )}
          {cards}
        </div>
      </ScrollArea>
    </div>
  );
};
export const MyPokemonPage = () => {
  const { id } = useParams();
  const [selectedId, setSelectedId] = React.useState(id);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  React.useEffect(() => {
    if (id === "" || id === undefined) setSelectedId(id);
  }, [id]);
  const SheetContainer = isDesktop ? ScrollArea : "div";
  return (
    <div className="sheet-layout grid grid-cols-4 gap-4 pl-2 pt-2 pr-2 md:h-[calc(100vh-1rem)] md:grid-rows-1">
      <PokemonList
        className="md:col-span-1 md:h-full overflow-hidden col-span-full max-md:min-h-[20vh] max-md:max-h-[40vh]"
        onClick={(pokemonId) => {
          setSelectedId(pokemonId);
        }}
      />
      <SheetContainer className="md:col-span-3 col-span-full h-full">
        {selectedId === undefined ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="md:h-[80%] max-md:w-1/2">
              <CgPokemon size="100%" color="#5f5c54" />
            </div>
          </div>
        ) : (
          <PokemonProvider id={selectedId} editingMode="view">
            <PokemonSheet />
          </PokemonProvider>
        )}
      </SheetContainer>
    </div>
  );
};
