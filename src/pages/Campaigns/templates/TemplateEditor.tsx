import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { v4 } from "uuid";
import { normalizeHabitats } from "../../../../shared/habitats";
import type * as T from "../../../../shared/types";
import { apiFetch } from "@/api/client";
import {
  usePokemonTemplatesControllerCreate,
  usePokemonTemplatesControllerRemove,
  usePokemonTemplatesControllerUpdate,
} from "@/api/components";
import { useToast } from "@/hooks/use-toast";
import { formatEnumName } from "@/lib/utils";
import { byName, ConfirmDelete, EditorSheet, errorText, invalidateEntries, useCampaignEntries } from "@/pages/Campaigns/common";
import {
  emptyTemplateForm,
  PokemonTemplateForm,
  type TemplateFormData,
  type TemplateFormOptions,
  validationError,
} from "@/pages/Campaigns/templates/PokemonTemplateForm";

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
  habitats: normalizeHabitats(template.habitats ?? []),
  moves: (template.possibleMoves ?? []).map((possibleMove) => ({ moveId: possibleMove.move.id, rank: possibleMove.rank })),
  evolutions: template.evolutions ?? [],
  description: template.description ?? "",
  craft: template.craft ?? null,
});

const sameJson = (first: unknown, second: unknown) => JSON.stringify(first) === JSON.stringify(second);
const orUndefined = <TValue extends string>(value: TValue) => (value !== "" ? value : undefined);
const sortedMoves = (moves: TemplateFormData["moves"]) =>
  moves.filter((move) => move.moveId !== "").sort((first, second) => first.moveId.localeCompare(second.moveId) || first.rank.localeCompare(second.rank));
const dexIdOf = (form: TemplateFormData) => (form.dexID !== "" ? form.dexID : form.number.toString().padStart(4, "0"));

const createBody = (campaignId: string, form: TemplateFormData): T.CustomPokemonTemplateBody => ({
  id: v4(),
  campaignId,
  name: form.name,
  dexID: dexIdOf(form),
  number: form.number,
  types: form.types,
  recommendedRank: form.recommendedRank,
  dexCategory: form.dexCategory,
  image: form.image,
  legendary: form.legendary,
  goodStarter: form.goodStarter,
  genderType: orUndefined(form.genderType),
  baseHp: form.baseHp,
  height: form.height,
  weight: form.weight,
  baseStats: form.baseStats,
  maxStats: form.maxStats,
  abilityOneId: form.abilityOneId,
  abilityTwoId: orUndefined(form.abilityTwoId),
  hiddenAbilityId: orUndefined(form.hiddenAbilityId),
  eventAbilityId: orUndefined(form.eventAbilityId),
  habitats: form.habitats,
  possibleMoves: form.moves.filter((move) => move.moveId !== "").map((move) => ({ rank: move.rank, moveId: move.moveId })),
  evolutions: form.evolutions,
  description: orUndefined(form.description),
  craft: form.craft,
});

/** Only the fields that differ from the saved template. */
const changesBody = (template: T.PokemonTemplate, form: TemplateFormData) => {
  const saved = toFormData(template);
  const changes: Partial<T.CustomPokemonTemplateBody> & { id: string } = { id: template.id };
  if (form.name !== saved.name) changes.name = form.name;
  if (form.number !== saved.number) changes.number = form.number;
  const dexID = dexIdOf(form);
  if (dexID !== saved.dexID) changes.dexID = dexID;
  if (form.dexCategory !== saved.dexCategory) changes.dexCategory = form.dexCategory;
  if (form.image !== saved.image) changes.image = form.image;
  if (form.legendary !== saved.legendary) changes.legendary = form.legendary;
  if (form.goodStarter !== saved.goodStarter) changes.goodStarter = form.goodStarter;
  if (orUndefined(form.genderType) !== orUndefined(saved.genderType)) changes.genderType = orUndefined(form.genderType);
  if (form.baseHp !== saved.baseHp) changes.baseHp = form.baseHp;
  if (form.height !== saved.height) changes.height = form.height;
  if (form.weight !== saved.weight) changes.weight = form.weight;
  if (orUndefined(form.description) !== orUndefined(saved.description)) changes.description = orUndefined(form.description);
  if (!sameJson(form.types, saved.types)) changes.types = form.types;
  if (form.recommendedRank !== saved.recommendedRank) changes.recommendedRank = form.recommendedRank;
  if (!sameJson(form.habitats, saved.habitats)) changes.habitats = form.habitats;
  if (!sameJson(form.baseStats, saved.baseStats)) changes.baseStats = form.baseStats;
  if (!sameJson(form.maxStats, saved.maxStats)) changes.maxStats = form.maxStats;
  if (form.abilityOneId !== saved.abilityOneId) changes.abilityOneId = form.abilityOneId;
  if (orUndefined(form.abilityTwoId) !== orUndefined(saved.abilityTwoId)) changes.abilityTwoId = orUndefined(form.abilityTwoId);
  if (orUndefined(form.hiddenAbilityId) !== orUndefined(saved.hiddenAbilityId)) changes.hiddenAbilityId = orUndefined(form.hiddenAbilityId);
  if (orUndefined(form.eventAbilityId) !== orUndefined(saved.eventAbilityId)) changes.eventAbilityId = orUndefined(form.eventAbilityId);
  if (!sameJson(form.evolutions, saved.evolutions)) changes.evolutions = form.evolutions;
  if (!sameJson(form.craft, saved.craft)) changes.craft = form.craft;
  if (!sameJson(sortedMoves(form.moves), sortedMoves(saved.moves))) {
    // Rows that still match a saved move keep its id.
    const savedMoves = template.possibleMoves ?? [];
    changes.possibleMoves = form.moves
      .filter((move) => move.moveId !== "")
      .map((move) => {
        const savedMove = savedMoves.find((possibleMove) => possibleMove.move.id === move.moveId && possibleMove.rank === move.rank);
        return { rank: move.rank, moveId: move.moveId, ...(savedMove ? { id: savedMove.id } : {}) };
      });
  }
  return changes;
};

interface NamedTemplate {
  id: string;
  name: string;
  campaignName?: string | null;
}

/** Abilities, moves and Pokémon (core included) for the form's pickers, fetched while the editor is open. */
const useFormOptions = (campaignId: string, enabled: boolean): TemplateFormOptions => {
  const abilities = useCampaignEntries<T.Ability>("abilities", campaignId, true, enabled);
  const moves = useCampaignEntries<T.Move>("moves", campaignId, true, enabled);
  const templates = useQuery({
    queryKey: ["pokemon-templates", "names", [campaignId]],
    queryFn: ({ signal }) =>
      apiFetch<NamedTemplate[]>({ url: "/pokemon-templates/names", method: "post", body: { includeCore: true, campaignIds: [campaignId] }, signal }),
    enabled: enabled && campaignId !== "",
  });
  return React.useMemo(
    () => ({
      abilities: byName(abilities.data ?? []).map((ability) => ({ value: ability.id, label: ability.name })),
      moves: byName(moves.data ?? []).map((move) => ({ value: move.id, label: move.name, detail: formatEnumName(move.type) })),
      templates: byName(templates.data ?? []).map((template) => ({
        value: template.id,
        label: template.name,
        detail: template.campaignName ?? undefined,
      })),
      loading: abilities.isPending || moves.isPending || templates.isPending,
    }),
    [abilities.data, moves.data, templates.data, abilities.isPending, moves.isPending, templates.isPending],
  );
};

const refresh = (queryClient: ReturnType<typeof useQueryClient>) => invalidateEntries(queryClient, "pokemon-templates", "dex", "learners");

export const TemplateEditor = ({
  campaignId,
  template,
  open,
  onOpenChange,
}: {
  campaignId: string;
  /** Undefined adds a new Pokémon. */
  template?: T.PokemonTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [form, setForm] = React.useState(emptyTemplateForm);
  const [confirming, setConfirming] = React.useState(false);
  const options = useFormOptions(campaignId, open);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  React.useEffect(() => {
    if (open) setForm(template ? toFormData(template) : emptyTemplateForm());
  }, [open, template]);
  const fail = (title: string) => (error: unknown) => toast({ title, description: errorText(error) });
  const create = usePokemonTemplatesControllerCreate({
    onSuccess: () => {
      refresh(queryClient);
      onOpenChange(false);
      toast({ title: `${form.name.trim()} added` });
    },
    onError: fail("Pokémon couldn’t be added"),
  });
  const update = usePokemonTemplatesControllerUpdate({
    onSuccess: () => {
      refresh(queryClient);
      onOpenChange(false);
      toast({ title: "Pokémon saved" });
    },
    onError: fail("Pokémon couldn’t be saved"),
  });
  const remove = usePokemonTemplatesControllerRemove({
    onSuccess: () => {
      refresh(queryClient);
      setConfirming(false);
      onOpenChange(false);
      toast({ title: `${template?.name} deleted` });
    },
    onError: fail("Pokémon couldn’t be deleted"),
  });
  const blocker = validationError(form);
  return (
    <>
      <EditorSheet
        open={open}
        onOpenChange={onOpenChange}
        title={template ? `Edit ${template.name}` : "New Pokémon"}
        submitLabel={template ? "Save" : "Add Pokémon"}
        canSubmit={blocker === undefined}
        blocker={blocker}
        isPending={create.isPending || update.isPending}
        onSubmit={() =>
          template ? update.mutate({ body: changesBody(template, form) }) : create.mutate({ body: createBody(campaignId, form) })
        }
        onDelete={template ? () => setConfirming(true) : undefined}
        deleteLabel="Delete Pokémon"
        className="lg:max-w-2xl"
      >
        <PokemonTemplateForm form={form} onChange={setForm} options={options} />
      </EditorSheet>
      {template && (
        <ConfirmDelete
          open={confirming}
          onOpenChange={setConfirming}
          name={template.name}
          confirmLabel="Delete Pokémon"
          isPending={remove.isPending}
          onConfirm={() => remove.mutate({ pathParams: { id: template.id } })}
        />
      )}
    </>
  );
};
