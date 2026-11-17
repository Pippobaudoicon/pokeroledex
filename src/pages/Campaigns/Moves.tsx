import { useQueryClient } from "@tanstack/react-query";
import { Plus, Swords } from "lucide-react";
import * as React from "react";
import { v4 } from "uuid";
import type * as T from "../../../shared/types";
import { defaultCraft } from "../../../shared/crafting";
import { useMovesControllerCreate, useMovesControllerRemove, useMovesControllerUpdate } from "@/api/components";
import { MoveCategory, MoveTarget, PokemonType } from "@/api/schemas";
import { button } from "@/components/kit/button";
import { Group, Row } from "@/components/kit/List";
import { CategoryIcon, categoryName } from "@/components/kit/MoveRow";
import { TypeDot } from "@/components/kit/Pills";
import { useToast } from "@/hooks/use-toast";
import { formatEnumName } from "@/lib/utils";
import {
  byName,
  ConfirmDelete,
  EditorSheet,
  EmptyEntries,
  EntriesState,
  errorText,
  Field,
  field,
  invalidateEntries,
  matches,
  SearchField,
  textArea,
  useCampaignEntries,
} from "@/pages/Campaigns/common";
import { useCampaign } from "@/pages/Campaigns/context";
import { CraftFields } from "@/pages/Campaigns/CraftFields";

interface MoveForm {
  name: string;
  type: PokemonType;
  category: MoveCategory;
  target: MoveTarget;
  damagePower: string;
  damage1: string;
  damage2: string;
  accuracy1: string;
  accuracy2: string;
  description: string;
  effect: string;
  craft: T.CraftSettings | null;
}

const toForm = (move?: T.Move): MoveForm => ({
  name: move?.name ?? "",
  type: (move?.type as PokemonType | undefined) ?? PokemonType.NORMAL,
  category: move?.category ?? MoveCategory.PHYSICAL,
  target: move?.target ?? MoveTarget.FOE,
  damagePower: move?.damagePower?.toString() ?? "0",
  damage1: move?.damage1 ?? "",
  damage2: move?.damage2 ?? "",
  accuracy1: move?.accuracy1 ?? "",
  accuracy2: move?.accuracy2 ?? "",
  description: move?.description ?? "",
  effect: move?.effect ?? "",
  craft: move?.craft ?? null,
});

const isComplete = (form: MoveForm) => [form.name, form.description, form.effect].every((value) => value.trim() !== "");

const refresh = (queryClient: ReturnType<typeof useQueryClient>) => invalidateEntries(queryClient, "moves", "move-index", "learners", "dex");

/** "Strength + Brawl", leaving out blanks. */
const pool = (...parts: string[]) => parts.filter((part) => part.trim() !== "").join(" + ");

const MoveEditor = ({
  campaignId,
  move,
  open,
  onOpenChange,
}: {
  campaignId: string;
  /** Undefined adds a new move. */
  move?: T.Move;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [form, setForm] = React.useState(() => toForm(move));
  const [confirming, setConfirming] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  React.useEffect(() => {
    if (open) setForm(toForm(move));
  }, [open, move]);
  const set =
    (key: keyof MoveForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));
  const fail = (title: string) => (error: unknown) => toast({ title, description: errorText(error) });
  const create = useMovesControllerCreate({
    onSuccess: () => {
      refresh(queryClient);
      onOpenChange(false);
      toast({ title: `${form.name.trim()} added` });
    },
    onError: fail("Move couldn’t be added"),
  });
  const update = useMovesControllerUpdate({
    onSuccess: () => {
      refresh(queryClient);
      onOpenChange(false);
      toast({ title: "Move saved" });
    },
    onError: fail("Move couldn’t be saved"),
  });
  const remove = useMovesControllerRemove({
    onSuccess: () => {
      refresh(queryClient);
      setConfirming(false);
      onOpenChange(false);
      toast({ title: `${move?.name} deleted` });
    },
    onError: fail("Move couldn’t be deleted"),
  });
  const fields = {
    name: form.name.trim(),
    type: form.type,
    target: form.target as T.MoveTarget,
    damage1: form.damage1.trim(),
    damage2: form.damage2.trim(),
    damagePower: form.damagePower.trim(),
    accuracy1: form.accuracy1.trim(),
    accuracy2: form.accuracy2.trim(),
    effect: form.effect.trim(),
    description: form.description.trim(),
    craft: form.craft,
  };
  const submit = () => {
    if (move) {
      update.mutate({ body: { id: move.id, category: form.category, ...fields } });
      return;
    }
    // New moves need an `_id` and a capitalised `Category` (the Worker maps it to `category`).
    // A non-literal body skips TypeScript's excess-property check for those two keys.
    const body = { _id: v4(), campaignId, Category: form.category, attributes: {}, addedEffects: {}, ...fields };
    create.mutate({ body });
  };
  return (
    <>
      <EditorSheet
        open={open}
        onOpenChange={onOpenChange}
        title={move ? "Edit move" : "New move"}
        submitLabel={move ? "Save" : "Add move"}
        canSubmit={isComplete(form)}
        isPending={create.isPending || update.isPending}
        onSubmit={submit}
        onDelete={move ? () => setConfirming(true) : undefined}
        deleteLabel="Delete move"
      >
        <Field label="Name" required>
          <input value={form.name} onChange={set("name")} autoComplete="off" placeholder="Move name" className={field} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <span className="relative flex items-center">
              <TypeDot type={form.type} className="pointer-events-none absolute left-2.5 size-5" />
              <select value={form.type} onChange={set("type")} className={`${field} pl-9`}>
                {Object.values(PokemonType).map((type) => (
                  <option key={type} value={type}>
                    {formatEnumName(type)}
                  </option>
                ))}
              </select>
            </span>
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={set("category")} className={field}>
              {Object.values(MoveCategory).map((category) => (
                <option key={category} value={category}>
                  {categoryName(category)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target">
            <select value={form.target} onChange={set("target")} className={field}>
              {Object.values(MoveTarget).map((target) => (
                <option key={target} value={target}>
                  {formatEnumName(target)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Power">
            <input value={form.damagePower} onChange={set("damagePower")} inputMode="numeric" placeholder="0" className={field} />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-subhead font-medium">Damage pool</legend>
          <div className="grid grid-cols-2 gap-3">
            <input aria-label="Damage 1" value={form.damage1} onChange={set("damage1")} placeholder="e.g. Strength" className={field} />
            <input aria-label="Damage 2" value={form.damage2} onChange={set("damage2")} placeholder="e.g. Brawl" className={field} />
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-subhead font-medium">Accuracy pool</legend>
          <div className="grid grid-cols-2 gap-3">
            <input aria-label="Accuracy 1" value={form.accuracy1} onChange={set("accuracy1")} placeholder="e.g. Dexterity" className={field} />
            <input aria-label="Accuracy 2" value={form.accuracy2} onChange={set("accuracy2")} placeholder="e.g. Brawl" className={field} />
          </div>
        </fieldset>
        <Field label="Description" required>
          <textarea value={form.description} onChange={set("description")} rows={3} className={textArea} />
        </Field>
        <Field label="Effect" required>
          <textarea value={form.effect} onChange={set("effect")} rows={4} className={textArea} />
        </Field>
        <CraftFields
          kind="move"
          base={defaultCraft("move", { id: move?.id ?? "", name: fields.name, type: form.type, category: form.category, damagePower: fields.damagePower })}
          value={form.craft}
          onChange={(craft) => setForm((current) => ({ ...current, craft }))}
        />
      </EditorSheet>
      {move && (
        <ConfirmDelete
          open={confirming}
          onOpenChange={setConfirming}
          name={move.name}
          confirmLabel="Delete move"
          isPending={remove.isPending}
          onConfirm={() => remove.mutate({ pathParams: { id: move.id } })}
        />
      )}
    </>
  );
};

export const CampaignMoves = () => {
  const { campaign } = useCampaign();
  const campaignId = campaign?.id ?? "";
  const { data, isError, refetch } = useCampaignEntries<T.Move>("moves", campaignId);
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<T.Move | undefined>();
  const [open, setOpen] = React.useState(false);
  const edit = (move?: T.Move) => {
    setEditing(move);
    setOpen(true);
  };
  const moves = data && byName(data).filter((move) => matches(query, move.name, move.type, move.effect));
  return (
    <div className="flex flex-col gap-4">
      {!data || !moves ? (
        <EntriesState isError={isError} onRetry={() => refetch()} noun="moves" />
      ) : data.length === 0 ? (
        <EmptyEntries
          icon={<Swords />}
          title="No moves yet"
          text="Moves you add here show up in the Moves index and can be learned by this campaign’s Pokémon."
          action={
            <button type="button" className={button({ variant: "tinted" })} onClick={() => edit()}>
              <Plus aria-hidden className="size-4" />
              Add move
            </button>
          }
        />
      ) : (
        <>
          {data.length > 6 && <SearchField value={query} onChange={setQuery} label="Search moves" />}
          <Group
            title={`${moves.length} ${moves.length === 1 ? "move" : "moves"}`}
            action={
              <button type="button" className={button({ variant: "plain", size: "sm" })} onClick={() => edit()}>
                <Plus aria-hidden className="size-4" />
                Add
              </button>
            }
          >
            {moves.length === 0 && <Row title={<span className="text-label-2">No moves match “{query}”.</span>} />}
            {moves.map((move) => {
              const damage = pool(move.damage1, move.damage2);
              const accuracy = pool(move.accuracy1, move.accuracy2);
              return (
                <Row
                  key={move.id}
                  icon={<TypeDot type={move.type} className="size-7 lg:size-6" />}
                  title={
                    <span className="flex items-center gap-2">
                      <span className="truncate">{move.name}</span>
                      <CategoryIcon category={move.category} className="size-4 shrink-0" />
                    </span>
                  }
                  subtitle={
                    <span className="line-clamp-1">
                      {[damage && `Dmg ${damage}`, accuracy && `Acc ${accuracy}`, formatEnumName(move.target)].filter(Boolean).join(" · ")}
                    </span>
                  }
                  value={move.damagePower && move.damagePower !== "0" ? <span className="tabular-nums">{move.damagePower}</span> : undefined}
                  onClick={() => edit(move)}
                />
              );
            })}
          </Group>
        </>
      )}
      <MoveEditor campaignId={campaignId} move={editing} open={open} onOpenChange={setOpen} />
    </div>
  );
};
