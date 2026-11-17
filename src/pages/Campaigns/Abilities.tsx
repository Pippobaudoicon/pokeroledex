import { useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { defaultCraft } from "../../../shared/crafting";
import { useAbilitiesControllerCreate, useAbilitiesControllerRemove, useAbilitiesControllerUpdate } from "@/api/components";
import { button } from "@/components/kit/button";
import { Group, Row } from "@/components/kit/List";
import { useToast } from "@/hooks/use-toast";
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

interface AbilityForm {
  name: string;
  description: string;
  effect: string;
  craft: T.CraftSettings | null;
}

const toForm = (ability?: T.Ability): AbilityForm => ({
  name: ability?.name ?? "",
  description: ability?.description ?? "",
  effect: ability?.effect ?? "",
  craft: ability?.craft ?? null,
});

const isComplete = (form: AbilityForm) => [form.name, form.description, form.effect].every((value) => value.trim() !== "");

const refresh = (queryClient: ReturnType<typeof useQueryClient>) => invalidateEntries(queryClient, "abilities", "dex");

const AbilityEditor = ({
  campaignId,
  ability,
  open,
  onOpenChange,
}: {
  campaignId: string;
  /** Undefined adds a new ability. */
  ability?: T.Ability;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [form, setForm] = React.useState(() => toForm(ability));
  const [confirming, setConfirming] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  React.useEffect(() => {
    if (open) setForm(toForm(ability));
  }, [open, ability]);
  const set = (key: keyof AbilityForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const fail = (title: string) => (error: unknown) => toast({ title, description: errorText(error) });
  const create = useAbilitiesControllerCreate({
    onSuccess: () => {
      refresh(queryClient);
      onOpenChange(false);
      toast({ title: `${form.name.trim()} added` });
    },
    onError: fail("Ability couldn’t be added"),
  });
  const update = useAbilitiesControllerUpdate({
    onSuccess: () => {
      refresh(queryClient);
      onOpenChange(false);
      toast({ title: "Ability saved" });
    },
    onError: fail("Ability couldn’t be saved"),
  });
  const remove = useAbilitiesControllerRemove({
    onSuccess: () => {
      refresh(queryClient);
      setConfirming(false);
      onOpenChange(false);
      toast({ title: `${ability?.name} deleted` });
    },
    onError: fail("Ability couldn’t be deleted"),
  });
  const body = { name: form.name.trim(), description: form.description.trim(), effect: form.effect.trim(), craft: form.craft };
  return (
    <>
      <EditorSheet
        open={open}
        onOpenChange={onOpenChange}
        title={ability ? "Edit ability" : "New ability"}
        submitLabel={ability ? "Save" : "Add ability"}
        canSubmit={isComplete(form)}
        isPending={create.isPending || update.isPending}
        onSubmit={() =>
          ability ? update.mutate({ body: { id: ability.id, ...body } }) : create.mutate({ body: { campaignId, ...body } })
        }
        onDelete={ability ? () => setConfirming(true) : undefined}
        deleteLabel="Delete ability"
      >
        <Field label="Name" required>
          <input value={form.name} onChange={set("name")} autoComplete="off" placeholder="Ability name" className={field} />
        </Field>
        <Field label="Description" required hint="Flavour text, shown first.">
          <textarea value={form.description} onChange={set("description")} rows={3} className={textArea} />
        </Field>
        <Field label="Effect" required hint="What the ability does in play.">
          <textarea value={form.effect} onChange={set("effect")} rows={4} className={textArea} />
        </Field>
        <CraftFields
          kind="ability"
          base={defaultCraft("ability", { id: ability?.id ?? "", name: body.name })}
          value={form.craft}
          onChange={(craft) => setForm((current) => ({ ...current, craft }))}
        />
      </EditorSheet>
      {ability && (
        <ConfirmDelete
          open={confirming}
          onOpenChange={setConfirming}
          name={ability.name}
          confirmLabel="Delete ability"
          isPending={remove.isPending}
          onConfirm={() => remove.mutate({ pathParams: { id: ability.id } })}
        />
      )}
    </>
  );
};

export const CampaignAbilities = () => {
  const { campaign } = useCampaign();
  const campaignId = campaign?.id ?? "";
  const { data, isError, refetch } = useCampaignEntries<T.Ability>("abilities", campaignId);
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<T.Ability | undefined>();
  const [open, setOpen] = React.useState(false);
  const edit = (ability?: T.Ability) => {
    setEditing(ability);
    setOpen(true);
  };
  const add = (
    <button type="button" className={button({ variant: "plain", size: "sm" })} onClick={() => edit()}>
      <Plus aria-hidden className="size-4" />
      Add
    </button>
  );
  const abilities = data && byName(data).filter((ability) => matches(query, ability.name, ability.description, ability.effect));
  return (
    <div className="flex flex-col gap-4">
      {!data || !abilities ? (
        <EntriesState isError={isError} onRetry={() => refetch()} noun="abilities" />
      ) : data.length === 0 ? (
        <EmptyEntries
          icon={<Sparkles />}
          title="No abilities yet"
          text="Abilities you add here can be given to this campaign’s Pokémon."
          action={
            <button type="button" className={button({ variant: "tinted" })} onClick={() => edit()}>
              <Plus aria-hidden className="size-4" />
              Add ability
            </button>
          }
        />
      ) : (
        <>
          {data.length > 6 && <SearchField value={query} onChange={setQuery} label="Search abilities" />}
          <Group title={`${abilities.length} ${abilities.length === 1 ? "ability" : "abilities"}`} action={add}>
            {abilities.length === 0 && <Row title={<span className="text-label-2">No abilities match “{query}”.</span>} />}
            {abilities.map((ability) => (
              <Row
                key={ability.id}
                title={ability.name}
                subtitle={<span className="line-clamp-2">{ability.effect || ability.description}</span>}
                onClick={() => edit(ability)}
              />
            ))}
          </Group>
        </>
      )}
      <AbilityEditor campaignId={campaignId} ability={editing} open={open} onOpenChange={setOpen} />
    </div>
  );
};
