// @ts-nocheck
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
const PokemonList = ({ className: e, onClick: t }) => {
  const { data: n, isFetching: r } = usePokemonControllerFindAllMinimal({}),
    o = r && n == null,
    [s, i] = React.useState(""),
    l = React.useMemo(
      () =>
        n == null
          ? undefined
          : n
              .sort((u, f) => (u.name ?? "").localeCompare(f.name ?? ""))
              .filter((u) =>
                (u.name ?? "").toLowerCase().includes(s.toLowerCase()),
              ),
      [n, s],
    ),
    c = React.useMemo(
      () =>
        l == null
          ? undefined
          : l.map((u) => {
              const f = u.types ?? ["TYPELESS"],
                p = u.number ?? 0;
              return (
                <Link
                  key={u.id}
                  to={`/myPokemon/${u.id}`}
                  className="flex flex-col"
                >
                  <PokemonTemplateCard
                    name={u.name ?? ""}
                    image={u.image ?? ""}
                    number={p}
                    types={f}
                    onClick={() => (t == null ? undefined : t(u.id))}
                    className="flex-grow"
                  />
                </Link>
              );
            }),
      [l],
    );
  return (
    <div
      className={`flex flex-col space-y-2 h-full overflow-hidden ${e}`}
      id="my-pokemon-list"
    >
      <div className="flex flex-row space-x-2 shrink-0">
        <Input
          className="rounded-3xl"
          placeholder="Search..."
          value={s}
          onChange={(u) => {
            i(u.target.value);
          }}
        />
        <Button className="rounded-3xl">Search</Button>
      </div>
      <ScrollArea className="md:rounded-t-3xl max-md:rounded-3xl flex-1">
        <div className="grid 2xs:grid-cols-2 md:grid-cols-1 2xl:grid-cols-2 grid-cols-1 gap-2">
          {!!o && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center h-full w-full">
              <LoadingSpinner />
            </div>
          )}
          {c}
        </div>
      </ScrollArea>
    </div>
  );
};
export const MyPokemonPage = () => {
  const { id: e } = useParams(),
    [t, n] = React.useState(e),
    r = useMediaQuery("(min-width: 768px)");
  React.useEffect(() => {
    (e !== "" && e !== undefined) || n(e);
  }, [e]);
  const OComponent = r ? ScrollArea : "div";
  return (
    <div className="sheet-layout grid grid-cols-4 gap-4 pl-2 pt-2 pr-2 md:h-[calc(100vh-1rem)] md:grid-rows-1">
      <PokemonList
        className="md:col-span-1 md:h-full overflow-hidden col-span-full max-md:min-h-[20vh] max-md:max-h-[40vh]"
        onClick={(s) => {
          n(s);
        }}
      />
      <OComponent className="md:col-span-3 col-span-full h-full">
        {t === undefined ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="md:h-[80%] max-md:w-1/2">
              <CgPokemon size="100%" color="#5f5c54" />
            </div>
          </div>
        ) : (
          <PokemonProvider id={t} editingMode="view">
            <PokemonSheet />
          </PokemonProvider>
        )}
      </OComponent>
    </div>
  );
};
