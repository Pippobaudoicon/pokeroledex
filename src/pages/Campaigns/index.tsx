// @ts-nocheck
import { useQueryClient } from "@tanstack/react-query";
import { useMediaQuery } from "@uidotdev/usehooks";
import * as React from "react";
import {
  FaCheck,
  FaCompass,
  FaPenToSquare,
  FaTrash,
  FaXmark,
} from "react-icons/fa6";
import { MdStar } from "react-icons/md";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/api/client";
import {
  useCampaignsControllerCreate,
  useCampaignsControllerFindAll,
  useCampaignsControllerRemove,
} from "@/api/components";
import { queryKeyFn } from "@/api/context";
import { AddNewBox } from "@/components/AddNewBox";
import { Box } from "@/components/Box";
import { CollapsableButton } from "@/components/CollapsableButton";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MultiSelect } from "@/components/MultiSelect";
import { Text } from "@/components/Text";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { useToast } from "@/hooks/use-toast";
import { CampaignAbilities } from "@/pages/Campaigns/Abilities";
import { CampaignProvider, useCampaign } from "@/pages/Campaigns/context";
import { CampaignItems } from "@/pages/Campaigns/Items";
import { CampaignMoves } from "@/pages/Campaigns/Moves";
import { CampaignPokemonTemplates } from "@/pages/Campaigns/PokemonTemplates";
const CampaignCard = ({ name: e, isCore: t, className: n, onClick: r }) => (
  <Box
    color="bg-type-grass"
    className={`${n} flex flex-col items-center justify-center space-y-2 p-3 bg-gradient-to-br from-type-grass-light ${r != null ? "hover:bg-type-grass-light hover:from-type-grass-light" : ""}`}
    onClick={r}
  >
    <div className="flex flex-row items-center gap-2">
      <FaCompass size={24} className="text-white" />
      <Text size="text-3xl" color="text-white">
        {e}
      </Text>
      {t && (
        <MdStar size={20} className="text-yellow-400" title="Core Campaign" />
      )}
    </div>
  </Box>
);
const CreateCampaignDialog = ({ trigger: e }) => {
  const [t, n] = React.useState(false),
    { toast: r } = useToast(),
    o = useQueryClient(),
    { user: s } = useAuth(),
    [i, l] = React.useState({
      name: "",
      userId: (s == null ? undefined : s.sub) ?? "",
    }),
    { mutate: c } = useCampaignsControllerCreate({
      onSuccess: () => {
        r({
          title: "Campaign created",
          description: (
            <>
              <span>Your campaign has been created.</span>
            </>
          ),
        }),
          o.invalidateQueries(
            queryKeyFn({
              path: "/campaigns",
              variables: {},
            }),
          ),
          n(false);
      },
      onError: (f) => {
        r({
          title: "Failed to create campaign",
          description: f == null ? undefined : f.payload,
        });
      },
    }),
    u = () => {
      if (i.name === "") {
        r({
          title: "Failed to create campaign",
          description: "Name is required.",
        });
        return;
      }
      c({
        body: i,
      });
    };
  return (
    <Dialog open={t} onOpenChange={n}>
      <DialogTrigger asChild={true}>{e}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
          <DialogDescription>
            Create a new campaign to manage custom Pokemon, moves, items, and
            abilities.
          </DialogDescription>
          <div className="flex flex-row space-x-2 items-center justify-between">
            <Text className="text-xl flex-grow min-w-20">Name:</Text>
            <Input
              placeholder="Campaign name"
              value={i.name}
              onChange={(f) => {
                l({
                  ...i,
                  name: f.target.value,
                });
              }}
            />
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="green"
            onClick={() => {
              u();
            }}
            className="flex-grow"
          >
            Create Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const CampaignFilterSelect = ({ className: e }) => {
  const { data: t } = useCampaignsControllerFindAll({}),
    { state: n, setCampaignIds: r, setIncludeCore: o } = useCampaignFilter(),
    [s, i] = React.useState([]);
  React.useEffect(() => {
    if (!t) {
      i([]);
      return;
    }
    const c = t
      .slice()
      .sort((u, f) => u.name.localeCompare(f.name))
      .map((u) => ({
        label: u.name,
        value: u.id,
      }));
    i(c);
  }, [t]);
  const l = n.campaignIds || [];
  return (
    <div className={e}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <MultiSelect
            options={s}
            selected={l}
            onChange={(c) => r(c)}
            placeholder="Select campaigns..."
          />
        </div>
        <div className="flex items-center">
          <Checkbox
            id="include-core-toggle"
            checked={n.includeCore}
            onCheckedChange={(c) => o(c === true)}
          />
          <Text className="ml-2" size="text-sm">
            Show Core
          </Text>
        </div>
      </div>
    </div>
  );
};
const CampaignList = ({ className: e, onClick: t }) => {
  const { data: n, isFetching: r } = useCampaignsControllerFindAll({}),
    o = r && n == null,
    [s, i] = React.useState(""),
    l = React.useMemo(
      () =>
        n == null
          ? undefined
          : n
              .sort((u, f) => u.name.localeCompare(f.name))
              .filter((u) => u.name.toLowerCase().includes(s.toLowerCase())),
      [n, s],
    ),
    c = React.useMemo(
      () =>
        l == null
          ? undefined
          : l.map((u) => (
              <Link
                key={u.id}
                to={`/campaigns/${u.id}`}
                className="flex flex-col"
              >
                <CampaignCard
                  key={u.id}
                  name={u.name}
                  isCore={u.isCore}
                  onClick={() => (t == null ? undefined : t(u.id))}
                  className="flex-grow"
                />
              </Link>
            )),
      [l, t],
    );
  return (
    <div className={`flex flex-col h-full overflow-hidden ${e}`}>
      <div className="flex flex-row space-x-2 shrink-0 mb-2">
        <Input
          className="rounded-3xl"
          placeholder="Search..."
          value={s}
          onChange={(u) => {
            i(u.target.value);
          }}
        />
        <Button className="rounded-3xl">Search</Button>
      </div>
      <ScrollArea className="rounded-t-3xl flex-1">
        <div className="grid grid-cols-2 md:grid-cols-1 2xl:grid-cols-2 gap-2">
          {!!o && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center h-full w-full">
              <LoadingSpinner />
            </div>
          )}
          {c}
          {!o && (
            <div id="create-campaign-button" className="flex">
              <CreateCampaignDialog
                trigger={
                  <AddNewBox
                    id="campaign-add-button"
                    className="p-0 flex-grow"
                  />
                }
              />
            </div>
          )}
        </div>
      </ScrollArea>
      <Separator className="my-2" />
      <Box color="bg-pokerole-beige" className="shrink-0 p-3">
        <div className="flex flex-col">
          <Text size="text-sm" className="font-semibold mb-2">
            Campaigns to show:
          </Text>
          <div id="campaign-config-selector">
            <CampaignFilterSelect />
          </div>
        </div>
      </Box>
    </div>
  );
};
const DeleteCampaignButton = () => {
  const [e, t] = React.useState(false),
    { toast: n } = useToast(),
    { campaign: r } = useCampaign(),
    o = useNavigate(),
    s = useQueryClient(),
    { mutate: i } = useCampaignsControllerRemove({
      onSuccess: () => {
        n({
          title: "Campaign deleted",
          description: "Your campaign has been deleted.",
        }),
          s.invalidateQueries(
            queryKeyFn({
              path: "/campaigns",
              variables: {},
            }),
          ),
          o("/campaigns"),
          t(false);
      },
      onError: (c) => {
        n({
          title: "Failed to delete campaign",
          description: c == null ? undefined : c.payload,
        });
      },
    }),
    l = () => {
      r !== undefined &&
        i({
          pathParams: {
            id: r.id,
          },
        });
    };
  return (
    <Dialog open={e} onOpenChange={t}>
      <DialogTrigger asChild={true}>
        <CollapsableButton
          variant="red"
          icon={<FaTrash size={16} />}
          text="Delete Campaign"
        />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Campaign</DialogTitle>
          <DialogDescription>
            {'Are you sure you want to delete "'}
            {r == null ? undefined : r.name}
            {
              '"? This action cannot be undone. All Pokemon templates, moves, items, and abilities in this campaign will be deleted.'
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              t(false);
            }}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={l}>
            Delete Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const CampaignHeader = () => {
  const { campaign: e, updateCampaign: t } = useCampaign(),
    [n, r] = React.useState(false),
    [o, s] = React.useState((e == null ? undefined : e.name) ?? "");
  if (e === undefined) return <div>No campaign selected</div>;
  const i = () => {
      t({
        name: o,
      }),
        r(false);
    },
    l = () => {
      s(e.name), r(false);
    };
  return (
    <Box
      color="bg-type-grass"
      className="p-4 bg-gradient-to-br from-type-grass-light"
    >
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-row items-center gap-2 flex-grow">
          {n ? (
            <>
              <Input
                value={o}
                onChange={(c) => {
                  s(c.target.value);
                }}
                className="text-2xl font-bold max-w-xs"
              />
              <Button variant="ghost" size="icon" onClick={i}>
                <FaCheck size={20} />
              </Button>
              <Button variant="ghost" size="icon" onClick={l}>
                <FaXmark size={20} />
              </Button>
            </>
          ) : (
            <>
              <Text size="text-3xl" color="text-white" className="font-bold">
                {e.name}
              </Text>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  s(e.name), r(true);
                }}
              >
                <FaPenToSquare size={20} className="text-white" />
              </Button>
            </>
          )}
        </div>
        <div className="flex flex-row items-center gap-2">
          {e.isCore && (
            <Text
              size="text-sm"
              color="text-white"
              className="bg-yellow-500 px-2 py-1 rounded"
            >
              Core
            </Text>
          )}
          <DeleteCampaignButton />
        </div>
      </div>
    </Box>
  );
};
const CampaignDetail = () => {
  const { campaign: e, isLoading: t, isError: n } = useCampaign();
  return t ? (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner />
    </div>
  ) : n || e === undefined ? (
    <div className="flex items-center justify-center h-full">
      Error loading campaign
    </div>
  ) : (
    <Box color="bg-pokerole-beige" className="p-3 h-full">
      <ScrollArea className="md:h-[calc(100vh-1.5rem)] h-full">
        <div className="flex flex-col gap-3">
          <CampaignHeader />
          <Tabs defaultValue="pokemon-templates" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pokemon-templates">Pokemon</TabsTrigger>
              <TabsTrigger value="abilities">Abilities</TabsTrigger>
              <TabsTrigger value="moves">Moves</TabsTrigger>
              <TabsTrigger value="items">Items</TabsTrigger>
            </TabsList>
            <TabsContent value="pokemon-templates">
              <CampaignPokemonTemplates />
            </TabsContent>
            <TabsContent value="moves">
              <CampaignMoves />
            </TabsContent>
            <TabsContent value="items">
              <CampaignItems />
            </TabsContent>
            <TabsContent value="abilities">
              <CampaignAbilities />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </Box>
  );
};
export const CampaignsPage = () => {
  const { id: e } = useParams(),
    [t, n] = React.useState(e),
    r = useMediaQuery("(min-width: 768px)");
  React.useEffect(() => {
    n(e);
  }, [e]);
  const OComponent = r ? ScrollArea : "div";
  return (
    <div className="sheet-layout grid grid-cols-4 gap-4 pl-2 pt-2 pr-2 md:h-[calc(100vh-1rem)] md:grid-rows-1">
      <CampaignList
        className="md:col-span-1 col-span-full max-md:min-h-[15vh] max-md:max-h-[35vh]"
        onClick={(s) => {
          n(s);
        }}
      />
      <OComponent className="md:col-span-3 col-span-full h-full">
        {t === undefined ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="md:h-[80%] max-md:w-1/2">
              <FaCompass size="100%" color="#5f5c54" />
            </div>
          </div>
        ) : (
          <CampaignProvider id={t}>
            <CampaignDetail />
          </CampaignProvider>
        )}
      </OComponent>
    </div>
  );
};
