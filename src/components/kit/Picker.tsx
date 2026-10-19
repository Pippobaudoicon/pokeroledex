import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import * as React from "react";
import { fold } from "@/hooks/use-dex";
import { cn } from "@/lib/utils";

export interface PickerItem {
  value: string;
  label: string;
  /** Second line, e.g. the campaign a custom entry comes from. */
  detail?: string;
}

const LIMIT = 80;

/**
 * A field that opens a searchable list, for picking one of hundreds of entries (moves, abilities,
 * items). Only the first matches are rendered, so long lists open instantly.
 */
export const Picker = ({
  id,
  items,
  value,
  onChange,
  placeholder = "None",
  loading = false,
  clearable = true,
  className,
  label,
}: {
  id?: string;
  items: PickerItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  clearable?: boolean;
  className?: string;
  /** Accessible name of the field; the trigger reads as "Learns: Thunderbolt". */
  label: string;
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selected = items.find((item) => item.value === value);
  const matches = React.useMemo(() => {
    const needle = fold(query.trim());
    const found = needle ? items.filter((item) => fold(item.label).includes(needle)) : items;
    return found.slice(0, LIMIT);
  }, [items, query]);
  return (
    <div className={cn("relative flex", className)}>
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverPrimitive.Trigger
          id={id}
          aria-label={`${label}: ${selected?.label ?? placeholder}`}
          className={cn(
            "flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-fill px-3 text-left text-body transition-colors hover:bg-fill-strong lg:h-8 lg:rounded-lg lg:px-2.5",
            clearable && selected && "pr-11 lg:pr-8",
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-label-2")}>{selected?.label ?? placeholder}</span>
          {!(clearable && selected) && <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-label-3" />}
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            className="z-50 w-[min(var(--radix-popover-trigger-width),calc(100vw-24px))] min-w-72 overflow-hidden rounded-xl border border-hairline bg-surface shadow-float outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 [--tw-duration:150ms]"
          >
            <Command shouldFilter={false} loop>
              <div className="flex items-center gap-2 border-b border-hairline px-3">
                <Search aria-hidden className="size-4 text-label-3" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search"
                  aria-label="Search"
                  className="h-11 flex-1 bg-transparent text-body outline-none placeholder:text-label-3 lg:h-9"
                />
              </div>
              <Command.List className="max-h-[min(320px,50dvh)] overflow-y-auto overscroll-contain p-1">
                {loading && !items.length ? (
                  <div className="space-y-1 p-1">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className="skeleton h-8 rounded-md" />
                    ))}
                  </div>
                ) : (
                  <Command.Empty className="px-3 py-6 text-center text-subhead text-label-2">No matches</Command.Empty>
                )}
                {matches.map((item) => (
                  <Command.Item
                    key={item.value}
                    value={item.value}
                    onSelect={() => {
                      onChange(item.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="group/item flex min-h-11 cursor-default items-center gap-2 rounded-lg px-2.5 py-1.5 text-body aria-selected:bg-tint aria-selected:text-white lg:min-h-8"
                  >
                    <Check aria-hidden className={cn("size-4 shrink-0", item.value === value ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.label}</span>
                      {item.detail && <span className="block truncate text-footnote text-label-2 group-aria-selected/item:text-white/85">{item.detail}</span>}
                    </span>
                  </Command.Item>
                ))}
                {matches.length === LIMIT && (
                  <p className="px-3 py-2 text-center text-footnote text-label-2">Keep typing to narrow the list</p>
                )}
              </Command.List>
            </Command>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {clearable && selected && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={`Clear ${selected.label}`}
          className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-full text-label-2 hover:bg-fill-strong lg:size-6"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
};
