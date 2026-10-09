// @ts-nocheck
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { FaPenToSquare, FaPlus, FaTrash } from "react-icons/fa6";
import { v4 } from "uuid";
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
const emptyMove = () => ({
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
const MoveForm = ({ formData: e, onChange: t }) => {
  const n = (i, l) => {
      t({
        ...e,
        [i]: l,
      });
    },
    r = Object.values(PokemonType).map((i) => ({
      label: i,
      value: i.toLowerCase(),
    })),
    o = Object.values(MoveCategory).map((i) => ({
      label: i,
      value: i.toLowerCase(),
    })),
    s = Object.values(MoveTarget).map((i) => ({
      label: i.replace(/_/g, " "),
      value: i.toLowerCase(),
    }));
  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="flex flex-col gap-4 p-1">
        <div className="space-y-2">
          <Text font="font-move" className="text-sm font-medium">
            Name *
          </Text>
          <Input
            placeholder="Enter move name"
            value={e.name}
            onChange={(i) => {
              n("name", i.target.value);
            }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Type *
            </Text>
            <Combobox
              items={r}
              value={e.type.toLowerCase()}
              onChange={(i) => {
                n("type", i.toUpperCase());
              }}
              placeholder="Select type"
            />
          </div>
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Category *
            </Text>
            <Combobox
              items={o}
              value={e.category.toLowerCase()}
              onChange={(i) => {
                n("category", i.toUpperCase());
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
            items={s}
            value={e.target.toLowerCase()}
            onChange={(i) => {
              n("target", i.toUpperCase());
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
            value={e.damagePower}
            onChange={(i) => {
              n("damagePower", i.target.value);
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
              value={e.damage1}
              onChange={(i) => {
                n("damage1", i.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Damage 2
            </Text>
            <Input
              placeholder="E.g., Brawl"
              value={e.damage2}
              onChange={(i) => {
                n("damage2", i.target.value);
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
              value={e.accuracy1}
              onChange={(i) => {
                n("accuracy1", i.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Accuracy 2
            </Text>
            <Input
              placeholder="e.g., Brawl"
              value={e.accuracy2}
              onChange={(i) => {
                n("accuracy2", i.target.value);
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
            value={e.description}
            onChange={(i) => {
              n("description", i.target.value);
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
            value={e.effect}
            onChange={(i) => {
              n("effect", i.target.value);
            }}
            rows={4}
          />
        </div>
      </div>
    </ScrollArea>
  );
};
const CreateMoveDialog = ({ trigger: e }) => {
  const [t, n] = React.useState(false),
    [r, o] = React.useState(emptyMove()),
    { campaign: s } = useCampaign(),
    { toast: i } = useToast(),
    l = useQueryClient(),
    { mutate: c, isPending: u } = useMovesControllerCreate({
      onSuccess: () => {
        i({
          title: "Move Created",
          description: `${r.name} has been created successfully.`,
        }),
          l.invalidateQueries({
            predicate: (m) => {
              var v, g;
              return (
                ((g = (v = m.queryKey[0]) == null ? undefined : v.includes) ==
                null
                  ? undefined
                  : g.call(v, "moves")) ?? false
              );
            },
          }),
          n(false),
          o(emptyMove());
      },
      onError: (m) => {
        i({
          title: "Failed to create Move",
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
        if (r.description.trim() === "") {
          i({
            title: "Validation Error",
            description: "Description is required.",
            variant: "destructive",
          });
          return;
        }
        if (r.effect.trim() === "") {
          i({
            title: "Validation Error",
            description: "Effect is required.",
            variant: "destructive",
          });
          return;
        }
        c({
          body: {
            _id: v4(),
            campaignId: s.id,
            name: r.name.trim(),
            type: r.type,
            Category: r.category,
            target: r.target,
            damage1: r.damage1.trim(),
            damage2: r.damage2.trim(),
            damagePower: r.damagePower.trim(),
            accuracy1: r.accuracy1.trim(),
            accuracy2: r.accuracy2.trim(),
            effect: r.effect.trim(),
            description: r.description.trim(),
            attributes: {},
            addedEffects: {},
          },
        });
      }
    },
    h =
      r.name.trim() !== "" &&
      r.description.trim() !== "" &&
      r.effect.trim() !== "";
  return (
    <Dialog open={t} onOpenChange={n}>
      <DialogTrigger asChild={true}>{e}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Move</DialogTitle>
          <DialogDescription>
            Create a new custom move for this campaign.
          </DialogDescription>
        </DialogHeader>
        <MoveForm formData={r} onChange={o} />
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
const EditMoveDialog = ({ trigger: e, move: t }) => {
  const [n, r] = React.useState(false),
    [o, s] = React.useState({
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
    }),
    { toast: i } = useToast(),
    l = useQueryClient(),
    { mutate: c, isPending: u } = useMovesControllerUpdate({
      onSuccess: () => {
        i({
          title: "Move Updated",
          description: `${o.name} updated successfully.`,
        }),
          l.invalidateQueries({
            predicate: (m) => {
              var v, g;
              return (
                ((g = (v = m.queryKey[0]) == null ? undefined : v.includes) ==
                null
                  ? undefined
                  : g.call(v, "moves")) ?? false
              );
            },
          }),
          r(false);
      },
      onError: (m) => {
        i({
          title: "Failed to update Move",
          description:
            (m == null ? undefined : m.payload) ?? "An error occurred",
          variant: "destructive",
        });
      },
    }),
    f = !!u;
  React.useEffect(() => {
    var m;
    n &&
      s({
        name: t.name,
        type: t.type,
        category: t.category,
        target: t.target,
        damage1: t.damage1,
        damage2: t.damage2,
        damagePower:
          ((m = t.damagePower) == null ? undefined : m.toString()) ?? "0",
        accuracy1: t.accuracy1,
        accuracy2: t.accuracy2,
        effect: t.effect,
        description: t.description,
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
      if (o.description.trim() === "") {
        i({
          title: "Validation Error",
          description: "Description is required.",
          variant: "destructive",
        });
        return;
      }
      if (o.effect.trim() === "") {
        i({
          title: "Validation Error",
          description: "Effect is required.",
          variant: "destructive",
        });
        return;
      }
      c({
        body: {
          id: t.id,
          name: o.name.trim(),
          type: o.type,
          category: o.category,
          target: o.target,
          damage1: o.damage1.trim(),
          damage2: o.damage2.trim(),
          damagePower: o.damagePower.trim(),
          accuracy1: o.accuracy1.trim(),
          accuracy2: o.accuracy2.trim(),
          effect: o.effect.trim(),
          description: o.description.trim(),
        },
      });
    },
    h =
      o.name.trim() !== "" &&
      o.description.trim() !== "" &&
      o.effect.trim() !== "";
  return (
    <Dialog open={n} onOpenChange={r}>
      <DialogTrigger asChild={true}>{e}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Move</DialogTitle>
          <DialogDescription>Update the move details.</DialogDescription>
        </DialogHeader>
        <MoveForm formData={o} onChange={s} />
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
const DeleteMoveDialog = ({ children: e, move: t }) => {
  const [n, r] = React.useState(false),
    { toast: o } = useToast(),
    s = useQueryClient(),
    { mutate: i, isPending: l } = useMovesControllerRemove({
      onSuccess: () => {
        o({
          title: "Move deleted",
          description: `${t.name} has been deleted.`,
        }),
          s.invalidateQueries({
            predicate: (u) => {
              var f, p;
              return (
                ((p = (f = u.queryKey[0]) == null ? undefined : f.includes) ==
                null
                  ? undefined
                  : p.call(f, "moves")) ?? false
              );
            },
          }),
          r(false);
      },
      onError: (u) => {
        o({
          title: "Failed to delete Move",
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
export const CampaignMoves = () => {
  const { campaign: e } = useCampaign(),
    { fetcherOptions: t } = useApiContext(),
    n = [
      "moves",
      "all",
      (e == null ? undefined : e.id) ?? "",
      {
        includeCore: false,
      },
    ],
    { data: r, isLoading: o } = useQuery({
      queryKey: n,
      queryFn: () =>
        fetchMovesControllerFindAllByCampaign(
          {
            ...t,
            pathParams: {
              id: (e == null ? undefined : e.id) ?? "",
            },
            body: {
              includeCore: false,
            },
          },
          undefined,
        ),
      enabled: !!(e != null && e.id),
    });
  if (e === undefined) return <div>No campaign selected</div>;
  if (o)
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  const s = (r ?? []).slice().sort((i, l) => i.name.localeCompare(l.name));
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
            {s.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Text color="text-pokerole-black-light">
                    {'No moves yet. Click "Add Move" to create one.'}
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              s.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.name}</TableCell>
                  <TableCell>
                    <TypeBadge type={i.type} />
                  </TableCell>
                  <TableCell>
                    <MoveCategoryBadge category={i.category} />
                  </TableCell>
                  <TableCell>
                    {i.damage1}
                    {i.damage2 !== "" ? ` / ${i.damage2}` : ""}
                  </TableCell>
                  <TableCell>
                    {i.accuracy1}
                    {i.accuracy2 !== "" ? ` / ${i.accuracy2}` : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-row justify-end">
                      <EditMoveDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <FaPenToSquare size={16} />
                          </Button>
                        }
                        move={i}
                      />
                      <DeleteMoveDialog move={i}>
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
