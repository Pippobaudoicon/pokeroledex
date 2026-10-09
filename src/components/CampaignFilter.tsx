import * as React from "react";
import type { PokemonTemplateSummary } from "../../shared/types";
import { useAuth } from "@/api/client";
import { usePokemonTemplatesControllerFindFiltered } from "@/api/components";
import { Combobox } from "@/components/Combobox";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";

export interface CampaignFilterProps {
  /** Called with the selected template's id, or undefined when cleared. */
  onChange?: (pokemonTemplateId: string | undefined) => void;
  className?: string;
}

/** Combobox of the Pokemon templates visible under the current campaign filter. */
export const CampaignFilter = ({ onChange, className }: CampaignFilterProps) => {
  const { state } = useCampaignFilter();
  const { isAuthenticated } = useAuth();
  const { mutate, data: templates } = usePokemonTemplatesControllerFindFiltered();
  React.useEffect(() => {
    mutate({
      body: isAuthenticated
        ? {
            campaignIds: state.campaignIds,
            includeCore: state.includeCore,
          }
        : {
            campaignIds: [],
            includeCore: true,
          },
    });
  }, [mutate, isAuthenticated, state.campaignIds, state.includeCore]);
  const [selected, setSelected] = React.useState<PokemonTemplateSummary | null>(null);
  const items = React.useMemo(
    () =>
      templates == null
        ? []
        : templates
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((template) => ({
              label: <span>{template.name}</span>,
              value: template.name.toLowerCase(),
              searchValue: template.name,
            })),
    [templates],
  );
  const select = (value: string) => {
    let template =
      templates?.find((candidate) => candidate.name.toLowerCase() === value) ?? null;
    if (template === selected) template = null;
    setSelected(template);
    onChange?.(template?.id);
  };
  return (
    <Combobox
      items={items}
      value={selected?.name.toLowerCase() ?? ""}
      onChange={select}
      className={className}
    />
  );
};
