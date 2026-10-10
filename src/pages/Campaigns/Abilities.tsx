import { type QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { FaPenToSquare, FaPlus, FaTrash } from "react-icons/fa6";
import type * as T from "../../../shared/types";
import {
  fetchAbilitiesControllerFindAllByCampaign,
  useAbilitiesControllerCreate,
  useAbilitiesControllerRemove,
  useAbilitiesControllerUpdate,
} from "@/api/components";
import { useApiContext } from "@/api/context";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCampaign } from "@/pages/Campaigns/context";

interface AbilityFormData {
  name: string;
  description: string;
  effect: string;
}

const emptyAbility = (): AbilityFormData => ({
  name: "",
  description: "",
  effect: "",
});

/** The first required field that is blank, if any. */
const missingField = (form: AbilityFormData) => {
  if (form.name.trim() === "") return "Name";
  if (form.description.trim() === "") return "Description";
  if (form.effect.trim() === "") return "Effect";
  return undefined;
};

const invalidateAbilities = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.includes("abilities");
    },
  });

const AbilityForm = ({
  formData,
  onChange,
}: {
  formData: AbilityFormData;
  onChange: (formData: AbilityFormData) => void;
}) => {
  const setField = (key: keyof AbilityFormData, value: string) => {
    onChange({ ...formData, [key]: value });
  };
  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="flex flex-col gap-4 p-1">
        <div className="space-y-2">
          <Text font="font-move" className="text-sm font-medium">
            Name *
          </Text>
          <Input
            placeholder="Enter ability name"
            value={formData.name}
            onChange={(event) => {
              setField("name", event.target.value);
            }}
          />
        </div>
        <div className="space-y-2">
          <Text font="font-move" className="text-sm font-medium">
            Description *
          </Text>
          <Textarea
            placeholder="Enter ability description"
            value={formData.description}
            onChange={(event) => {
              setField("description", event.target.value);
            }}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Text font="font-move" className="text-sm font-medium">
            Effect *
          </Text>
          <Textarea
            placeholder="Enter ability effect"
            value={formData.effect}
            onChange={(event) => {
              setField("effect", event.target.value);
            }}
            rows={4}
          />
        </div>
      </div>
    </ScrollArea>
  );
};

const CreateAbilityDialog = ({ trigger }: { trigger: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState(emptyAbility());
  const { campaign } = useCampaign();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: createAbility, isPending } = useAbilitiesControllerCreate({
    onSuccess: () => {
      toast({
        title: "Ability Created",
        description: `${formData.name} has been created successfully.`,
      });
      invalidateAbilities(queryClient);
      setOpen(false);
      setFormData(emptyAbility());
    },
    onError: (error) => {
      toast({
        title: "Failed to create Ability",
        // apiFetch errors carry no payload, so this always falls back.
        description:
          (error as Partial<T.ApiError>)?.payload ?? "An error occurred",
        variant: "destructive",
      });
    },
  });
  const isValid = missingField(formData) === undefined;

  const handleCreate = () => {
    if (campaign === undefined) return;
    const missing = missingField(formData);
    if (missing !== undefined) {
      toast({
        title: "Validation Error",
        description: `${missing} is required.`,
        variant: "destructive",
      });
      return;
    }
    createAbility({
      body: {
        campaignId: campaign.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        effect: formData.effect.trim(),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Ability</DialogTitle>
          <DialogDescription>
            Create a new custom ability for this campaign.
          </DialogDescription>
        </DialogHeader>
        <AbilityForm formData={formData} onChange={setFormData} />
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="green"
            onClick={handleCreate}
            disabled={isPending || !isValid}
          >
            {isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EditAbilityDialog = ({
  trigger,
  ability,
}: {
  trigger: React.ReactNode;
  ability: T.Ability;
}) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState(emptyAbility());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: updateAbility, isPending } = useAbilitiesControllerUpdate({
    onSuccess: () => {
      toast({
        title: "Ability Updated",
        description: `${formData.name} updated successfully.`,
      });
      invalidateAbilities(queryClient);
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update Ability",
        // apiFetch errors carry no payload, so this always falls back.
        description:
          (error as Partial<T.ApiError>)?.payload ?? "An error occurred",
        variant: "destructive",
      });
    },
  });

  React.useEffect(() => {
    if (!open) return;
    setFormData({
      name: ability.name ?? "",
      description: ability.description ?? "",
      effect: ability.effect ?? "",
    });
  }, [open, ability]);

  const handleUpdate = () => {
    const missing = missingField(formData);
    if (missing !== undefined) {
      toast({
        title: "Validation Error",
        description: `${missing} is required.`,
        variant: "destructive",
      });
      return;
    }
    updateAbility({
      body: {
        id: ability.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        effect: formData.effect.trim(),
      },
    });
  };
  const isValid = missingField(formData) === undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Ability</DialogTitle>
          <DialogDescription>Update the ability details.</DialogDescription>
        </DialogHeader>
        <AbilityForm formData={formData} onChange={setFormData} />
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="green"
            onClick={handleUpdate}
            disabled={isPending || !isValid}
          >
            {isPending ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteAbilityDialog = ({
  children,
  ability,
}: {
  children: React.ReactNode;
  ability: T.Ability;
}) => {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: removeAbility, isPending } = useAbilitiesControllerRemove({
    onSuccess: () => {
      toast({
        title: "Ability deleted",
        description: `${ability.name} has been deleted.`,
      });
      invalidateAbilities(queryClient);
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete Ability",
        // apiFetch errors carry no payload, so this always falls back.
        description:
          (error as Partial<T.ApiError>)?.payload ?? "An error occurred",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true}>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {"Are you sure you want to delete "}
            {ability.name}?
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <Button
          variant="red"
          onClick={() => {
            removeAbility({ pathParams: { id: ability.id } });
          }}
          disabled={isPending}
        >
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export const CampaignAbilities = () => {
  const { campaign } = useCampaign();
  const { fetcherOptions } = useApiContext();
  const campaignId = campaign?.id ?? "";
  const { data: abilities, isLoading } = useQuery({
    queryKey: ["abilities", "all", campaignId, { includeCore: false }],
    queryFn: () =>
      fetchAbilitiesControllerFindAllByCampaign({
        ...fetcherOptions,
        pathParams: { id: campaignId },
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

  const sortedAbilities = (abilities ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex flex-row items-center justify-between">
        <Text size="text-2xl" className="font-bold">
          Abilities
        </Text>
        <CreateAbilityDialog
          trigger={
            <Button variant="green" size="sm">
              <FaPlus size={20} className="mr-1" />
              Add Ability
            </Button>
          }
        />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Effect</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAbilities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Text color="text-pokerole-black-light">
                    {'No abilities yet. Click "Add Ability" to create one.'}
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              sortedAbilities.map((ability) => (
                <TableRow key={ability.id}>
                  <TableCell>{ability.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {ability.description}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {ability.effect}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-row justify-end">
                      <EditAbilityDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <FaPenToSquare size={16} />
                          </Button>
                        }
                        ability={ability}
                      />
                      <DeleteAbilityDialog ability={ability}>
                        <Button variant="ghost" size="icon">
                          <FaTrash size={16} />
                        </Button>
                      </DeleteAbilityDialog>
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
