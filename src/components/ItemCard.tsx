import type { Item } from "../../shared/types";
import { ItemCategory, ItemPocket } from "@/api/schemas";
import { Box } from "@/components/Box";
import { ItemImage } from "@/components/ItemImage";
import { Text } from "@/components/Text";
import { getContrastTextColor } from "@/lib/colors";
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
export const getItemColor = (
  pocket: ItemPocket | null | undefined,
  category: ItemCategory | null | undefined,
) => (category != null ? getCategoryColor(category) : getPocketColor(pocket));

export interface ItemCardProps {
  item: Item;
  className?: string;
}

export const ItemCard = ({ item, className }: ItemCardProps) => {
  const textColor = getContrastTextColor(getItemColor(item.pocket, item.category));
  return (
    <Box
      color={`bg-${getItemColor(item.pocket, item.category)} ${className}`}
      className="p-2 flex flex-row gap-2"
    >
      <Box
        color={`bg-${getItemColor(item.pocket, item.category)}-light`}
        className="p-2 md:min-w-32 min-w-24 md:min-h-32 min-h-24 flex justify-center items-center"
      >
        <ItemImage imageFileName={item.image} className="md:h-20 h-16" />
      </Box>
      <div className="flex flex-col justify-center">
        <Text size="text-2xl" color={textColor} className="break-all">
          {item.name}
        </Text>
        <Text size="text-xs" className="italic" color={textColor}>
          {item.source}
        </Text>
        <Text size="text-sm" color={textColor}>
          <span className="font-bold">{"Pocket: "}</span>
          <span className="font-move">{formatEnumName(item.pocket ?? "-")}</span>
        </Text>
        <Text size="text-sm" color={textColor}>
          <span className="font-bold">{"Category: "}</span>
          <span className="font-move">
            {item.category != null ? formatEnumName(item.category) : "-"}
          </span>
        </Text>
        <Text size="text-sm" color={textColor}>
          <span className="font-bold">{"Price: "}</span>
          <span className="font-move">
            {item.trainerPrice ?? item.pmdPrice ?? "-"}
          </span>
        </Text>
        <Text
          size="text-lg"
          font="font-move"
          className="whitespace-pre-wrap"
          color={textColor}
        >
          <span>{item.description}</span>
        </Text>
      </div>
    </Box>
  );
};
