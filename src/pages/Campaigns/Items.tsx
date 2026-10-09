// @ts-nocheck
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { FaPenToSquare, FaPlus, FaTrash } from "react-icons/fa6";
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
const emptyItem = () => ({
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
const ItemForm = ({ formData: e, onChange: t }) => {
  const n = (s, i) => {
      t({
        ...e,
        [s]: i,
      });
    },
    r = Object.values(ItemCategory).map((s) => ({
      label: s.replace(/_/g, " "),
      value: s.toLowerCase(),
    })),
    o = Object.values(ItemPocket).map((s) => ({
      label: s.replace(/_/g, " "),
      value: s.toLowerCase(),
    }));
  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="flex flex-col gap-4 p-1">
        <div className="space-y-2">
          <Text font="font-move" className="text-sm font-medium">
            Name *
          </Text>
          <Input
            placeholder="Enter item name"
            value={e.name}
            onChange={(s) => {
              n("name", s.target.value);
            }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Category *
            </Text>
            <Combobox
              items={r}
              value={e.category.toLowerCase()}
              onChange={(s) => {
                n("category", s.toUpperCase());
              }}
              placeholder="Select category"
            />
          </div>
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Pocket *
            </Text>
            <Combobox
              items={o}
              value={e.pocket.toLowerCase()}
              onChange={(s) => {
                n("pocket", s.toUpperCase());
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
            value={e.description}
            onChange={(s) => {
              n("description", s.target.value);
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
              value={e.trainerPrice}
              onChange={(s) => {
                n("trainerPrice", s.target.value);
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
              value={e.pmdPrice}
              onChange={(s) => {
                n("pmdPrice", s.target.value);
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
            value={e.image}
            onChange={(s) => {
              n("image", s.target.value);
            }}
          />
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="oneUse"
              checked={e.oneUse}
              onCheckedChange={(s) => {
                n("oneUse", s === true);
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
              checked={e.pmd}
              onCheckedChange={(s) => {
                n("pmd", s === true);
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
const CreateItemDialog = ({ trigger: e }) => {
  const [t, n] = React.useState(false),
    [r, o] = React.useState(emptyItem()),
    { campaign: s } = useCampaign(),
    { toast: i } = useToast(),
    l = useQueryClient(),
    { mutate: c, isPending: u } = useItemsControllerCreate({
      onSuccess: () => {
        i({
          title: "Item Created",
          description: `${r.name} has been created successfully.`,
        }),
          l.invalidateQueries({
            predicate: (m) => {
              var v, g;
              return (
                ((g = (v = m.queryKey[0]) == null ? undefined : v.includes) ==
                null
                  ? undefined
                  : g.call(v, "items")) ?? false
              );
            },
          }),
          n(false),
          o(emptyItem());
      },
      onError: (m) => {
        i({
          title: "Failed to create Item",
          description:
            (m == null ? undefined : m.payload) ?? "An error occurred",
          variant: "destructive",
        });
      },
    }),
    f = !!u,
    p = () => {
      if (s !== undefined) {
        if (r.name.trim() === "") {
          i({
            title: "Validation Error",
            description: "Name is required.",
            variant: "destructive",
          });
          return;
        }
        c({
          body: {
            name: r.name.trim(),
            campaignId: s.id,
            category: r.category,
            pocket: r.pocket,
            source: "custom",
            description: r.description.trim(),
            oneUse: r.oneUse,
            PMD: r.pmd,
            trainerPrice: r.trainerPrice !== "" ? Number(r.trainerPrice) : 0,
            PMDPrice: r.pmdPrice !== "" ? Number(r.pmdPrice) : 0,
            image: r.image.trim(),
          },
        });
      }
    },
    h = r.name.trim() !== "";
  return (
    <Dialog open={t} onOpenChange={n}>
      <DialogTrigger asChild={true}>{e}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>
            Create a new custom item for this campaign.
          </DialogDescription>
        </DialogHeader>
        <ItemForm formData={r} onChange={o} />
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              n(false);
            }}
            disabled={u}
          >
            Cancel
          </Button>
          <Button variant="green" onClick={p} disabled={f || !h}>
            {f ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const EditItemDialog = ({ trigger: e, item: t }) => {
  const [n, r] = React.useState(false),
    [o, s] = React.useState({
      name: "",
      category: ItemCategory.BATTLE_ITEM,
      pocket: ItemPocket.HELD_ITEMS,
      description: "",
      oneUse: false,
      pmd: false,
      trainerPrice: "",
      pmdPrice: "",
      image: "",
    }),
    { toast: i } = useToast(),
    l = useQueryClient(),
    { mutate: c, isPending: u } = useItemsControllerUpdate({
      onSuccess: () => {
        i({
          title: "Item Updated",
          description: `${o.name} updated successfully.`,
        }),
          l.invalidateQueries({
            predicate: (m) => {
              var v, g;
              return (
                ((g = (v = m.queryKey[0]) == null ? undefined : v.includes) ==
                null
                  ? undefined
                  : g.call(v, "items")) ?? false
              );
            },
          }),
          r(false);
      },
      onError: (m) => {
        i({
          title: "Failed to update Item",
          description:
            (m == null ? undefined : m.payload) ?? "An error occurred",
          variant: "destructive",
        });
      },
    }),
    f = !!u;
  React.useEffect(() => {
    n &&
      s({
        name: t.name,
        category: t.category ?? ItemCategory.BATTLE_ITEM,
        pocket: t.pocket ?? ItemPocket.HELD_ITEMS,
        description: t.description ?? "",
        oneUse: t.oneUse ?? false,
        pmd: t.PMD ?? false,
        trainerPrice:
          t.trainerPrice !== undefined ? t.trainerPrice.toString() : "",
        pmdPrice: t.pmdPrice !== undefined ? t.pmdPrice.toString() : "",
        image: t.image ?? "",
      });
  }, [n, t]);
  const p = () => {
      if (o.name.trim() === "") {
        i({
          title: "Validation Error",
          description: "Name is required.",
          variant: "destructive",
        });
        return;
      }
      c({
        body: {
          id: t.id,
          name: o.name.trim(),
          category: o.category,
          pocket: o.pocket,
          description: o.description.trim(),
          oneUse: o.oneUse,
          PMD: o.pmd,
          trainerPrice: o.trainerPrice !== "" ? Number(o.trainerPrice) : 0,
          pmdPrice: o.pmdPrice !== "" ? Number(o.pmdPrice) : 0,
          image: o.image.trim(),
        },
      });
    },
    h = o.name.trim() !== "";
  return (
    <Dialog open={n} onOpenChange={r}>
      <DialogTrigger asChild={true}>{e}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>Update the item details.</DialogDescription>
        </DialogHeader>
        <ItemForm formData={o} onChange={s} />
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              r(false);
            }}
            disabled={f}
          >
            Cancel
          </Button>
          <Button variant="green" onClick={p} disabled={f || !h}>
            {f ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const DeleteItemDialog = ({ children: e, item: t }) => {
  const [n, r] = React.useState(false),
    { toast: o } = useToast(),
    s = useQueryClient(),
    { mutate: i, isPending: l } = useItemsControllerRemove({
      onSuccess: () => {
        o({
          title: "Item deleted",
          description: `${t.name} has been deleted.`,
        }),
          s.invalidateQueries({
            predicate: (u) => {
              var f, p;
              return (
                ((p = (f = u.queryKey[0]) == null ? undefined : f.includes) ==
                null
                  ? undefined
                  : p.call(f, "items")) ?? false
              );
            },
          }),
          r(false);
      },
      onError: (u) => {
        o({
          title: "Failed to delete Item",
          description:
            (u == null ? undefined : u.payload) ?? "An error occurred",
          variant: "destructive",
        });
      },
    }),
    c = () => {
      i({
        pathParams: {
          id: t.id,
        },
      });
    };
  return (
    <Dialog open={n} onOpenChange={r}>
      <DialogTrigger asChild={true}>{e}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {"Are you sure you want to delete "}
            {t.name}?
          </DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <Button variant="red" onClick={c} disabled={l}>
          {l ? "Deleting..." : "Delete"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
export const CampaignItems = () => {
  const { campaign: e } = useCampaign(),
    { fetcherOptions: t } = useApiContext(),
    { data: n, isLoading: r } = useItemsControllerFindAll(t, {
      enabled: !!(e != null && e.id),
    }),
    o = React.useMemo(
      () =>
        e === undefined
          ? []
          : (n ?? [])
              .filter((s) => {
                var i;
                return ((i = s.campaign) == null ? undefined : i.id) === e.id;
              })
              .slice()
              .sort((s, i) => s.name.localeCompare(i.name)),
      [n, e == null ? undefined : e.id],
    );
  return e === undefined ? (
    <div>No campaign selected</div>
  ) : r ? (
    <div className="flex justify-center py-8">
      <LoadingSpinner />
    </div>
  ) : (
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
            {o.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Text color="text-pokerole-black-light">
                    {'No items yet. Click "Add Item" to create one.'}
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              o.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>
                    {s.category !== undefined && (
                      <Badge variant="outline">
                        {s.category.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.pocket !== undefined && (
                      <Badge variant="outline">
                        {s.pocket.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.trainerPrice !== undefined ? `$${s.trainerPrice}` : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-row justify-end">
                      <EditItemDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <FaPenToSquare size={16} />
                          </Button>
                        }
                        item={s}
                      />
                      <DeleteItemDialog item={s}>
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
