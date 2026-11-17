import { useQueryClient } from "@tanstack/react-query";
import { Backpack, Plus } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { defaultCraft } from "../../../shared/crafting";
import { useItemsControllerCreate, useItemsControllerRemove, useItemsControllerUpdate } from "@/api/components";
import { ItemCategory, ItemPocket } from "@/api/schemas";
import { ItemImage } from "@/components/ItemImage";
import { button } from "@/components/kit/button";
import { Switch } from "@/components/kit/Controls";
import { Group, Row } from "@/components/kit/List";
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

interface ItemForm {
  name: string;
  category: ItemCategory;
  pocket: ItemPocket;
  description: string;
  oneUse: boolean;
  pmd: boolean;
  trainerPrice: string;
  pmdPrice: string;
  image: string;
  craft: T.CraftSettings | null;
}

const price = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : value.toString());

const toForm = (item?: T.Item): ItemForm => ({
  name: item?.name ?? "",
  category: item?.category ?? ItemCategory.BATTLE_ITEM,
  pocket: item?.pocket ?? ItemPocket.HELD_ITEMS,
  description: item?.description ?? "",
  oneUse: item?.oneUse ?? false,
  pmd: item?.PMD ?? false,
  trainerPrice: price(item?.trainerPrice),
  pmdPrice: price(item?.pmdPrice),
  image: item?.image ?? "",
  craft: item?.craft ?? null,
});

const refresh = (queryClient: ReturnType<typeof useQueryClient>) => invalidateEntries(queryClient, "items", "item-index");

const ItemEditor = ({
  campaignId,
  item,
  open,
  onOpenChange,
}: {
  campaignId: string;
  /** Undefined adds a new item. */
  item?: T.Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [form, setForm] = React.useState(() => toForm(item));
  const [confirming, setConfirming] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  React.useEffect(() => {
    if (open) setForm(toForm(item));
  }, [open, item]);
  const set =
    (key: "name" | "category" | "pocket" | "description" | "trainerPrice" | "pmdPrice" | "image") =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));
  const fail = (title: string) => (error: unknown) => toast({ title, description: errorText(error) });
  const create = useItemsControllerCreate({
    onSuccess: () => {
      refresh(queryClient);
      onOpenChange(false);
      toast({ title: `${form.name.trim()} added` });
    },
    onError: fail("Item couldn’t be added"),
  });
  const update = useItemsControllerUpdate({
    onSuccess: () => {
      refresh(queryClient);
      onOpenChange(false);
      toast({ title: "Item saved" });
    },
    onError: fail("Item couldn’t be saved"),
  });
  const remove = useItemsControllerRemove({
    onSuccess: () => {
      refresh(queryClient);
      setConfirming(false);
      onOpenChange(false);
      toast({ title: `${item?.name} deleted` });
    },
    onError: fail("Item couldn’t be deleted"),
  });
  const fields = {
    name: form.name.trim(),
    category: form.category,
    pocket: form.pocket,
    description: form.description.trim(),
    oneUse: form.oneUse,
    PMD: form.pmd,
    trainerPrice: form.trainerPrice !== "" ? Number(form.trainerPrice) : 0,
    image: form.image.trim(),
    craft: form.craft,
  };
  const pmdPrice = form.pmdPrice !== "" ? Number(form.pmdPrice) : 0;
  const submit = () => {
    if (item) {
      update.mutate({ body: { id: item.id, pmdPrice, ...fields } });
      return;
    }
    // New items take a capitalised `PMDPrice` (the Worker maps it to `pmdPrice`).
    // A non-literal body skips TypeScript's excess-property check for that key.
    const body = { campaignId, source: "custom", PMDPrice: pmdPrice, ...fields };
    create.mutate({ body });
  };
  return (
    <>
      <EditorSheet
        open={open}
        onOpenChange={onOpenChange}
        title={item ? "Edit item" : "New item"}
        submitLabel={item ? "Save" : "Add item"}
        canSubmit={form.name.trim() !== ""}
        isPending={create.isPending || update.isPending}
        onSubmit={submit}
        onDelete={item ? () => setConfirming(true) : undefined}
        deleteLabel="Delete item"
      >
        <div className="flex items-end gap-3">
          <ItemImage imageFileName={form.image || "pokedex.png"} className="size-11 shrink-0 rounded-xl bg-fill p-1.5" />
          <Field label="Name" required className="flex-1">
            <input value={form.name} onChange={set("name")} autoComplete="off" placeholder="Item name" className={field} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pocket">
            <select value={form.pocket} onChange={set("pocket")} className={field}>
              {Object.values(ItemPocket).map((pocket) => (
                <option key={pocket} value={pocket}>
                  {formatEnumName(pocket)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={set("category")} className={field}>
              {Object.values(ItemCategory).map((category) => (
                <option key={category} value={category}>
                  {formatEnumName(category)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea value={form.description} onChange={set("description")} rows={4} className={textArea} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Trainer price">
            <input type="number" min={0} inputMode="numeric" value={form.trainerPrice} onChange={set("trainerPrice")} placeholder="0" className={field} />
          </Field>
          <Field label="PMD price">
            <input type="number" min={0} inputMode="numeric" value={form.pmdPrice} onChange={set("pmdPrice")} placeholder="0" className={field} />
          </Field>
        </div>
        <Field label="Image file" hint="A file name from the item images, e.g. potion.png.">
          <input value={form.image} onChange={set("image")} autoComplete="off" placeholder="Optional" className={field} />
        </Field>
        <Group>
          <Row
            title="Single use"
            subtitle="Consumed when used."
            value={<Switch aria-label="Single use" checked={form.oneUse} onChange={(oneUse) => setForm((current) => ({ ...current, oneUse }))} />}
          />
          <Row
            title="Mystery Dungeon item"
            value={<Switch aria-label="Mystery Dungeon item" checked={form.pmd} onChange={(pmd) => setForm((current) => ({ ...current, pmd }))} />}
          />
        </Group>
        <CraftFields
          kind="item"
          base={defaultCraft("item", { id: item?.id ?? "", name: fields.name, pocket: form.pocket, category: form.category, trainerPrice: fields.trainerPrice || null })}
          value={form.craft}
          onChange={(craft) => setForm((current) => ({ ...current, craft }))}
        />
      </EditorSheet>
      {item && (
        <ConfirmDelete
          open={confirming}
          onOpenChange={setConfirming}
          name={item.name}
          confirmLabel="Delete item"
          isPending={remove.isPending}
          onConfirm={() => remove.mutate({ pathParams: { id: item.id } })}
        />
      )}
    </>
  );
};

export const CampaignItems = () => {
  const { campaign } = useCampaign();
  const campaignId = campaign?.id ?? "";
  const { data, isError, refetch } = useCampaignEntries<T.Item>("items", campaignId);
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<T.Item | undefined>();
  const [open, setOpen] = React.useState(false);
  const edit = (item?: T.Item) => {
    setEditing(item);
    setOpen(true);
  };
  const items = data && byName(data).filter((item) => matches(query, item.name, item.description, item.pocket, item.category));
  return (
    <div className="flex flex-col gap-4">
      {!data || !items ? (
        <EntriesState isError={isError} onRetry={() => refetch()} noun="items" />
      ) : data.length === 0 ? (
        <EmptyEntries
          icon={<Backpack />}
          title="No items yet"
          text="Items you add here show up in the Items index and in trainers’ bags."
          action={
            <button type="button" className={button({ variant: "tinted" })} onClick={() => edit()}>
              <Plus aria-hidden className="size-4" />
              Add item
            </button>
          }
        />
      ) : (
        <>
          {data.length > 6 && <SearchField value={query} onChange={setQuery} label="Search items" />}
          <Group
            title={`${items.length} ${items.length === 1 ? "item" : "items"}`}
            action={
              <button type="button" className={button({ variant: "plain", size: "sm" })} onClick={() => edit()}>
                <Plus aria-hidden className="size-4" />
                Add
              </button>
            }
          >
            {items.length === 0 && <Row title={<span className="text-label-2">No items match “{query}”.</span>} />}
            {items.map((item) => {
              const cost = price(item.trainerPrice);
              return (
                <Row
                  key={item.id}
                  icon={<ItemImage imageFileName={item.image || "pokedex.png"} className="size-8" />}
                  title={item.name}
                  subtitle={[formatEnumName(item.pocket), item.category && formatEnumName(item.category), item.oneUse && "Single use"]
                    .filter(Boolean)
                    .join(" · ")}
                  value={cost && cost !== "0" ? <span className="tabular-nums">{cost}</span> : undefined}
                  onClick={() => edit(item)}
                />
              );
            })}
          </Group>
        </>
      )}
      <ItemEditor campaignId={campaignId} item={editing} open={open} onOpenChange={setOpen} />
    </div>
  );
};
