import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Extra props are passed to the Popover root. */
export interface MultiSelectProps<T extends string = string>
  extends React.ComponentProps<typeof Popover> {
  options: { label: React.ReactNode; value: T }[];
  selected: T[];
  onChange: (selected: T[]) => void;
  placeholder?: string;
  className?: string;
  /** When set, picking more shows a toast instead. */
  maxSelected?: number;
  exceedMessage?: string;
}

export function MultiSelect<T extends string = string>({
  options,
  selected,
  onChange,
  placeholder = "Select ...",
  className,
  maxSelected,
  exceedMessage,
  ...props
}: MultiSelectProps<T>) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const unselect = (value: T) => {
    onChange(selected.filter((other) => other !== value));
  };
  return (
    <Popover open={open} onOpenChange={setOpen} {...props}>
      <PopoverTrigger asChild={true}>
        <Button
          variant="white"
          role="combobox"
          aria-expanded={open}
          className={cn(
            `w-full justify-between ${selected.length > 1 ? "h-full" : "h-10"}`,
            className,
          )}
          onClick={() => {
            setOpen(!open);
          }}
        >
          <div className="flex gap-1 flex-wrap">
            {selected.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {selected.map((value) => (
              <Badge
                key={value}
                variant="secondary"
                className=""
                onClick={() => {
                  unselect(value);
                }}
              >
                {options.find((option) => option.value === value)?.label}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") unselect(value);
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={() => {
                    unselect(value);
                  }}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search ..." />
          <CommandEmpty>No item found.</CommandEmpty>
          <ScrollArea className="h-64" blockParentScroll={true}>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    if (
                      maxSelected !== undefined &&
                      !selected.includes(option.value) &&
                      selected.length >= maxSelected
                    ) {
                      toast({
                        title: "Selection limit",
                        description: exceedMessage ?? `You can select at most ${maxSelected} items.`,
                      });
                      setOpen(true);
                      return;
                    }
                    onChange(
                      selected.includes(option.value)
                        ? selected.filter((other) => other !== option.value)
                        : [...selected, option.value],
                    );
                    setOpen(true);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
