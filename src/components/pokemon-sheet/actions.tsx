import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpCircle, ClipboardCheck, Dna, Lock, Unlock, MoreHorizontal, Pencil, Plus, Send, Trash2 } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import type * as T from "../../../shared/types";
import { usePokemonControllerCreate, usePokemonControllerRemove, usePokemonControllerSend } from "@/api/components";
import { Rank } from "@/api/schemas";
import { button } from "@/components/kit/button";
import { usePokemon } from "@/components/pokemon-sheet/context";
import { EvolutionSheet } from "@/components/pokemon-sheet/EvolutionDialog";
import { type StatCategory, StatPointsCheckDialog } from "@/components/StatPointsCheck";
import { useToast } from "@/hooks/use-toast";
import { POKEMON_ATTRIBUTES, POKEMON_SKILLS, SOCIALS } from "@/lib/stats";
import { cn } from "@/lib/utils";

const POKEMON_CATEGORIES: StatCategory[] = [
  { title: "Attributes", budget: "attributePoints", stats: POKEMON_ATTRIBUTES },
  { title: "Skills", budget: "skillPoints", stats: POKEMON_SKILLS },
  { title: "Socials", budget: "socialPoints", stats: SOCIALS },
];

const PokemonPointsCheck = ({ pokemon, open, onOpenChange }: { pokemon: T.Pokemon; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const template = pokemon.pokemonTemplate;
  const extraIssues = POKEMON_ATTRIBUTES.filter((stat) => template.baseStats[stat] + pokemon.stats[stat] > template.maxStats[stat]).map((stat) => ({
    stat,
    value: template.baseStats[stat] + pokemon.stats[stat],
    limit: template.maxStats[stat],
    reason: `above ${template.name}’s maximum`,
  }));
  return (
    <StatPointsCheckDialog
      name={pokemon.nickname || template.name}
      rank={pokemon.rank}
      stats={pokemon.stats}
      categories={POKEMON_CATEGORIES}
      skills={POKEMON_SKILLS}
      extraIssues={extraIssues}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
};

/** iOS-style alert to confirm deleting the Pokémon. */
export const DeleteAlert = ({ pokemon, open, onOpenChange, onDeleted }: { pokemon: T.Pokemon; open: boolean; onOpenChange: (open: boolean) => void; onDeleted: () => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate, isPending } = usePokemonControllerRemove({
    onSuccess: () => {
      toast({ title: `${pokemon.nickname || pokemon.pokemonTemplate.name} was deleted` });
      onOpenChange(false);
      onDeleted();
      queryClient.invalidateQueries({ queryKey: ["pokemon"] });
    },
    onError: () => toast({ title: "Couldn’t delete the Pokémon", description: "Check your connection and try again." }),
  });
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[min(300px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-surface/95 text-center shadow-float backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 [--tw-duration:200ms]">
          <div className="px-5 pt-5 pb-4">
            <DialogPrimitive.Title className="text-headline font-semibold">Delete {pokemon.nickname || pokemon.pokemonTemplate.name}?</DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 text-footnote text-label-2">Its sheet, moves and stats are removed. This can’t be undone.</DialogPrimitive.Description>
          </div>
          <div className="grid grid-cols-2 border-t border-hairline">
            <DialogPrimitive.Close className="h-11 border-r border-hairline text-body text-tint hover:bg-fill">Cancel</DialogPrimitive.Close>
            <button
              type="button"
              disabled={isPending}
              onClick={() => mutate({ pathParams: { id: pokemon.id } })}
              className="h-11 text-body font-semibold text-[#d92d20] hover:bg-fill disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

/** Asks for the other player's email, then confirms before giving the Pokémon away. */
const SendAlert = ({ pokemon, open, onOpenChange }: { pokemon: T.Pokemon; open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [confirming, setConfirming] = React.useState(false);
  const name = pokemon.nickname || pokemon.pokemonTemplate.name;
  const { mutate, isPending, error, reset } = usePokemonControllerSend({
    onSuccess: () => {
      toast({ title: `${name} was sent to ${email.trim()}` });
      onOpenChange(false);
      navigate("/myPokemon");
      queryClient.invalidateQueries({ queryKey: ["pokemon"] });
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
    },
  });
  const detail = error?.stack;
  const message = detail && typeof detail === "object" && "payload" in detail && typeof detail.payload === "string" ? detail.payload : error && "Check your connection and try again.";
  const back = () => {
    setConfirming(false);
    reset();
  };
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setEmail("");
          back();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[min(300px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-surface/95 text-center shadow-float backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 [--tw-duration:200ms]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (confirming) mutate({ pathParams: { id: pokemon.id }, body: { email: email.trim() } });
              else setConfirming(true);
            }}
          >
            <div className="px-5 pt-5 pb-4">
              <DialogPrimitive.Title className="text-headline font-semibold break-words">{confirming ? `Send ${name} to ${email.trim()}?` : `Send ${name}`}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-footnote text-label-2">
                {confirming ? "It leaves your Pokémon and trainers and becomes theirs. Only they can send it back." : "Enter the email the other player logs in with."}
              </DialogPrimitive.Description>
              {!confirming && (
                <input
                  type="email"
                  required
                  maxLength={254}
                  autoFocus
                  aria-label="Player's email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-3 h-11 w-full min-w-0 rounded-xl bg-fill px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus lg:h-9"
                />
              )}
              {confirming && message && <p className="mt-2 text-footnote text-[#d92d20]">{message}</p>}
            </div>
            <div className="grid grid-cols-2 border-t border-hairline">
              {confirming ? (
                <button type="button" onClick={back} className="h-11 border-r border-hairline text-body text-tint hover:bg-fill">
                  Back
                </button>
              ) : (
                <DialogPrimitive.Close className="h-11 border-r border-hairline text-body text-tint hover:bg-fill">Cancel</DialogPrimitive.Close>
              )}
              <button type="submit" disabled={!email.trim() || isPending} className="h-11 text-body font-semibold text-tint hover:bg-fill disabled:opacity-50">
                {confirming ? "Send" : "Continue"}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export const MenuItem = ({ icon, children, onClick, destructive = false, disabled = false }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; destructive?: boolean; disabled?: boolean }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "flex min-h-11 w-full items-center justify-between gap-6 border-b border-hairline px-4 text-left text-body last:border-b-0 hover:bg-fill disabled:opacity-40 lg:min-h-9 lg:px-3",
      destructive && "text-[#d92d20]",
    )}
  >
    {children}
    <span aria-hidden className="[&_svg]:size-4.5">
      {icon}
    </span>
  </button>
);

/** View mode: Edit, plus a menu with Rank up, Evolve, Send and Delete. Editing: Cancel and Save. */
export const SheetActions = () => {
  const { updatedPokemon, editingMode, setEditingMode, savePokemon, cancelEdit } = usePokemon();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [evolving, setEvolving] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  if (!updatedPokemon) return null;
  if (editingMode !== "view")
    return (
      <>
        <button type="button" onClick={cancelEdit} className={button({ variant: "plain" })}>
          Cancel
        </button>
        <button type="button" onClick={savePokemon} className={button({ variant: "filled" })}>
          Save
        </button>
      </>
    );
  return (
    <>
      <button type="button" onClick={() => setEditingMode("edit")} className={button({ variant: "tinted" })}>
        <Pencil aria-hidden className="size-4" />
        Edit
      </button>
      <PopoverPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverPrimitive.Trigger aria-label="More actions" className={button({ variant: "gray", size: "icon" })}>
          <MoreHorizontal className="size-5" />
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="end"
            sideOffset={6}
            className="z-50 w-60 overflow-hidden rounded-xl border border-hairline bg-surface/95 shadow-float backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 [--tw-duration:150ms]"
          >
            <MenuItem
              icon={<ArrowUpCircle />}
              disabled={updatedPokemon.rank === Rank.CHAMPION}
              onClick={() => {
                setMenuOpen(false);
                setEditingMode("rankUp");
              }}
            >
              Rank up
            </MenuItem>
            <MenuItem
              icon={<ClipboardCheck />}
              onClick={() => {
                setMenuOpen(false);
                setChecking(true);
              }}
            >
              Check stat points
            </MenuItem>
            {updatedPokemon.pokemonTemplate.evolutions.length > 0 && (
              <MenuItem
                icon={<Dna />}
                onClick={() => {
                  setMenuOpen(false);
                  setEvolving(true);
                }}
              >
                Evolve or change form
              </MenuItem>
            )}
            {!updatedPokemon.cityId && (
              <MenuItem
                icon={<Send />}
                onClick={() => {
                  setMenuOpen(false);
                  setSending(true);
                }}
              >
                Send to another player
              </MenuItem>
            )}
            {!updatedPokemon.cityId && <MenuItem
              icon={<Trash2 />}
              destructive
              onClick={() => {
                setMenuOpen(false);
                setDeleting(true);
              }}
            >
              Delete Pokémon
            </MenuItem>}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      <DeleteAlert pokemon={updatedPokemon} open={deleting} onOpenChange={setDeleting} onDeleted={() => navigate("/myPokemon")} />
      <SendAlert pokemon={updatedPokemon} open={sending} onOpenChange={setSending} />
      <PokemonPointsCheck pokemon={updatedPokemon} open={checking} onOpenChange={setChecking} />
      {evolving && <EvolutionSheet open={evolving} onOpenChange={setEvolving} />}
    </>
  );
};

/** Saves a generated (unsaved) Pokémon to My Pokémon. */
export const AddToMyPokemon = () => {
  const { updatedPokemon } = usePokemon();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate, isPending } = usePokemonControllerCreate({
    onSuccess: (pokemon) => {
      queryClient.invalidateQueries({ queryKey: ["pokemon"] });
      toast({
        title: `${pokemon.pokemonTemplate?.name ?? "Pokémon"} joined your Pokémon${pokemon.shiny ? " ✨" : ""}`,
        action: (
          <button type="button" onClick={() => navigate(`/myPokemon/${pokemon.id}`)} className={button({ variant: "tinted", size: "sm" })}>
            Open
          </button>
        ),
      });
    },
    onError: () => toast({ title: "Couldn’t add the Pokémon", description: "Check your connection and try again." }),
  });
  const create = () => {
    const body: T.CreatePokemonBody = {
      pokemonTemplateId: updatedPokemon?.pokemonTemplate.id ?? "",
      rank: updatedPokemon?.rank,
      moveIds: updatedPokemon?.moves.map((move) => move.id) ?? [],
      abilityId: updatedPokemon?.ability?.id ?? "",
      natureId: updatedPokemon?.nature?.id ?? "",
      stats: updatedPokemon?.stats,
      gender: updatedPokemon?.gender,
      shiny: updatedPokemon?.shiny ?? false,
      currentHp: updatedPokemon?.currentHp,
      currentWill: updatedPokemon?.currentWill,
    };
    mutate({ body });
  };
  return (
    <button type="button" onClick={create} disabled={isPending} className={button({ variant: "filled" })}>
      <Plus aria-hidden className="size-4" strokeWidth={2.5} />
      Add to My Pokémon
    </button>
  );
};

/** Keeps a generated Pokémon when the encounter is generated again. */
export const LockButton = () => {
  const { isLocked, lockedPressed } = usePokemon();
  return (
    <button type="button" aria-pressed={isLocked ?? false} onClick={() => lockedPressed?.()} className={button({ variant: isLocked ? "tinted" : "gray" })}>
      {isLocked ? <Lock aria-hidden className="size-4" /> : <Unlock aria-hidden className="size-4" />}
      {isLocked ? "Locked" : "Lock"}
    </button>
  );
};
