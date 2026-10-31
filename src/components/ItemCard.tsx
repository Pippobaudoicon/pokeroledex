import type { ReactNode } from "react";
import type { Item } from "../../shared/types";
import { ItemCategory, ItemPocket } from "@/api/schemas";
import { ItemImage } from "@/components/ItemImage";
import { formatEnumName } from "@/lib/utils";
const getPocketColor = (pocket: ItemPocket | null | undefined) => {
  switch (pocket) {
    case ItemPocket.HELD_ITEMS:
      return "pocket-held-items";
    case ItemPocket.MEDICINE:
      return "pocket-medicine";
    case ItemPocket.TRAINER_ITEMS:
      return "pocket-trainer-items";
    case ItemPocket.EVOLUTION_ITEM:
      return "pocket-evolution-items";
    case ItemPocket.POKEBALLS:
      return "pocket-pokeballs";
    case ItemPocket.TECHNICAL_MACHINE:
      return "pocket-technical-machine";
    default:
      return "pokerole-red";
  }
};
const getCategoryColor = (category: ItemCategory) => {
  switch (category) {
    case ItemCategory.MEGA_STONE:
      return "item-category-mega-stone";
    case ItemCategory.BATTLE_ITEM:
      return "item-category-battle-item";
    case ItemCategory.TYPE_BOOSTING:
      return "item-category-type-boosting";
    case ItemCategory.Z_CRYSTAL:
      return "item-category-z-crystal";
    case ItemCategory.STATUS:
      return "item-category-status";
    case ItemCategory.BERRY:
      return "item-category-berry";
    case ItemCategory.MON_BOOSTING:
      return "item-category-mon-boosting";
    case ItemCategory.VITAMIN:
      return "item-category-vitamin";
    case ItemCategory.HEALING:
      return "item-category-healing";
    default:
      return "pokerole-red";
  }
};
/** Tailwind color name (without `bg-`) for an item: by category when it has one, else by pocket. */
export const getItemColor = (pocket: ItemPocket | null | undefined, category: ItemCategory | null | undefined) =>
  category != null ? getCategoryColor(category) : getPocketColor(pocket);

export interface ItemCardProps {
  item: Item;
  className?: string;
  footer?: ReactNode;
}

export const ItemCard = ({ item, className, footer }: ItemCardProps) => {
  const facts = [
    ["Pocket", formatEnumName(item.pocket ?? "—")],
    ["Category", item.category ? formatEnumName(item.category) : "—"],
    ["Trainer price", item.trainerPrice ?? "—"],
    ["PMD price", item.pmdPrice ?? "—"],
    ["Single use", item.oneUse ? "Yes" : "No"],
  ];
  return (
    <div className={`overflow-hidden rounded-2xl bg-surface text-label shadow-card ${className ?? ""}`}>
      <div className="flex items-center gap-3 border-b border-hairline p-4">
        <ItemImage imageFileName={item.image} className="size-16 shrink-0" />
        <div className="min-w-0">
          <h3 className="text-headline font-semibold break-words">{item.name}</h3>
          {item.source && <p className="mt-1 text-footnote text-label-2">{item.source}</p>}
        </div>
      </div>
      <dl className="px-4">
        {facts.map(([label, value]) => (
          <div key={label} className="flex gap-3 border-b border-hairline py-2 last:border-b-0">
            <dt className="w-24 shrink-0 text-subhead text-label-2">{label}</dt>
            <dd className="min-w-0 flex-1 text-subhead break-words">{value}</dd>
          </div>
        ))}
      </dl>
      {item.description && <p className="border-t border-hairline p-4 text-body whitespace-pre-wrap">{item.description}</p>}
      {footer && <div className="border-t border-hairline p-4">{footer}</div>}
    </div>
  );
};
