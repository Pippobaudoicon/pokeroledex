import { Plus, Trash2 } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { useItemsControllerFindAll } from "@/api/components";
import { ItemCategory, ItemPocket } from "@/api/schemas";
import { ItemCard } from "@/components/ItemCard";
import { ItemImage } from "@/components/ItemImage";
import { button } from "@/components/kit/button";
import { Chip } from "@/components/kit/Controls";
import { Picker } from "@/components/kit/Picker";
import { Sheet } from "@/components/kit/Sheet";
import { formatEnumName } from "@/lib/utils";
import { type InventoryRow, useTrainer } from "@/pages/MyTrainers/context";

const InventoryItem = ({
  entry,
  onChange,
  onDelete,
}: {
  entry: InventoryRow;
  onChange: (quantity: number) => void;
  onDelete: () => void;
}) => {
  const [draft, setDraft] = React.useState(String(entry.quantity));
  const [detail, setDetail] = React.useState(false);
  React.useEffect(() => setDraft(String(entry.quantity)), [entry.quantity]);
  const commit = () => {
    const quantity = Number.parseInt(draft, 10);
    if (!Number.isNaN(quantity) && quantity >= 0 && quantity !== entry.quantity) onChange(quantity);
  };
  React.useEffect(() => {
    const timer = setTimeout(commit, 400);
    return () => clearTimeout(timer);
  }, [draft]);
  return (
    <>
      <div className="flex items-center gap-2 border-b border-hairline py-1 pr-2 pl-3 last:border-b-0">
        <button
          type="button"
          onClick={() => setDetail(true)}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-lg text-left hover:bg-raised lg:min-h-10"
        >
          <ItemImage imageFileName={entry.item.image} className="size-8 shrink-0" />
          <span className="truncate text-body">{entry.item.name}</span>
        </button>
        <input
          aria-label={`Quantity of ${entry.item.name}`}
          type="number"
          min={0}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          className="h-11 w-16 shrink-0 rounded-lg bg-fill px-2 text-center text-body tabular-nums lg:h-8"
        />
        <button
          type="button"
          aria-label={`Remove ${entry.item.name}`}
          onClick={onDelete}
          className={button({ variant: "destructive", size: "icon" })}
        >
          <Trash2 aria-hidden className="size-4" />
        </button>
      </div>
      <Sheet open={detail} onOpenChange={setDetail} title={entry.item.name} initialExpanded>
        <div className="p-4">
          <ItemCard item={entry.item} />
        </div>
      </Sheet>
    </>
  );
};

export const InventoryList = ({
  inventoryItems,
  onChange,
  onDelete,
}: {
  inventoryItems: InventoryRow[];
  onChange: (index: number, quantity: number) => void;
  onDelete: (index: number) => void;
}) =>
  inventoryItems.length ? (
    <div>
      {inventoryItems.map((entry, index) => (
        <InventoryItem
          key={entry.id ?? `draft-${index}`}
          entry={entry}
          onChange={(quantity) => onChange(index, quantity)}
          onDelete={() => onDelete(index)}
        />
      ))}
    </div>
  ) : (
    <p className="p-4 text-subhead text-label-2">The bag is empty. Add an item to get started.</p>
  );

export const InventorySection = () => {
  const [open, setOpen] = React.useState(false);
  const [custom, setCustom] = React.useState(false);
  const [itemId, setItemId] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [pocket, setPocket] = React.useState<T.ItemPocket>(ItemPocket.TRAINER_ITEMS);
  const [category, setCategory] = React.useState<T.ItemCategory | "">("");
  const { data: items, isFetching } = useItemsControllerFindAll({});
  const { updatedTrainer: trainer, updateTrainer } = useTrainer();
  const selected = items?.find((item) => item.id === itemId);
  const add = () => {
    if (!trainer) return;
    const item = custom
      ? ({
          id: "",
          name: name.trim(),
          description,
          pocket,
          category: category || null,
          source: "custom",
          oneUse: false,
          PMD: false,
          trainerPrice: null,
          pmdPrice: null,
          image: "pokedex.png",
        } as T.Item)
      : selected;
    if (!item?.name) return;
    updateTrainer({ inventory: [...trainer.inventory, { id: undefined, item, quantity: 1 }] });
    setOpen(false);
  };
  const fieldClass =
    "h-11 w-full rounded-xl bg-fill px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus lg:h-9 lg:rounded-lg";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={button({ variant: "plain", size: "sm" })}>
        <Plus aria-hidden className="size-4" />
        Add item
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Add to inventory" initialExpanded>
        <div className="flex flex-col gap-4 p-4">
          <div role="group" aria-label="Item source" className="flex gap-2">
            <Chip pressed={!custom} onClick={() => setCustom(false)}>
              From catalog
            </Chip>
            <Chip pressed={custom} onClick={() => setCustom(true)}>
              Custom item
            </Chip>
          </div>
          {custom ? (
            <>
              <label className="flex flex-col gap-1.5 text-subhead font-medium">
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-subhead font-medium">
                Pocket
                <select value={pocket} onChange={(event) => setPocket(event.target.value as T.ItemPocket)} className={fieldClass}>
                  {Object.values(ItemPocket).map((entry) => (
                    <option key={entry} value={entry}>
                      {formatEnumName(entry)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-subhead font-medium">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as T.ItemCategory | "")}
                  className={fieldClass}
                >
                  <option value="">None</option>
                  {Object.values(ItemCategory).map((entry) => (
                    <option key={entry} value={entry}>
                      {formatEnumName(entry)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-subhead font-medium">
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-24 w-full rounded-xl bg-fill p-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus"
                />
              </label>
            </>
          ) : (
            <>
              <Picker
                label="Item"
                placeholder="Choose an item"
                loading={isFetching}
                items={(items ?? []).map((item) => ({ value: item.id, label: item.name, detail: formatEnumName(item.pocket) }))}
                value={itemId}
                onChange={setItemId}
              />
              {selected && <ItemCard item={selected} />}
            </>
          )}
          <button type="button" disabled={custom ? !name.trim() : !selected} onClick={add} className={button({ variant: "filled" })}>
            Add {custom ? name.trim() || "item" : (selected?.name ?? "item")}
          </button>
        </div>
      </Sheet>
    </>
  );
};
