import { Plus, Search } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { useMovesControllerFindAll } from "@/api/components";
import { Rank } from "@/api/schemas";
import { Switch } from "@/components/kit/Controls";
import { MoveRow } from "@/components/kit/MoveRow";
import { Sheet } from "@/components/kit/Sheet";
import { usePokemon } from "@/components/pokemon-sheet/context";
import { fold } from "@/hooks/use-dex";
import { getTotalStat } from "@/lib/stats";

const ranks = Object.keys(Rank);
const LIMIT = 100;

/** All moves in the database; mounted only when edit mode allows moves outside the learnset. */
const AllMoves = ({ children }: { children: (moves: T.PossibleMove[] | undefined) => React.ReactNode }) => {
  const { data } = useMovesControllerFindAll({});
  const moves = React.useMemo(() => data?.map((move): T.PossibleMove => ({ id: move.id, move, rank: Rank.STARTER })), [data]);
  return <>{children(moves)}</>;
};

const MoveList = ({
  moves,
  query,
  showRank,
  onPick,
}: {
  moves: T.PossibleMove[] | undefined;
  query: string;
  showRank: boolean;
  onPick: (move: T.Move) => void;
}) => {
  const { updatedPokemon } = usePokemon();
  const matches = React.useMemo(() => {
    const needle = fold(query.trim());
    return (moves ?? [])
      .filter(
        (possible) =>
          !updatedPokemon?.moves.some((move) => move.id === possible.move.id) && (!needle || fold(possible.move.name).includes(needle)),
      )
      .sort((first, second) => first.move.name.localeCompare(second.move.name));
  }, [moves, query, updatedPokemon?.moves]);
  if (!moves)
    return (
      <div className="space-y-1 p-2">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="skeleton h-12 rounded-lg" />
        ))}
      </div>
    );
  if (matches.length === 0)
    return <p className="p-6 text-center text-subhead text-label-2">No moves to add{query ? ` named “${query}”` : ""}.</p>;
  return (
    <ul>
      {matches.slice(0, LIMIT).map((possible) => (
        <MoveRow
          key={possible.move.id}
          move={possible.move}
          pokemon={updatedPokemon}
          rank={showRank ? possible.rank : undefined}
          action={
            <button
              type="button"
              aria-label={`Add ${possible.move.name}`}
              onClick={() => onPick(possible.move)}
              className="grid size-11 place-items-center rounded-full text-tint hover:bg-tint/10 lg:size-8"
            >
              <Plus aria-hidden className="size-5" />
            </button>
          }
        />
      ))}
      {matches.length > LIMIT && (
        <li className="p-3 text-center text-footnote text-label-2">Keep typing to see the other {matches.length - LIMIT}.</li>
      )}
    </ul>
  );
};

/** Adds a move with one tap. Rank-up mode only offers the learnset up to the new rank. */
export const AddMoveSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { updatedPokemon, updatePokemon, editingMode } = usePokemon();
  const [learnableOnly, setLearnableOnly] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const restricted = editingMode === "rankUp" || learnableOnly;
  // The species' learnset up to the edited rank, each move once at its lowest rank.
  const learnable = React.useMemo(() => {
    if (!updatedPokemon) return undefined;
    const byMove = new Map<string, T.PossibleMove>();
    for (const possible of updatedPokemon.pokemonTemplate.possibleMoves) {
      const rank = ranks.indexOf(possible.rank);
      const known = byMove.get(possible.move.id);
      const moveRank = updatedPokemon.rank === "UNRANKED" ? "STARTER" : updatedPokemon.rank;
      if (rank >= 0 && rank <= ranks.indexOf(moveRank) && (known === undefined || rank < ranks.indexOf(known.rank)))
        byMove.set(possible.move.id, possible);
    }
    return [...byMove.values()];
  }, [updatedPokemon?.pokemonTemplate, updatedPokemon?.rank]);
  if (!updatedPokemon) return null;
  const pick = (move: T.Move) => {
    updatePokemon({ moves: [...updatedPokemon.moves, move] });
    onOpenChange(false);
    setQuery("");
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Add a move" initialExpanded>
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-canvas/90 p-4 pb-3 backdrop-blur-xl">
        <label className="relative flex items-center">
          <span className="sr-only">Search moves</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 size-4 text-label-2" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search moves"
            className="h-11 w-full rounded-xl bg-fill pr-3 pl-9 text-body outline-none placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-focus lg:h-9 lg:rounded-lg"
          />
        </label>
        {editingMode === "edit" && (
          <label htmlFor="learnable-only" className="flex items-center justify-between gap-3 text-subhead">
            Only moves it can learn by its rank
            <Switch id="learnable-only" checked={learnableOnly} onChange={setLearnableOnly} />
          </label>
        )}
      </div>
      <div className="mx-4 overflow-hidden rounded-xl bg-surface shadow-card">
        {restricted ? (
          <MoveList moves={learnable} query={query} showRank onPick={pick} />
        ) : (
          <AllMoves>{(moves) => <MoveList moves={moves} query={query} showRank={false} onPick={pick} />}</AllMoves>
        )}
      </div>
    </Sheet>
  );
};

/** Whether the Add move row shows: only while editing, and outside edit mode only with free slots and moves left to learn. */
export const useCanAddMove = () => {
  const { updatedPokemon, editingMode } = usePokemon();
  if (!updatedPokemon || editingMode === "view") return false;
  if (editingMode === "edit") return true;
  const slotsFull = updatedPokemon.moves.length >= getTotalStat(updatedPokemon, "insight") + 3;
  const leftToLearn = updatedPokemon.pokemonTemplate.possibleMoves.some(
    (possible) =>
      !updatedPokemon.moves.some((move) => move.id === possible.move.id) &&
      ranks.indexOf(possible.rank) <= ranks.indexOf(updatedPokemon.rank),
  );
  return !slotsFull && leftToLearn;
};
