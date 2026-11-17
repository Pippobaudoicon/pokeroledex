import { PawPrint, Plus } from "lucide-react";
import * as React from "react";
import type * as T from "../../../shared/types";
import { button } from "@/components/kit/button";
import { Group, Row } from "@/components/kit/List";
import { RankBall, TypeDot } from "@/components/kit/Pills";
import { Sprite } from "@/components/kit/Sprite";
import { formatEnumName } from "@/lib/utils";
import { EmptyEntries, EntriesState, matches, SearchField, useCampaignEntries } from "@/pages/Campaigns/common";
import { useCampaign } from "@/pages/Campaigns/context";
import { TemplateEditor } from "@/pages/Campaigns/templates/TemplateEditor";

export const CampaignPokemonTemplates = () => {
  const { campaign } = useCampaign();
  const campaignId = campaign?.id ?? "";
  const { data, isError, refetch } = useCampaignEntries<T.PokemonTemplate>("pokemon-templates", campaignId);
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<T.PokemonTemplate | undefined>();
  const [open, setOpen] = React.useState(false);
  const edit = (template?: T.PokemonTemplate) => {
    setEditing(template);
    setOpen(true);
  };
  const templates = data
    ?.filter((template) => matches(query, template.name, template.dexCategory, ...(template.types ?? [])))
    .sort((first, second) => (first.number ?? 0) - (second.number ?? 0) || first.name.localeCompare(second.name));
  return (
    <div className="flex flex-col gap-4">
      {!data || !templates ? (
        <EntriesState isError={isError} onRetry={() => refetch()} noun="Pokémon" />
      ) : data.length === 0 ? (
        <EmptyEntries
          icon={<PawPrint />}
          title="No Pokémon yet"
          text="Pokémon you add here appear in the Pokédex and the generators when this campaign is shown."
          action={
            <button type="button" className={button({ variant: "tinted" })} onClick={() => edit()}>
              <Plus aria-hidden className="size-4" />
              Add Pokémon
            </button>
          }
        />
      ) : (
        <>
          {data.length > 6 && <SearchField value={query} onChange={setQuery} label="Search Pokémon" />}
          <Group
            title={`${templates.length} Pokémon`}
            action={
              <button type="button" className={button({ variant: "plain", size: "sm" })} onClick={() => edit()}>
                <Plus aria-hidden className="size-4" />
                Add
              </button>
            }
          >
            {templates.length === 0 && <Row title={<span className="text-label-2">No Pokémon match “{query}”.</span>} />}
            {templates.map((template) => (
              <Row
                key={template.id}
                icon={<Sprite image={template.image} set="box" className="-my-1 h-10 w-12" />}
                title={template.name}
                subtitle={
                  <span className="flex items-center gap-1.5">
                    {(template.types ?? []).map((type) => (
                      <TypeDot key={type} type={type} className="size-4.5" />
                    ))}
                    <span className="truncate">
                      #{template.dexID || template.number} · {formatEnumName(template.recommendedRank)}
                    </span>
                  </span>
                }
                value={<RankBall rank={template.recommendedRank} className="size-5" />}
                onClick={() => edit(template)}
              />
            ))}
          </Group>
        </>
      )}
      <TemplateEditor campaignId={campaignId} template={editing} open={open} onOpenChange={setOpen} />
    </div>
  );
};
