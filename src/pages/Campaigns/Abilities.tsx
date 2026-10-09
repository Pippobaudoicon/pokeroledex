// @ts-nocheck
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { FaPenToSquare, FaPlus, FaTrash } from "react-icons/fa6";
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
const emptyAbility = () => ({
  name: "",
  description: "",
  effect: "",
});
const AbilityForm = ({ formData: e, onChange: t }) => {
  const n = (r, o) => {
    t({
      ...e,
      [r]: o,
    });
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
            value={e.name}
            onChange={(r) => {
              n("name", r.target.value);
            }}
          />
        </div>
        <div className="space-y-2">
          <Text font="font-move" className="text-sm font-medium">
            Description *
          </Text>
          <Textarea
            placeholder="Enter ability description"
            value={e.description}
            onChange={(r) => {
              n("description", r.target.value);
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
            value={e.effect}
            onChange={(r) => {
              n("effect", r.target.value);
            }}
            rows={4}
          />
        </div>
      </div>
    </ScrollArea>
  );
};
const CreateAbilityDialog = ({ trigger: e }) => {
  const [t, n] = React.useState(false),
    [r, o] = React.useState(emptyAbility()),
    { campaign: s } = useCampaign(),
    { toast: i } = useToast(),
    l = useQueryClient(),
    { mutate: c, isPending: u } = useAbilitiesControllerCreate({
      onSuccess: () => {
        i({
          title: "Ability Created",
          description: `${r.name} has been created successfully.`,
        }),
          l.invalidateQueries({
            predicate: (m) => {
              var v, g;
              return (
                ((g = (v = m.queryKey[0]) == null ? undefined : v.includes) ==
                null
                  ? undefined
                  : g.call(v, "abilities")) ?? false
              );
            },
          }),
          n(false),
          o(emptyAbility());
      },
      onError: (m) => {
        i({
          title: "Failed to create Ability",
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
            campaignId: s.id,
            name: r.name.trim(),
            description: r.description.trim(),
            effect: r.effect.trim(),
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Ability</DialogTitle>
          <DialogDescription>
            Create a new custom ability for this campaign.
          </DialogDescription>
        </DialogHeader>
        <AbilityForm formData={r} onChange={o} />
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
const EditAbilityDialog = ({ trigger: e, ability: t }) => {
  const [n, r] = React.useState(false),
    [o, s] = React.useState({
      name: "",
      description: "",
      effect: "",
    }),
    { toast: i } = useToast(),
    l = useQueryClient(),
    { mutate: c, isPending: u } = useAbilitiesControllerUpdate({
      onSuccess: () => {
        i({
          title: "Ability Updated",
          description: `${o.name} updated successfully.`,
        }),
          l.invalidateQueries({
            predicate: (h) => {
              var m, v;
              return (
                ((v = (m = h.queryKey[0]) == null ? undefined : m.includes) ==
                null
                  ? undefined
                  : v.call(m, "abilities")) ?? false
              );
            },
          }),
          r(false);
      },
      onError: (h) => {
        i({
          title: "Failed to update Ability",
          description:
            (h == null ? undefined : h.payload) ?? "An error occurred",
          variant: "destructive",
        });
      },
    });
  React.useEffect(() => {
    n &&
      s({
        name: t.name ?? "",
        description: t.description ?? "",
        effect: t.effect ?? "",
      });
  }, [n, t]);
  const f = () => {
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
          description: o.description.trim(),
          effect: o.effect.trim(),
        },
      });
    },
    p =
      o.name.trim() !== "" &&
      o.description.trim() !== "" &&
      o.effect.trim() !== "";
  return (
    <Dialog open={n} onOpenChange={r}>
      <DialogTrigger asChild={true}>{e}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Ability</DialogTitle>
          <DialogDescription>Update the ability details.</DialogDescription>
        </DialogHeader>
        <AbilityForm formData={o} onChange={s} />
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              r(false);
            }}
            disabled={u}
          >
            Cancel
          </Button>
          <Button variant="green" onClick={f} disabled={u === true || !p}>
            {u === true ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const DeleteAbilityDialog = ({ children: e, ability: t }) => {
  const [n, r] = React.useState(false),
    { toast: o } = useToast(),
    s = useQueryClient(),
    { mutate: i, isPending: l } = useAbilitiesControllerRemove({
      onSuccess: () => {
        o({
          title: "Ability deleted",
          description: `${t.name} has been deleted.`,
        }),
          s.invalidateQueries({
            predicate: (u) => {
              var f, p;
              return (
                ((p = (f = u.queryKey[0]) == null ? undefined : f.includes) ==
                null
                  ? undefined
                  : p.call(f, "abilities")) ?? false
              );
            },
          }),
          r(false);
      },
      onError: (u) => {
        o({
          title: "Failed to delete Ability",
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
export const CampaignAbilities = () => {
  const { campaign: e } = useCampaign(),
    { fetcherOptions: t } = useApiContext(),
    n = [
      "abilities",
      "all",
      (e == null ? undefined : e.id) ?? "",
      {
        includeCore: false,
      },
    ],
    { data: r, isLoading: o } = useQuery({
      queryKey: n,
      queryFn: () =>
        fetchAbilitiesControllerFindAllByCampaign(
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
            {s.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Text color="text-pokerole-black-light">
                    {'No abilities yet. Click "Add Ability" to create one.'}
                  </Text>
                </TableCell>
              </TableRow>
            ) : (
              s.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {i.description}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {i.effect}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-row justify-end">
                      <EditAbilityDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <FaPenToSquare size={16} />
                          </Button>
                        }
                        ability={i}
                      />
                      <DeleteAbilityDialog ability={i}>
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
