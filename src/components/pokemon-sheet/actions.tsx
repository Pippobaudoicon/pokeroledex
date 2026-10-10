import { type InvalidateQueryFilters, useQueryClient } from "@tanstack/react-query";
import type * as React from "react";
import { FaSave } from "react-icons/fa";
import {
  FaDna,
  FaLock,
  FaTrash,
  FaUnlock,
  FaWrench,
  FaXmark,
} from "react-icons/fa6";
import { GrUpgrade } from "react-icons/gr";
import { Link, useNavigate } from "react-router-dom";
import type * as T from "../../../shared/types";
import {
  usePokemonControllerCreate,
  usePokemonControllerRemove,
} from "@/api/components";
import { queryKeyFn } from "@/api/context";
import { Rank } from "@/api/schemas";
import { CollapsableButton } from "@/components/CollapsableButton";
import { usePokemon } from "@/components/pokemon-sheet/context";
import { EvolutionDialog } from "@/components/pokemon-sheet/EvolutionDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { appRoutes } from "@/routes";
const DeletePokemonDialog = ({
  children,
  pokemon,
}: {
  children: React.ReactNode;
  pokemon: T.Pokemon;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { mutate } = usePokemonControllerRemove({
    onSuccess: () => {
      toast({
        title: "Pokemon deleted",
        description: (
          <>
            <span>Your pokemon has been deleted.</span>
          </>
        ),
      });
      navigate("/myPokemon");
      // Bare keys (not { queryKey }) make react-query v5 invalidate every query.
      queryClient.invalidateQueries(
        queryKeyFn({
          path: "/pokemon/{id}",
          operationId: "pokemonControllerFindOne",
          variables: {
            pathParams: {
              id: pokemon.id,
            },
          },
        }) as InvalidateQueryFilters,
      );
      queryClient.invalidateQueries(
        queryKeyFn({
          path: "/pokemon",
          operationId: "pokemonControllerFindAll",
          variables: {},
        }) as InvalidateQueryFilters,
      );
    },
    onError: (error) => {
      toast({
        title: "Failed to delete pokemon",
        // apiFetch errors carry no payload, so this is always undefined (kept from the hosted build).
        description: (error as Partial<T.ApiError>)?.payload,
      });
    },
  });
  const deletePokemon = () => {
    mutate({
      pathParams: {
        id: pokemon?.id,
      },
    });
  };
  return (
    <Dialog>
      <DialogTrigger asChild={true}>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Are you sure you want to delete{" "}
            {pokemon?.pokemonTemplate.name}?
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <Button variant="red" onClick={deletePokemon}>
          Delete
        </Button>
      </DialogContent>
    </Dialog>
  );
};
const DeletePokemonButton = () => {
  const { updatedPokemon } = usePokemon();
  if (updatedPokemon == null) return <></>;
  return (
    <>
      <DeletePokemonDialog pokemon={updatedPokemon}>
        <CollapsableButton
          text="Delete Pokemon"
          icon={<FaTrash size={20} />}
          variant="red"
        />
      </DeletePokemonDialog>
    </>
  );
};
export const SheetActions = () => {
  const {
    updatedPokemon,
    editingMode,
    setEditingMode,
    savePokemon,
    cancelEdit,
  } = usePokemon();
  return (
    <>
      {editingMode === "view" ? (
        <>
          {updatedPokemon !== undefined && updatedPokemon.pokemonTemplate.evolutions.length > 0 && (
            <EvolutionDialog
              trigger={
                <CollapsableButton
                  text="Evolve"
                  icon={<FaDna size={20} />}
                  variant="green"
                />
              }
            />
          )}
          <CollapsableButton
            onClick={() => {
              setEditingMode("rankUp");
            }}
            id="rank-up-button"
            text="Rank Up"
            icon={<GrUpgrade size={20} />}
            variant="blue"
            disabled={updatedPokemon?.rank === Rank.CHAMPION}
          />
          <CollapsableButton
            onClick={() => {
              setEditingMode("edit");
            }}
            id="edit-pokemon-button"
            text="Edit"
            icon={<FaWrench size={20} />}
            variant="yellow"
          />
          <DeletePokemonButton />
        </>
      ) : (
        <>
          <CollapsableButton
            onClick={() => {
              savePokemon();
            }}
            text="Save"
            icon={<FaSave size={20} />}
            variant="green"
          />
          <CollapsableButton
            onClick={() => {
              cancelEdit();
            }}
            text="Cancel"
            icon={<FaXmark size={20} />}
            variant="red"
          />
        </>
      )}
    </>
  );
};
export const AddToMyPokemon = () => {
  const { updatedPokemon } = usePokemon();
  const { toast } = useToast();
  const { mutate } = usePokemonControllerCreate({
    onSuccess: (pokemon) => {
      toast({
        title: "Pokemon created",
        description: (
          <>
            <span>
              Your new pokemon has been created.{" "}
              <Link to={appRoutes.find((route) => route.name === "My Pokemon")?.path + `/${pokemon.id}`}>
                <span className="text-attributes-blue-dark underline hover:text-attributes-blue">
                  View it here
                </span>
              </Link>
            </span>
          </>
        ),
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create pokemon",
        description: (error as Partial<T.ApiError>)?.payload,
      });
    },
  });
  const createPokemon = () => {
    const body: T.CreatePokemonBody = {
      pokemonTemplateId: updatedPokemon?.pokemonTemplate.id ?? "",
      rank: updatedPokemon?.rank,
      moveIds: updatedPokemon?.moves.map((move) => move.id) ?? [],
      abilityId: updatedPokemon?.ability?.id ?? "",
      natureId: updatedPokemon?.nature?.id ?? "",
      stats: updatedPokemon?.stats,
      gender: updatedPokemon?.gender,
      currentHp: updatedPokemon?.currentHp,
      currentWill: updatedPokemon?.currentWill,
    };
    mutate({
      body,
    });
  };
  return (
    <div id="create-pokemon-button">
      <CollapsableButton
        id="create-pokemon-button"
        text="Add to my pokemon"
        icon={<FaSave size={20} />}
        variant="green"
        onClick={() => {
          createPokemon();
        }}
      />
    </div>
  );
};
export const LockButton = () => {
  const { isLocked, lockedPressed } = usePokemon();
  return (
    <>
      {isLocked ? (
        <CollapsableButton
          text="Unlock Pokemon"
          icon={<FaLock size={20} />}
          variant="green"
          onClick={() => {
            lockedPressed?.();
          }}
        />
      ) : (
        <CollapsableButton
          text="Lock Pokemon"
          icon={<FaUnlock size={20} />}
          variant="green"
          onClick={() => {
            lockedPressed?.();
          }}
        />
      )}
    </>
  );
};
