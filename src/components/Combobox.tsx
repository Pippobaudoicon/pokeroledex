import { Check } from "lucide-react";
import * as React from "react";
import { FaSortDown } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ComboboxItem {
  label: React.ReactNode;
  value: string;
  /** Text matched by the search box; defaults to `String(label)`. */
  searchValue?: string;
}

export interface ComboboxProps {
  items: ComboboxItem[];
  disabled?: boolean;
  value?: string;
  /** Called with the picked value, or "" when the current value is picked again. */
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function Combobox({
  items,
  disabled = false,
  value,
  onChange,
  className,
  placeholder = "Search...",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string>();
  React.useEffect(() => {
    setSelected(value);
  }, [value]);
  const valueBySearch = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      const search = item.searchValue ?? String(item.label);
      map.set(search.toLowerCase(), item.value);
    }
    return map;
  }, [items]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild={true}>
        <Button
          variant={disabled ? "white-disabled" : "white"}
          role="combobox"
          aria-expanded={open}
          className={cn("text-3xl leading-none justify-between", className)}
        >
          {selected !== undefined && selected !== "" ? (
            <div className="flex-grow">
              {items.find((item) => item.value === selected)?.label ?? "Invalid"}
            </div>
          ) : (
            <div className="flex-grow text-muted-foreground">{placeholder}</div>
          )}
          {disabled ? (
            ""
          ) : (
            <FaSortDown className="ml-2 shrink-0 stroke-pokerole-black fill-pokerole-black" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>Nothing found.</CommandEmpty>
          <ScrollArea className="h-60" blockParentScroll={true}>
            <CommandGroup>
              {items.map((item) => {
                const search = (item.searchValue ?? String(item.label)).toLowerCase();
                return (
                  <CommandItem
                    key={item.value}
                    value={search}
                    onSelect={(pickedSearch) => {
                      const picked = valueBySearch.get(pickedSearch.toLowerCase()) ?? "";
                      const next = picked === selected ? "" : picked;
                      setSelected(next);
                      setOpen(false);
                      if (onChange != null) onChange(next);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected === item.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
