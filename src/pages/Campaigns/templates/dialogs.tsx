import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { v4 } from "uuid";
import type * as T from "../../../../shared/types";
import type { ApiFetchError } from "@/api/client";
import {
  useAbilitiesControllerFindAllByCampaign,
  useMovesControllerFindAllByCampaign,
  usePokemonTemplatesControllerCreate,
  usePokemonTemplatesControllerFindAllByCampaign,
  usePokemonTemplatesControllerRemove,
  usePokemonTemplatesControllerUpdate,
} from "@/api/components";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCampaign } from "@/pages/Campaigns/context";
import {
  emptyTemplateForm,
  PokemonTemplateForm,
  type TemplateFormData,
  validationError,
} from "@/pages/Campaigns/templates/PokemonTemplateForm";

const invalidateTemplateQueries = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const head = query.queryKey[0];
      return typeof head === "string" && head.includes("pokemon-templates");
    },
  });
};

// apiFetch errors carry no payload, so this is always the fallback (kept from the hosted build).
const errorDescription = (error: ApiFetchError) =>
  (error as Partial<T.ApiError>).payload ?? "An error occurred";

const byName = <TItem extends { name: string }>(items: TItem[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

/** Abilities, moves and templates (core included) for the form's pickers, fetched on `load`. */
const useTemplateFormOptions = () => {
  const [abilities, setAbilities] = React.useState<T.Ability[]>([]);
  const [moves, setMoves] = React.useState<T.Move[]>([]);
  const [pokemonTemplates, setPokemonTemplates] = React.useState<T.PokemonTemplate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const pendingRequests = React.useRef(0);
  const settle = () => {
    pendingRequests.current -= 1;
    if (pendingRequests.current <= 0) setIsLoading(false);
  };
  const { mutate: fetchAbilities } = useAbilitiesControllerFindAllByCampaign({
    onSuccess: (data) => {
      setAbilities(byName(data));
      settle();
    },
    onError: settle,
  });
  const { mutate: fetchMoves } = useMovesControllerFindAllByCampaign({
    onSuccess: (data) => {
      setMoves(byName(data));
      settle();
    },
    onError: settle,
  });
  const { mutate: fetchTemplates } = usePokemonTemplatesControllerFindAllByCampaign({
    onSuccess: (data) => {
      setPokemonTemplates(byName(data));
      settle();
    },
    onError: settle,
  });
  const load = (campaignId: string) => {
    setIsLoading(true);
    pendingRequests.current = 3;
    const variables = { pathParams: { id: campaignId }, body: { includeCore: true } };
    fetchAbilities(variables);
    fetchMoves(variables);
    fetchTemplates(variables);
  };
  return { abilities, moves, pokemonTemplates, isLoading, load };
};

export const CreatePokemonTemplateDialog = ({ trigger }: { trigger: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState(emptyTemplateForm());
  const options = useTemplateFormOptions();
  const { campaign } = useCampaign();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: createTemplate, isPending } = usePokemonTemplatesControllerCreate({
    onSuccess: () => {
      toast({
        title: "Pokemon Template Created",
        description: `${formData.name} has been created successfully.`,
      });
      invalidateTemplateQueries(queryClient);
      setOpen(false);
      setFormData(emptyTemplateForm());
    },
    onError: (error) => {
      toast({
        title: "Failed to create Pokemon Template",
        description: errorDescription(error),
        variant: "destructive",
      });
    },
  });

  React.useEffect(() => {
    if (open && campaign !== undefined) options.load(campaign.id);
  }, [open, campaign]);

  const submit = () => {
    if (campaign === undefined) return;
    const error = validationError(formData);
    if (error !== undefined) {
      toast({ title: "Validation Error", description: error, variant: "destructive" });
      return;
    }
    const body: T.CustomPokemonTemplateBody = {
      id: v4(),
      campaignId: campaign.id,
      name: formData.name,
      dexID: formData.dexID !== "" ? formData.dexID : formData.number.toString().padStart(4, "0"),
      number: formData.number,
      types: formData.types,
      recommendedRank: formData.recommendedRank,
      dexCategory: formData.dexCategory,
      image: formData.image,
      legendary: formData.legendary,
      goodStarter: formData.goodStarter,
      genderType: formData.genderType !== "" ? formData.genderType : undefined,
      baseHp: formData.baseHp,
      height: formData.height,
      weight: formData.weight,
      baseStats: formData.baseStats,
      maxStats: formData.maxStats,
      abilityOneId: formData.abilityOneId,
      abilityTwoId: formData.abilityTwoId !== "" ? formData.abilityTwoId : undefined,
      hiddenAbilityId: formData.hiddenAbilityId !== "" ? formData.hiddenAbilityId : undefined,
      eventAbilityId: formData.eventAbilityId !== "" ? formData.eventAbilityId : undefined,
      habitats: formData.habitats,
      possibleMoves: formData.moves
        .filter((move) => move.moveId !== "")
        .map((move) => ({ rank: move.rank, moveId: move.moveId })),
      evolutions: formData.evolutions,
      description: formData.description !== "" ? formData.description : undefined,
    };
    createTemplate({ body });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add Pokemon Template</DialogTitle>
          <DialogDescription>Create a new custom Pokemon template for this campaign.</DialogDescription>
        </DialogHeader>
        <PokemonTemplateForm
          formData={formData}
          onChange={setFormData}
          abilities={options.abilities}
          moves={options.moves}
          pokemonTemplates={options.pokemonTemplates}
          isLoadingData={options.isLoading}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button variant="green" onClick={submit} disabled={validationError(formData) !== undefined || isPending}>
            {isPending ? "Creating..." : "Create Pokemon Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Server data may hold nulls where the types say otherwise, hence the fallbacks. */
const toFormData = (template: T.PokemonTemplate): TemplateFormData => ({
  name: template.name ?? "",
  dexID: template.dexID ?? "",
  number: template.number ?? 0,
  types: template.types ?? [],
  recommendedRank: template.recommendedRank,
  dexCategory: template.dexCategory ?? "",
  image: template.image ?? "",
  legendary: template.legendary ?? false,
  goodStarter: template.goodStarter ?? false,
  genderType: template.genderType ?? "",
  baseHp: template.baseHp ?? 1,
  height: template.height ?? 0,
  weight: template.weight ?? 0,
  baseStats: template.baseStats ?? emptyTemplateForm().baseStats,
  maxStats: template.maxStats ?? emptyTemplateForm().maxStats,
  abilityOneId: template.abilityOne?.id ?? "",
  abilityTwoId: template.abilityTwo?.id ?? "",
  hiddenAbilityId: template.hiddenAbility?.id ?? "",
  eventAbilityId: template.eventAbility?.id ?? "",
  habitats: template.habitats ?? [],
  moves: (template.possibleMoves ?? []).map((possibleMove) => ({
    moveId: possibleMove.move.id,
    rank: possibleMove.rank,
  })),
  evolutions: template.evolutions ?? [],
  description: template.description ?? "",
});

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const orUndefined = <TValue extends string>(value: TValue) => (value !== "" ? value : undefined);
const sortedMoves = (moves: TemplateFormData["moves"]) =>
  moves
    .filter((move) => move.moveId !== "")
    .sort((a, b) => a.moveId.localeCompare(b.moveId) || a.rank.localeCompare(b.rank));

export const EditPokemonTemplateDialog = ({
  trigger,
  pokemonTemplate,
}: {
  trigger: React.ReactNode;
  pokemonTemplate: T.PokemonTemplate;
}) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState(emptyTemplateForm());
  const options = useTemplateFormOptions();
  const { campaign } = useCampaign();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: updateTemplate, isPending } = usePokemonTemplatesControllerUpdate({
    onSuccess: () => {
      toast({
        title: "Pokemon Template Updated",
        description: `${formData.name} updated successfully.`,
      });
      invalidateTemplateQueries(queryClient);
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update Pokemon Template",
        description: errorDescription(error),
        variant: "destructive",
      });
    },
  });

  React.useEffect(() => {
    if (open && campaign !== undefined) {
      options.load(campaign.id);
      setFormData(toFormData(pokemonTemplate));
    }
  }, [open, campaign, pokemonTemplate]);

  /** Sends only the fields that differ from the saved template. */
  const submit = () => {
    const error = validationError(formData);
    if (error !== undefined) {
      toast({ title: "Validation Error", description: error, variant: "destructive" });
      return;
    }
    const saved = toFormData(pokemonTemplate);
    const changes: Partial<T.CustomPokemonTemplateBody> & { id: string } = { id: pokemonTemplate.id };
    if (formData.name !== saved.name) changes.name = formData.name;
    if (formData.number !== saved.number) changes.number = formData.number;
    const dexID = formData.dexID !== "" ? formData.dexID : formData.number.toString().padStart(4, "0");
    if (dexID !== saved.dexID) changes.dexID = dexID;
    if (formData.dexCategory !== saved.dexCategory) changes.dexCategory = formData.dexCategory;
    if (formData.image !== saved.image) changes.image = formData.image;
    if (formData.legendary !== saved.legendary) changes.legendary = formData.legendary;
    if (formData.goodStarter !== saved.goodStarter) changes.goodStarter = formData.goodStarter;
    if (orUndefined(formData.genderType) !== orUndefined(saved.genderType))
      changes.genderType = orUndefined(formData.genderType);
    if (formData.baseHp !== saved.baseHp) changes.baseHp = formData.baseHp;
    if (formData.height !== saved.height) changes.height = formData.height;
    if (formData.weight !== saved.weight) changes.weight = formData.weight;
    if (orUndefined(formData.description) !== orUndefined(saved.description))
      changes.description = orUndefined(formData.description);
    if (!sameJson(formData.types, saved.types)) changes.types = formData.types;
    if (formData.recommendedRank !== saved.recommendedRank) changes.recommendedRank = formData.recommendedRank;
    if (!sameJson(formData.habitats, saved.habitats)) changes.habitats = formData.habitats;
    if (!sameJson(formData.baseStats, saved.baseStats)) changes.baseStats = formData.baseStats;
    if (!sameJson(formData.maxStats, saved.maxStats)) changes.maxStats = formData.maxStats;
    if (formData.abilityOneId !== saved.abilityOneId) changes.abilityOneId = formData.abilityOneId;
    if (orUndefined(formData.abilityTwoId) !== orUndefined(saved.abilityTwoId))
      changes.abilityTwoId = orUndefined(formData.abilityTwoId);
    if (orUndefined(formData.hiddenAbilityId) !== orUndefined(saved.hiddenAbilityId))
      changes.hiddenAbilityId = orUndefined(formData.hiddenAbilityId);
    if (orUndefined(formData.eventAbilityId) !== orUndefined(saved.eventAbilityId))
      changes.eventAbilityId = orUndefined(formData.eventAbilityId);
    if (!sameJson(formData.evolutions, saved.evolutions)) changes.evolutions = formData.evolutions;
    if (!sameJson(sortedMoves(formData.moves), sortedMoves(saved.moves))) {
      // Rows that still match a saved move keep its id.
      const savedMoves = pokemonTemplate.possibleMoves ?? [];
      changes.possibleMoves = formData.moves
        .filter((move) => move.moveId !== "")
        .map((move) => {
          const savedMove = savedMoves.find(
            (possibleMove) => possibleMove.move.id === move.moveId && possibleMove.rank === move.rank,
          );
          return { rank: move.rank, moveId: move.moveId, ...(savedMove ? { id: savedMove.id } : {}) };
        });
    }
    updateTemplate({ body: changes });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Pokemon Template</DialogTitle>
          <DialogDescription>Update the selected Pokemon template for this campaign.</DialogDescription>
        </DialogHeader>
        <PokemonTemplateForm
          formData={formData}
          onChange={setFormData}
          abilities={options.abilities}
          moves={options.moves}
          pokemonTemplates={options.pokemonTemplates}
          isLoadingData={options.isLoading}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button variant="green" onClick={submit} disabled={validationError(formData) !== undefined || isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const DeletePokemonTemplateDialog = ({
  children,
  pokemonTemplate,
}: {
  children: React.ReactNode;
  pokemonTemplate: T.PokemonTemplate;
}) => {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: removeTemplate, isPending } = usePokemonTemplatesControllerRemove({
    onSuccess: () => {
      toast({
        title: "Pokemon Template deleted",
        description: `${pokemonTemplate.name} has been deleted.`,
      });
      invalidateTemplateQueries(queryClient);
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete Pokemon Template",
        description: errorDescription(error),
        variant: "destructive",
      });
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure you want to delete {pokemonTemplate.name}?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <Button
          variant="red"
          onClick={() => {
            removeTemplate({ pathParams: { id: pokemonTemplate.id } });
          }}
          disabled={isPending}
        >
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
