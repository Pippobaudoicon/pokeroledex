import { useDebounce } from "@uidotdev/usehooks";
import * as React from "react";
import type * as T from "../../../shared/types";
import { useMovesControllerFindAll } from "@/api/components";
import { Rank } from "@/api/schemas";
import { AddNewBox } from "@/components/AddNewBox";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MoveCard } from "@/components/MoveCard";
import { usePokemon } from "@/components/pokemon-sheet/context";
import { RankIcon } from "@/components/RankIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getTotalStat } from "@/lib/stats";
const MoveListItem = React.memo(
  ({
    move,
    isSelected,
    onClick,
  }: {
    move: T.PossibleMove;
    isSelected: boolean;
    onClick: (move: T.Move) => void;
  }) => (
    <div
      className="col-span-full flex flex-row items-stretch space-x-1 rounded-3xl"
      onClick={() => {
        onClick(move.move);
      }}
    >
      <div className="flex flex-row items-center space-x-2">
        <RankIcon rank={move.rank} size="md" />
      </div>
      <MoveCard
        move={move.move}
        className={isSelected ? "border-4 border-pokerole-black" : ""}
      />
    </div>
  ),
);
MoveListItem.displayName = "MoveItem";
const AddMoveSheet = ({ trigger, className }: { trigger: React.ReactNode; className?: string }) => {
  const { updatedPokemon, updatePokemon, editingMode } = usePokemon();
  const [selectedMove, setSelectedMove] = React.useState<T.Move | null>(null);
  const { data: moves, isLoading } = useMovesControllerFindAll({});
  const allMoves = React.useMemo(
    () =>
      moves
        ?.map((move): T.PossibleMove => ({
          id: move.id,
          move,
          rank: Rank.STARTER,
        }))
        .sort((a, b) => {
          const byType = a.move.type.localeCompare(b.move.type);
          return byType !== 0 ? byType : a.move.name.localeCompare(b.move.name);
        }),
    [moves],
  );
  /** Rank-up mode only offers the species' learnable moves. */
  const candidateMoves = React.useMemo(
    () =>
      editingMode === "rankUp"
        ? updatedPokemon?.pokemonTemplate.possibleMoves != null
          ? updatedPokemon.pokemonTemplate.possibleMoves.slice().sort((a, b) => {
              const byType = a.move.type.localeCompare(b.move.type);
              return byType !== 0 ? byType : a.move.name.localeCompare(b.move.name);
            })
          : undefined
        : allMoves,
    [editingMode, updatedPokemon, allMoves],
  );
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 200);
  const availableMoves = candidateMoves?.filter(
    (possibleMove) =>
      updatedPokemon !== undefined &&
      !updatedPokemon.moves.some((move) => move.id === possibleMove.move.id) &&
      Object.keys(Rank).indexOf(possibleMove.rank) <= Object.keys(Rank).indexOf(updatedPokemon.rank),
  );
  const filteredMoves = React.useMemo(
    () =>
      debouncedSearch === ""
        ? availableMoves
        : availableMoves?.filter((possibleMove) =>
            possibleMove.move.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
          ),
    [availableMoves, debouncedSearch],
  );
  React.useEffect(() => {
    if (
      selectedMove != null &&
      (filteredMoves == null || !filteredMoves.some((possibleMove) => possibleMove.move.id === selectedMove.id))
    )
      setSelectedMove(null);
  }, [filteredMoves, selectedMove]);
  const batchSize = 30;
  const [visibleCount, setVisibleCount] = React.useState(batchSize);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  React.useEffect(() => {
    setVisibleCount(batchSize);
  }, [debouncedSearch, filteredMoves?.length]);
  // Infinite scroll: show another batch whenever the sentinel below the list scrolls into view.
  React.useEffect(() => {
    // The sentinel lives inside the scroll area, so the scroll area is mounted whenever the sentinel is.
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    ) as Element | null;
    if (viewport === null || sentinelRef.current === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setVisibleCount((count) => Math.min(filteredMoves?.length ?? 0, count + batchSize));
      },
      {
        root: viewport,
        rootMargin: "200px",
      },
    );
    observer.observe(sentinelRef.current);
    // Keep adding batches while the list is too short to scroll (the observer would never fire).
    const timeout = setTimeout(() => {
      if (viewport === null) return;
      let attempts = 0;
      while (
        viewport.scrollHeight <= viewport.clientHeight &&
        (filteredMoves?.length ?? 0) > visibleCount &&
        attempts < 20
      ) {
        setVisibleCount((count) => Math.min(filteredMoves?.length ?? 0, count + batchSize));
        attempts++;
      }
    }, 50);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [filteredMoves, visibleCount, sheetOpen]);
  const toggleSelected = React.useCallback((move: T.Move) => {
    setSelectedMove((selected) => (selected?.id === move.id ? null : move));
  }, []);
  const moveListItems = React.useMemo(
    () =>
      filteredMoves
        ?.slice(0, visibleCount)
        .map((possibleMove) => (
          <MoveListItem
            key={possibleMove.move.id}
            move={possibleMove}
            isSelected={selectedMove?.id === possibleMove.move.id}
            onClick={toggleSelected}
          />
        )),
    [filteredMoves, visibleCount, selectedMove?.id, toggleSelected],
  );
  const addMove = () => {
    if (updatedPokemon !== undefined && selectedMove != null) {
      updatePokemon({
        moves: [...updatedPokemon.moves, selectedMove],
      });
      setSelectedMove(null);
    }
  };
  return (
    <Sheet onOpenChange={setSheetOpen}>
      <SheetTrigger asChild={true}>{trigger}</SheetTrigger>
      <SheetContent className="w-full md:w-[600px]">
        <SheetHeader>
          <SheetTitle>Add move</SheetTitle>
          <SheetDescription>
            Add a move to your Pokémon's move list.
          </SheetDescription>
        </SheetHeader>
        <div className={`grid grid-cols-1 gap-2 ${className} rounded-3xl`}>
          <div className="col-span-full flex flex-row space-x-2 items-center">
            <Input
              placeholder="Search moves..."
              aria-label="Search moves"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              className="rounded-3xl"
            />
          </div>
          <ScrollArea ref={scrollAreaRef} className="md:h-[80vh] h-[60vh] rounded-3xl">
            <div className="grid grid-cols-1 gap-2">
              {isLoading && (
                <LoadingSpinner className="col-span-full items-center justify-center w-full" />
              )}
              {!isLoading && filteredMoves?.length === 0 && (
                <div className="col-span-full text-muted-foreground text-center py-4">
                  No moves found.
                </div>
              )}
              {!isLoading && moveListItems}
              <div ref={sentinelRef} className="h-1 w-full col-span-full" />
            </div>
          </ScrollArea>
        </div>
        <SheetFooter>
          <SheetClose>
            <Button
              variant="green"
              onClick={addMove}
              type="submit"
              className="w-full mt-2"
            >
              {"Add "}
              {selectedMove?.name ?? "no move"}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
export const AddMoveButton = () => {
  const { updatedPokemon, editingMode } = usePokemon();
  if (updatedPokemon === undefined) return <></>;
  // Outside edit mode, hide the button once the move slots are full or nothing is left to learn.
  if (updatedPokemon.moves.length >= getTotalStat(updatedPokemon, "insight") + 3 && editingMode !== "edit")
    return <></>;
  if (
    updatedPokemon.pokemonTemplate.possibleMoves.filter(
      (possibleMove) =>
        !updatedPokemon.moves.some((move) => move.id === possibleMove.move.id) &&
        Object.keys(Rank).indexOf(possibleMove.rank) <= Object.keys(Rank).indexOf(updatedPokemon.rank),
    ).length === 0 &&
    editingMode !== "edit"
  )
    return <></>;
  if (editingMode === "view") return <></>;
  return <AddMoveSheet trigger={<AddNewBox className="md:col-span-1 col-span-full flex" />} />;
};
