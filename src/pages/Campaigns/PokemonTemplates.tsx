import { useQuery } from "@tanstack/react-query";
import { FaPenToSquare, FaPlus, FaTrash } from "react-icons/fa6";
import { fetchPokemonTemplatesControllerFindAllByCampaign } from "@/api/components";
import { useApiContext } from "@/api/context";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { RankIcon } from "@/components/RankIcon";
import { Text } from "@/components/Text";
import { TypeBadge } from "@/components/TypeBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCampaign } from "@/pages/Campaigns/context";
import {
  CreatePokemonTemplateDialog,
  DeletePokemonTemplateDialog,
  EditPokemonTemplateDialog,
} from "@/pages/Campaigns/templates/dialogs";

export const CampaignPokemonTemplates = () => {
  const { campaign } = useCampaign();
  const { fetcherOptions } = useApiContext();
  const { data, isLoading } = useQuery({
    queryKey: ["pokemon-templates", "all", campaign?.id ?? "", { includeCore: false }],
    queryFn: () =>
      fetchPokemonTemplatesControllerFindAllByCampaign({
        ...fetcherOptions,
        pathParams: { id: campaign?.id ?? "" },
        body: { includeCore: false },
      }),
    enabled: !!campaign?.id,
  });
  if (campaign === undefined) return <div>No campaign selected</div>;
  if (isLoading)
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  const templates = (data ?? []).slice().sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex flex-row items-center justify-between">
        <Text size="text-2xl" className="font-bold">
          Pokemon
        </Text>
        <CreatePokemonTemplateDialog
          trigger={
            <Button variant="green" size="sm">
              <FaPlus size={20} className="mr-1" />
              Add Pokemon Template
            </Button>
          }
        />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Types</TableHead>
              <TableHead>Recommended Rank</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Text color="text-pokerole-black-light">
                    No Pokemon templates yet. Click "Add Pokemon Template" to create one.
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>{template.number}</TableCell>
                  <TableCell>{template.name}</TableCell>
                  <TableCell className="flex flex-row gap-1">
                    {template.types?.map((type) => (
                      <TypeBadge key={type} type={type} className="flex-1" />
                    ))}
                  </TableCell>
                  <TableCell>
                    <div className="max-h-8 max-w-8">
                      <RankIcon rank={template.recommendedRank} size="md" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-row justify-end">
                      <EditPokemonTemplateDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <FaPenToSquare size={16} />
                          </Button>
                        }
                        pokemonTemplate={template}
                      />
                      <DeletePokemonTemplateDialog pokemonTemplate={template}>
                        <Button variant="ghost" size="icon">
                          <FaTrash size={16} />
                        </Button>
                      </DeletePokemonTemplateDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
