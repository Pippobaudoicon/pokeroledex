import { type QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { FaPenToSquare, FaPlus, FaTrash } from "react-icons/fa6";
import { v4 } from "uuid";
import type * as T from "../../../shared/types";
import {
  fetchMovesControllerFindAllByCampaign,
  useMovesControllerCreate,
  useMovesControllerRemove,
  useMovesControllerUpdate,
} from "@/api/components";
import { useApiContext } from "@/api/context";
import { MoveCategory, MoveTarget, PokemonType } from "@/api/schemas";
import { Combobox } from "@/components/Combobox";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MoveCategoryBadge } from "@/components/MoveCategory";
import { Text } from "@/components/Text";
import { TypeBadge } from "@/components/TypeBadge";
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

interface MoveFormData {
  name: string;
  type: PokemonType;
  category: MoveCategory;
  target: MoveTarget;
  damage1: string;
  damage2: string;
  damagePower: string;
  accuracy1: string;
  accuracy2: string;
  effect: string;
  description: string;
}

const emptyMove = (): MoveFormData => ({
  name: "",
  type: PokemonType.NORMAL,
  category: MoveCategory.PHYSICAL,
  target: MoveTarget.FOE,
  damage1: "",
  damage2: "",
  damagePower: "0",
  accuracy1: "",
  accuracy2: "",
  effect: "",
  description: "",
});

/** The first required field that is blank, if any. */
const missingField = (form: MoveFormData) => {
  if (form.name.trim() === "") return "Name";
  if (form.description.trim() === "") return "Description";
  if (form.effect.trim() === "") return "Effect";
  return undefined;
};

const invalidateMoves = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.includes("moves");
    },
  });

const typeItems = Object.values(PokemonType).map((type) => ({
  label: type,
  value: type.toLowerCase(),
}));
const categoryItems = Object.values(MoveCategory).map((category) => ({
  label: category,
  value: category.toLowerCase(),
}));
const targetItems = Object.values(MoveTarget).map((target) => ({
  label: target.replace(/_/g, " "),
  value: target.toLowerCase(),
}));

const MoveForm = ({
  formData,
  onChange,
}: {
  formData: MoveFormData;
  onChange: (formData: MoveFormData) => void;
}) => {
  const setField = <K extends keyof MoveFormData>(
    key: K,
    value: MoveFormData[K],
  ) => {
    onChange({ ...formData, [key]: value });
  };
  // The Combobox reports "" when the current value is picked again; that "" is stored as-is.
  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="flex flex-col gap-4 p-1">
        <div className="space-y-2">
          <Text font="font-move" className="text-sm font-medium">
            Name *
          </Text>
          <Input
            placeholder="Enter move name"
            value={formData.name}
            onChange={(event) => {
              setField("name", event.target.value);
            }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Type *
            </Text>
            <Combobox
              items={typeItems}
              value={formData.type.toLowerCase()}
              onChange={(value) => {
                setField("type", value.toUpperCase() as PokemonType);
              }}
              placeholder="Select type"
            />
          </div>
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Category *
            </Text>
            <Combobox
              items={categoryItems}
              value={formData.category.toLowerCase()}
              onChange={(value) => {
                setField("category", value.toUpperCase() as MoveCategory);
              }}
              placeholder="Select category"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Text font="font-move" className="text-sm font-medium">
            Target *
          </Text>
          <Combobox
            items={targetItems}
            value={formData.target.toLowerCase()}
            onChange={(value) => {
              setField("target", value.toUpperCase() as MoveTarget);
            }}
            placeholder="Select target"
          />
        </div>
        <div className="space-y-2">
          <Text font="font-move" className="text-sm font-medium">
            Power
          </Text>
          <Input
            placeholder="0"
            value={formData.damagePower}
            onChange={(event) => {
              setField("damagePower", event.target.value);
            }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Damage 1
            </Text>
            <Input
              placeholder="e.g., Strength"
              value={formData.damage1}
              onChange={(event) => {
                setField("damage1", event.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Damage 2
            </Text>
            <Input
              placeholder="E.g., Brawl"
              value={formData.damage2}
              onChange={(event) => {
                setField("damage2", event.target.value);
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Accuracy 1
            </Text>
            <Input
              placeholder="e.g., Dexterity"
              value={formData.accuracy1}
              onChange={(event) => {
                setField("accuracy1", event.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Accuracy 2
            </Text>
            <Input
              placeholder="e.g., Brawl"
              value={formData.accuracy2}
              onChange={(event) => {
                setField("accuracy2", event.target.value);
              }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Text font="font-move" className="text-sm font-medium">
            Description *
          </Text>
          <Textarea
            placeholder="Enter move description"
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
            placeholder="Enter move effect"
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

const CreateMoveDialog = ({ trigger }: { trigger: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState(emptyMove());
  const { campaign } = useCampaign();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: createMove, isPending } = useMovesControllerCreate({
    onSuccess: () => {
      toast({
        title: "Move Created",
        description: `${formData.name} has been created successfully.`,
      });
      invalidateMoves(queryClient);
      setOpen(false);
      setFormData(emptyMove());
    },
    onError: (error) => {
      toast({
        title: "Failed to create Move",
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
    // Sent exactly as the hosted build did: `_id` and capitalised `Category`
    // (the Worker maps `Category` to `category`). A non-literal body skips
    // TypeScript's excess-property check for those two keys.
    const body = {
      _id: v4(),
      campaignId: campaign.id,
      name: formData.name.trim(),
      type: formData.type,
      Category: formData.category,
      target: formData.target as T.MoveTarget,
      damage1: formData.damage1.trim(),
      damage2: formData.damage2.trim(),
      damagePower: formData.damagePower.trim(),
      accuracy1: formData.accuracy1.trim(),
      accuracy2: formData.accuracy2.trim(),
      effect: formData.effect.trim(),
      description: formData.description.trim(),
      attributes: {},
      addedEffects: {},
    };
    createMove({ body });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Move</DialogTitle>
          <DialogDescription>
            Create a new custom move for this campaign.
          </DialogDescription>
        </DialogHeader>
        <MoveForm formData={formData} onChange={setFormData} />
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

const EditMoveDialog = ({
  trigger,
  move,
}: {
  trigger: React.ReactNode;
  move: T.Move;
}) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState(emptyMove());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: updateMove, isPending } = useMovesControllerUpdate({
    onSuccess: () => {
      toast({
        title: "Move Updated",
        description: `${formData.name} updated successfully.`,
      });
      invalidateMoves(queryClient);
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update Move",
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
      name: move.name,
      type: move.type,
      category: move.category,
      target: move.target,
      damage1: move.damage1,
      damage2: move.damage2,
      damagePower: move.damagePower?.toString() ?? "0",
      accuracy1: move.accuracy1,
      accuracy2: move.accuracy2,
      effect: move.effect,
      description: move.description,
    });
  }, [open, move]);

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
    updateMove({
      body: {
        id: move.id,
        name: formData.name.trim(),
        type: formData.type,
        category: formData.category,
        target: formData.target as T.MoveTarget,
        damage1: formData.damage1.trim(),
        damage2: formData.damage2.trim(),
        damagePower: formData.damagePower.trim(),
        accuracy1: formData.accuracy1.trim(),
        accuracy2: formData.accuracy2.trim(),
        effect: formData.effect.trim(),
        description: formData.description.trim(),
      },
    });
  };
  const isValid = missingField(formData) === undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Move</DialogTitle>
          <DialogDescription>Update the move details.</DialogDescription>
        </DialogHeader>
        <MoveForm formData={formData} onChange={setFormData} />
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

const DeleteMoveDialog = ({
  children,
  move,
}: {
  children: React.ReactNode;
  move: T.Move;
}) => {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: removeMove, isPending } = useMovesControllerRemove({
    onSuccess: () => {
      toast({
        title: "Move deleted",
        description: `${move.name} has been deleted.`,
      });
      invalidateMoves(queryClient);
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete Move",
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
            {move.name}?
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <Button
          variant="red"
          onClick={() => {
            removeMove({ pathParams: { id: move.id } });
          }}
          disabled={isPending}
        >
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export const CampaignMoves = () => {
  const { campaign } = useCampaign();
  const { fetcherOptions } = useApiContext();
  const campaignId = campaign?.id ?? "";
  const { data: moves, isLoading } = useQuery({
    queryKey: ["moves", "all", campaignId, { includeCore: false }],
    queryFn: () =>
      fetchMovesControllerFindAllByCampaign({
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

  const sortedMoves = (moves ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex flex-row items-center justify-between">
        <Text size="text-2xl" className="font-bold">
          Moves
        </Text>
        <CreateMoveDialog
          trigger={
            <Button variant="green" size="sm">
              <FaPlus size={20} className="mr-1" />
              Add Move
            </Button>
          }
        />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Damage</TableHead>
              <TableHead>Accuracy</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMoves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Text color="text-pokerole-black-light">
                    {'No moves yet. Click "Add Move" to create one.'}
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              sortedMoves.map((move) => (
                <TableRow key={move.id}>
                  <TableCell>{move.name}</TableCell>
                  <TableCell>
                    <TypeBadge type={move.type} />
                  </TableCell>
                  <TableCell>
                    <MoveCategoryBadge category={move.category} />
                  </TableCell>
                  <TableCell>
                    {move.damage1}
                    {move.damage2 !== "" ? ` / ${move.damage2}` : ""}
                  </TableCell>
                  <TableCell>
                    {move.accuracy1}
                    {move.accuracy2 !== "" ? ` / ${move.accuracy2}` : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-row justify-end">
                      <EditMoveDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <FaPenToSquare size={16} />
                          </Button>
                        }
                        move={move}
                      />
                      <DeleteMoveDialog move={move}>
                        <Button variant="ghost" size="icon">
                          <FaTrash size={16} />
                        </Button>
                      </DeleteMoveDialog>
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
