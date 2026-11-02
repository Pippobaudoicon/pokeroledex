import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { FaPenToSquare, FaPlus, FaTrash } from "react-icons/fa6";
import type * as T from "../../../shared/types";
import {
  useItemsControllerCreate,
  useItemsControllerFindAll,
  useItemsControllerRemove,
  useItemsControllerUpdate,
} from "@/api/components";
import { useApiContext } from "@/api/context";
import { ItemCategory, ItemPocket } from "@/api/schemas";
import { Combobox } from "@/components/Combobox";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Text } from "@/components/Text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface ItemFormData {
  name: string;
  category: ItemCategory;
  pocket: ItemPocket;
  description: string;
  oneUse: boolean;
  pmd: boolean;
  trainerPrice: string;
  pmdPrice: string;
  image: string;
}

const emptyItem = (): ItemFormData => ({
  name: "",
  category: ItemCategory.BATTLE_ITEM,
  pocket: ItemPocket.HELD_ITEMS,
  description: "",
  oneUse: false,
  pmd: false,
  trainerPrice: "",
  pmdPrice: "",
  image: "",
});

const invalidateItems = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.includes("items");
    },
  });

const categoryItems = Object.values(ItemCategory).map((category) => ({
  label: category.replace(/_/g, " "),
  value: category.toLowerCase(),
}));
const pocketItems = Object.values(ItemPocket).map((pocket) => ({
  label: pocket.replace(/_/g, " "),
  value: pocket.toLowerCase(),
}));

const ItemForm = ({
  formData,
  onChange,
}: {
  formData: ItemFormData;
  onChange: (formData: ItemFormData) => void;
}) => {
  const setField = <K extends keyof ItemFormData>(
    key: K,
    value: ItemFormData[K],
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
            placeholder="Enter item name"
            value={formData.name}
            onChange={(event) => {
              setField("name", event.target.value);
            }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Category *
            </Text>
            <Combobox
              items={categoryItems}
              value={formData.category.toLowerCase()}
              onChange={(value) => {
                setField("category", value.toUpperCase() as ItemCategory);
              }}
              placeholder="Select category"
            />
          </div>
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Pocket *
            </Text>
            <Combobox
              items={pocketItems}
              value={formData.pocket.toLowerCase()}
              onChange={(value) => {
                setField("pocket", value.toUpperCase() as ItemPocket);
              }}
              placeholder="Select pocket"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Text font="font-move" className="text-sm font-medium">
            Description
          </Text>
          <Textarea
            placeholder="Enter item description"
            value={formData.description}
            onChange={(event) => {
              setField("description", event.target.value);
            }}
            rows={4}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Trainer Price
            </Text>
            <Input
              type="number"
              placeholder="0"
              value={formData.trainerPrice}
              onChange={(event) => {
                setField("trainerPrice", event.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              PMD Price
            </Text>
            <Input
              type="number"
              placeholder="0"
              value={formData.pmdPrice}
              onChange={(event) => {
                setField("pmdPrice", event.target.value);
              }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Text font="font-move" className="text-sm font-medium">
            Image URL
          </Text>
          <Input
            placeholder="Enter image URL (optional)"
            value={formData.image}
            onChange={(event) => {
              setField("image", event.target.value);
            }}
          />
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="oneUse"
              checked={formData.oneUse}
              onCheckedChange={(checked) => {
                setField("oneUse", checked === true);
              }}
            />
            <label
              htmlFor="oneUse"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              One Use
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="pmd"
              checked={formData.pmd}
              onCheckedChange={(checked) => {
                setField("pmd", checked === true);
              }}
            />
            <label
              htmlFor="pmd"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              PMD
            </label>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

const CreateItemDialog = ({ trigger }: { trigger: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState(emptyItem());
  const { campaign } = useCampaign();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: createItem, isPending } = useItemsControllerCreate({
    onSuccess: () => {
      toast({
        title: "Item Created",
        description: `${formData.name} has been created successfully.`,
      });
      invalidateItems(queryClient);
      setOpen(false);
      setFormData(emptyItem());
    },
    onError: (error) => {
      toast({
        title: "Failed to create Item",
        // apiFetch errors carry no payload, so this always falls back.
        description:
          (error as Partial<T.ApiError>)?.payload ?? "An error occurred",
        variant: "destructive",
      });
    },
  });
  const isValid = formData.name.trim() !== "";

  const handleCreate = () => {
    if (campaign === undefined) return;
    if (formData.name.trim() === "") {
      toast({
        title: "Validation Error",
        description: "Name is required.",
        variant: "destructive",
      });
      return;
    }
    // Sent with a capitalised `PMDPrice` (the Worker
    // maps it to `pmdPrice`). A non-literal body skips TypeScript's
    // excess-property check for that key.
    const body = {
      name: formData.name.trim(),
      campaignId: campaign.id,
      category: formData.category,
      pocket: formData.pocket,
      source: "custom",
      description: formData.description.trim(),
      oneUse: formData.oneUse,
      PMD: formData.pmd,
      trainerPrice:
        formData.trainerPrice !== "" ? Number(formData.trainerPrice) : 0,
      PMDPrice: formData.pmdPrice !== "" ? Number(formData.pmdPrice) : 0,
      image: formData.image.trim(),
    };
    createItem({ body });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>
            Create a new custom item for this campaign.
          </DialogDescription>
        </DialogHeader>
        <ItemForm formData={formData} onChange={setFormData} />
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

const EditItemDialog = ({
  trigger,
  item,
}: {
  trigger: React.ReactNode;
  item: T.Item;
}) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState(emptyItem());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: updateItem, isPending } = useItemsControllerUpdate({
    onSuccess: () => {
      toast({
        title: "Item Updated",
        description: `${formData.name} updated successfully.`,
      });
      invalidateItems(queryClient);
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update Item",
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
      name: item.name,
      category: item.category ?? ItemCategory.BATTLE_ITEM,
      pocket: item.pocket ?? ItemPocket.HELD_ITEMS,
      description: item.description ?? "",
      oneUse: item.oneUse ?? false,
      pmd: item.PMD ?? false,
      // Only `undefined` is checked: a null price throws here.
      trainerPrice:
        item.trainerPrice !== undefined ? item.trainerPrice!.toString() : "",
      pmdPrice: item.pmdPrice !== undefined ? item.pmdPrice!.toString() : "",
      image: item.image ?? "",
    });
  }, [open, item]);

  const handleUpdate = () => {
    if (formData.name.trim() === "") {
      toast({
        title: "Validation Error",
        description: "Name is required.",
        variant: "destructive",
      });
      return;
    }
    updateItem({
      body: {
        id: item.id,
        name: formData.name.trim(),
        category: formData.category,
        pocket: formData.pocket,
        description: formData.description.trim(),
        oneUse: formData.oneUse,
        PMD: formData.pmd,
        trainerPrice:
          formData.trainerPrice !== "" ? Number(formData.trainerPrice) : 0,
        pmdPrice: formData.pmdPrice !== "" ? Number(formData.pmdPrice) : 0,
        image: formData.image.trim(),
      },
    });
  };
  const isValid = formData.name.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true}>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>Update the item details.</DialogDescription>
        </DialogHeader>
        <ItemForm formData={formData} onChange={setFormData} />
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

const DeleteItemDialog = ({
  children,
  item,
}: {
  children: React.ReactNode;
  item: T.Item;
}) => {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: removeItem, isPending } = useItemsControllerRemove({
    onSuccess: () => {
      toast({
        title: "Item deleted",
        description: `${item.name} has been deleted.`,
      });
      invalidateItems(queryClient);
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete Item",
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
            {item.name}?
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <Button
          variant="red"
          onClick={() => {
            removeItem({ pathParams: { id: item.id } });
          }}
          disabled={isPending}
        >
          {isPending ? "Deleting..." : "Delete"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export const CampaignItems = () => {
  const { campaign } = useCampaign();
  const { fetcherOptions } = useApiContext();
  // Fetches every item (fetcher options passed as the variables) and filters client-side.
  const { data: items, isLoading } = useItemsControllerFindAll(fetcherOptions, {
    enabled: !!campaign?.id,
  });
  const campaignItems = React.useMemo(
    () =>
      campaign === undefined
        ? []
        : (items ?? [])
            .filter((item) => item.campaign?.id === campaign.id)
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name)),
    [items, campaign?.id],
  );

  if (campaign === undefined) return <div>No campaign selected</div>;
  if (isLoading)
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex flex-row items-center justify-between">
        <Text size="text-2xl" className="font-bold">
          Items
        </Text>
        <CreateItemDialog
          trigger={
            <Button variant="green" size="sm">
              <FaPlus size={20} className="mr-1" />
              Add Item
            </Button>
          }
        />
      </div>
      <div className="rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Pocket</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaignItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Text color="text-pokerole-black-light">
                    {'No items yet. Click "Add Item" to create one.'}
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              campaignItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>
                    {/* Only `undefined` is checked: a null category throws. */}
                    {item.category !== undefined && (
                      <Badge variant="outline">
                        {item.category!.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.pocket !== undefined && (
                      <Badge variant="outline">
                        {item.pocket.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.trainerPrice !== undefined
                      ? `$${item.trainerPrice}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-row justify-end">
                      <EditItemDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <FaPenToSquare size={16} />
                          </Button>
                        }
                        item={item}
                      />
                      <DeleteItemDialog item={item}>
                        <Button variant="ghost" size="icon">
                          <FaTrash size={16} />
                        </Button>
                      </DeleteItemDialog>
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
