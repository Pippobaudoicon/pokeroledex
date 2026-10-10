import { useDebounce, useHover } from "@uidotdev/usehooks";
import * as React from "react";
import { FaTrashCan } from "react-icons/fa6";
import type * as T from "../../../shared/types";
import { useItemsControllerFindAll } from "@/api/components";
import { ItemCategory, ItemPocket } from "@/api/schemas";
import { Box } from "@/components/Box";
import { Combobox } from "@/components/Combobox";
import { ItemCard, getItemColor } from "@/components/ItemCard";
import { ItemImage } from "@/components/ItemImage";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { getContrastTextColor } from "@/lib/colors";
import { cn, formatEnumName } from "@/lib/utils";
import { type InventoryRow, useTrainer } from "@/pages/MyTrainers/context";

/** The pocket and category comboboxes have no onChange, so a draft only ever gets a name and description. */
type CustomItemDraft = Pick<T.Item, "id" | "name"> & Partial<Pick<T.Item, "description" | "pocket" | "category">>;

interface InventoryItemRowProps {
  item: InventoryRow;
  onChange?: (item: InventoryRow) => void;
  onDelete?: (item: InventoryRow) => void;
  /** As a PopoverTrigger child this receives Radix's toggle handler, called with the row instead of the event. */
  onClick?: (item: InventoryRow) => void;
  className?: string;
}

const InventoryItemRow = React.forwardRef<HTMLDivElement, InventoryItemRowProps>(
  ({ item, onChange, onDelete, onClick, className }, ref) => {
    const [quantity, setQuantity] = React.useState(item.quantity);
    const debouncedQuantity = useDebounce(quantity, 500);
    React.useEffect(() => {
      onChange?.({
        ...item,
        quantity: isNaN(debouncedQuantity) ? 0 : debouncedQuantity,
      });
    }, [debouncedQuantity]);
    React.useEffect(() => {
      setQuantity(item.quantity);
    }, [item]);
    return (
      <div
        className={cn(
          `flex justify-between w-full p-1 border-b-2 border-pokerole-black-light/50 items-center ${onClick != null ? "cursor-pointer hover:bg-pokerole-black/10" : ""} rounded-t-md`,
          className,
        )}
        ref={ref}
      >
        <div className="flex-grow" onClick={() => onClick?.(item)}>
          <Text font="font-move" size="text-lg">
            {item.item.name}
          </Text>
        </div>
        <Input
          type="number"
          value={quantity}
          className="text-lg font-move text-pokerole-black flex-grow-0 w-6"
          styleLess={true}
          onChange={(event) => {
            setQuantity(parseInt(event.target.value));
          }}
        />
        {onDelete != null && (
          <Button
            variant="transparent"
            className="p-1"
            onClick={() => {
              onDelete(item);
            }}
          >
            <FaTrashCan />
          </Button>
        )}
      </div>
    );
  },
);
InventoryItemRow.displayName = "InventoryListItem";

export const InventoryList = ({
  inventoryItems,
  columnCount = 1,
  onChange,
  onClick,
  onDelete,
}: {
  inventoryItems: InventoryRow[];
  columnCount?: number;
  onChange?: (item: InventoryRow) => void;
  onClick?: (item: InventoryRow) => void;
  onDelete?: (item: InventoryRow) => void;
}) => (
  <div className={`grid grid-cols-${columnCount} gap-2`}>
    {inventoryItems.map((item, index) => (
      <Popover key={index}>
        <PopoverTrigger asChild={true}>
          <InventoryItemRow item={item} onChange={onChange} onClick={onClick} onDelete={onDelete} />
        </PopoverTrigger>
        <PopoverContent className="p-0 bg-transparent border-none shadow-none">
          <ItemCard item={item.item} />
        </PopoverContent>
      </Popover>
    ))}
  </div>
);

const ItemPickerCard = ({
  item,
  onClick,
  selected = false,
}: {
  item: T.Item;
  onClick: () => void;
  selected?: boolean;
}) => {
  const color = getItemColor(item.pocket, item.category);
  const textColor = getContrastTextColor(color);
  const [hoverRef, hovering] = useHover<HTMLDivElement>();
  const highlighted = hovering || selected;
  return (
    <div ref={hoverRef}>
      <Box
        color={highlighted ? `bg-${color}-dark` : `bg-${color}`}
        className="p-2 cursor-pointer"
        onClick={onClick}
      >
        <Box
          color={highlighted ? `bg-${color}` : `bg-${color}-light`}
          className="p-2 min-w-16 min-h-16 flex justify-center items-center flex-col"
        >
          <ItemImage imageFileName={item.image} />
          <Text
            color={textColor}
            size="text-xs"
            className="text-center whitespace-nowrap"
          >
            {item.name}
          </Text>
        </Box>
      </Box>
    </div>
  );
};

const ItemPicker = ({
  onSelected,
  selected,
  scrollClassName,
}: {
  onSelected: (item: T.Item) => void;
  selected: T.Item | null;
  scrollClassName?: string;
}) => {
  const { data: items } = useItemsControllerFindAll({});
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 200);
  const sortedItems = React.useMemo(
    () =>
      items
        ?.filter((item) => item.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
        .sort((a, b) => {
          if (a.pocket == null) return 1;
          if (b.pocket == null) return -1;
          const byPocket = a.pocket.localeCompare(b.pocket);
          if (byPocket !== 0) return byPocket;
          if (a.category == null) return 1;
          if (b.category == null) return -1;
          const byCategory = a.category.localeCompare(b.category);
          return byCategory !== 0 ? byCategory : a.name.localeCompare(b.name);
        }),
    [items, debouncedSearch],
  );
  return items === undefined || sortedItems === undefined ? (
    <LoadingSpinner />
  ) : (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex flex-row gap-2">
        <Input
          className="rounded-3xl"
          placeholder="Search..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <Button className="rounded-3xl">Search</Button>
      </div>
      <ScrollArea className={`rounded-3xl ${scrollClassName ?? ""}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {sortedItems.map((item) => (
            <ItemPickerCard
              key={item.id}
              item={item}
              onClick={() => {
                onSelected(item);
              }}
              selected={selected?.id === item.id}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export const InventorySection = ({ buttonClassName }: { buttonClassName?: string }) => {
  const [selectedItem, setSelectedItem] = React.useState<T.Item | null>(null);
  const [customItem, setCustomItem] = React.useState<CustomItemDraft | null>(null);
  const { updatedTrainer, updateTrainer } = useTrainer();
  React.useEffect(() => {
    if (customItem != null) setSelectedItem(null);
  }, [customItem]);
  const addItem = () => {
    if (updatedTrainer == null) return;
    if (selectedItem != null) {
      const entry: InventoryRow = {
        id: undefined,
        item: selectedItem,
        quantity: 1,
      };
      updateTrainer({
        inventory: [...updatedTrainer.inventory, entry],
      });
    } else if (customItem != null && customItem.name !== "") {
      const entry: InventoryRow = {
        id: undefined,
        // A draft lacks most Item fields; the inventory DTO sends them as undefined.
        item: {
          ...customItem,
          source: "custom",
        } as T.Item,
        quantity: 1,
      };
      updateTrainer({
        inventory: [...updatedTrainer.inventory, entry],
      });
    }
  };
  return (
    <Sheet>
      <SheetTrigger asChild={true}>
        <Button variant="transparent" className={buttonClassName}>
          <Text className="text-center">+</Text>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full md:w-[600px]">
        <SheetHeader>
          <SheetTitle>Add items to inventory</SheetTitle>
          <SheetDescription>
            Add items to your inventory from the list of items or by creating a
            new item.
          </SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-1 gap-2">
          <div>
            <ItemPicker
              onSelected={(item) => {
                setSelectedItem(item);
                setCustomItem(null);
              }}
              selected={selectedItem}
              scrollClassName="h-[50vh]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Text className="text-center" size="text-xl">
              - Or create a new item -
            </Text>
            <div className="flex flex-row items-center space-x-2">
              <Text size="text-xl">{"Name: "}</Text>
              <Input
                placeholder="Enter name..."
                onChange={(event) => {
                  setCustomItem((current) => ({
                    ...current,
                    name: event.target.value ?? "",
                    id: current?.id ?? "",
                  }));
                }}
                value={customItem?.name ?? ""}
              />
            </div>
            <div className="flex flex-row items-center space-x-2">
              <Text size="text-xl">{"Pocket: "}</Text>
              <Combobox
                items={Object.values(ItemPocket).map((pocket) => ({
                  label: formatEnumName(pocket),
                  value: pocket.toLowerCase(),
                }))}
                className="text-md flex-grow p-1"
                value={customItem?.pocket ?? ""}
              />
            </div>
            <div className="flex flex-row items-center space-x-2">
              <Text size="text-xl">{"Category: "}</Text>
              <Combobox
                items={Object.values(ItemCategory).map((category) => ({
                  label: formatEnumName(category),
                  value: category.toLowerCase(),
                }))}
                className="text-md flex-grow p-1"
                value={customItem?.category ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Text size="text-xl">{"Description: "}</Text>
              <Textarea
                placeholder="Enter your description here..."
                value={customItem?.description ?? ""}
                onChange={(event) => {
                  setCustomItem((current) => ({
                    ...current,
                    description: event.target.value ?? "",
                    id: current?.id ?? "",
                    name: current?.name ?? "",
                  }));
                }}
              />
            </div>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild={true}>
            <Button
              type="submit"
              variant="green"
              onClick={addItem}
              className="w-full mt-2"
            >
              Add {selectedItem?.name ?? customItem?.name ?? "nothing"}{" "}
              to inventory
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
