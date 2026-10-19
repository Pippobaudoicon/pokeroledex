import { ChevronRight } from "lucide-react";
import type * as T from "../../../shared/types";
import { usePokemonTemplatesControllerFindMany } from "@/api/components";
import { Group } from "@/components/kit/List";
import { TypePill } from "@/components/kit/Pills";
import { Sheet } from "@/components/kit/Sheet";
import { Sprite } from "@/components/kit/Sprite";
import { usePokemon } from "@/components/pokemon-sheet/context";
import { useToast } from "@/hooks/use-toast";
import { formatEnumName } from "@/lib/utils";

const condition = (evolution: T.Evolution) =>
  [formatEnumName(evolution.kind), evolution.item ?? evolution.special ?? (evolution.value !== undefined ? String(evolution.value) : undefined)].filter(Boolean).join(" · ");

/** Pick the species or form to change into; the sheet keeps its stats and moves. */
export const EvolutionSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { updatedPokemon, updatePokemon } = usePokemon();
  const { toast } = useToast();
  const evolutions = updatedPokemon?.pokemonTemplate.evolutions ?? [];
  const { data: templates } = usePokemonTemplatesControllerFindMany({ pathParams: { ids: evolutions.map((evolution) => evolution.targetId) } });
  const evolve = (template: T.PokemonTemplate) => {
    updatePokemon({ pokemonTemplate: template });
    onOpenChange(false);
    toast({ title: `Now a ${template.name}` });
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Evolve or change form" description="The sheet keeps its stats, moves and HP." initialExpanded>
      <div className="flex flex-col gap-6 p-4">
        {(["TO", "FROM"] as const).map((direction) => {
          const list = evolutions.filter((evolution) => evolution.type === direction);
          if (list.length === 0) return null;
          return (
            <Group key={direction} title={direction === "TO" ? "Evolves into" : "Evolves from"}>
              {list.map((evolution, index) => {
                const template = templates?.find((candidate) => candidate.id === evolution.targetId);
                return template ? (
                  <button
                    key={`${evolution.targetId}-${index}`}
                    type="button"
                    onClick={() => evolve(template)}
                    className="group/row flex w-full items-center gap-3 pl-3 text-left transition-colors hover:bg-raised active:bg-fill"
                  >
                    <Sprite image={template.image} set="book" className="size-14" />
                    <span className="flex min-h-18 min-w-0 flex-1 items-center gap-2 border-b border-hairline py-2 pr-3 group-last/row:border-b-0">
                      <span className="min-w-0 flex-1">
                        <span className="block text-body font-semibold">{template.name}</span>
                        <span className="block text-footnote text-label-2">{condition(evolution)}</span>
                        <span className="mt-1 flex gap-1">
                          {template.types.map((type) => (
                            <TypePill key={type} type={type} size="sm" />
                          ))}
                        </span>
                      </span>
                      <ChevronRight aria-hidden className="size-4 text-label-3" />
                    </span>
                  </button>
                ) : (
                  <div key={`${evolution.targetId}-${index}`} className="flex h-18 items-center gap-3 px-3">
                    <div className="skeleton size-14 rounded-xl" />
                    <div className="skeleton h-4 w-32 rounded" />
                  </div>
                );
              })}
            </Group>
          );
        })}
      </div>
    </Sheet>
  );
};
