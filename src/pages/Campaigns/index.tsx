import {
  type InvalidateQueryFilters,
  type QueryClient,
  useQueryClient,
} from "@tanstack/react-query";
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
import type * as T from "../../../shared/types";
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
import { useScrollToDetail } from "@/hooks/use-scroll-to-detail";

// Passing the bare key (not { queryKey }) means react-query v5 invalidates every query.
const invalidateCampaigns = (queryClient: QueryClient) =>
  queryClient.invalidateQueries(
    queryKeyFn({
      path: "/campaigns",
      operationId: "campaignsControllerFindAll",
      variables: {},
    }) as InvalidateQueryFilters,
  );

const CampaignCard = ({
  name,
  isCore,
  className,
  onClick,
}: {
  name: string;
  isCore: boolean;
  className?: string;
  onClick?: () => void;
}) => (
  <Box
    color="bg-type-grass"
    className={`${className} flex flex-col items-center justify-center space-y-2 p-3 bg-linear-to-br/srgb from-type-grass-light ${onClick != null ? "hover:bg-type-grass-light hover:from-type-grass-light" : ""}`}
    onClick={onClick}
  >
    <div className="flex flex-row items-center gap-2">
      <FaCompass size={24} className="text-white" />
      <Text size="text-3xl" color="text-white">
        {name}
      </Text>
      {isCore && (
        <MdStar size={20} className="text-yellow-400" title="Core Campaign" />
      )}
    </div>
  </Box>
);

const CreateCampaignDialog = ({ trigger }: { trigger: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formData, setFormData] = React.useState({
    name: "",
    userId: user.sub,
  });
  const { mutate: createCampaign } = useCampaignsControllerCreate({
    onSuccess: () => {
      toast({
        title: "Campaign created",
        description: (
          <>
            <span>Your campaign has been created.</span>
          </>
        ),
      });
      invalidateCampaigns(queryClient);
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to create campaign",
        // apiFetch errors carry no payload, so this is always undefined.
        description: (error as Partial<T.ApiError>)?.payload,
      });
    },
  });

  const handleCreate = () => {
    if (formData.name === "") {
      toast({
        title: "Failed to create campaign",
        description: "Name is required.",
      });
      return;
    }
    createCampaign({ body: formData });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true}>{trigger}</DialogTrigger>
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
              value={formData.name}
              onChange={(event) => {
                setFormData({ ...formData, name: event.target.value });
              }}
            />
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="green"
            onClick={() => {
              handleCreate();
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

const CampaignFilterSelect = ({ className }: { className?: string }) => {
  const { data: campaigns } = useCampaignsControllerFindAll({});
  const { state, setCampaignIds, setIncludeCore } = useCampaignFilter();
  const [options, setOptions] = React.useState<
    { label: string; value: string }[]
  >([]);
  React.useEffect(() => {
    if (!campaigns) {
      setOptions([]);
      return;
    }
    setOptions(
      campaigns
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((campaign) => ({ label: campaign.name, value: campaign.id })),
    );
  }, [campaigns]);
  const selected = state.campaignIds || [];
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <MultiSelect
            options={options}
            selected={selected}
            onChange={(campaignIds) => setCampaignIds(campaignIds)}
            placeholder="Select campaigns..."
          />
        </div>
        <div className="flex items-center">
          <Checkbox
            id="include-core-toggle"
            checked={state.includeCore}
            onCheckedChange={(checked) => setIncludeCore(checked === true)}
          />
          <Text className="ml-2" size="text-sm">
            Show Core
          </Text>
        </div>
      </div>
    </div>
  );
};

const CampaignList = ({
  className,
  onClick,
}: {
  className?: string;
  onClick?: (id: string) => void;
}) => {
  const { data: campaigns, isFetching } = useCampaignsControllerFindAll({});
  const isInitialLoading = isFetching && campaigns == null;
  const [search, setSearch] = React.useState("");
  const filteredCampaigns = React.useMemo(
    () =>
      // Sorts the cached query data in place.
      campaigns
        ?.sort((a, b) => a.name.localeCompare(b.name))
        .filter((campaign) =>
          campaign.name.toLowerCase().includes(search.toLowerCase()),
        ),
    [campaigns, search],
  );
  const campaignLinks = React.useMemo(
    () =>
      filteredCampaigns?.map((campaign) => (
        <Link
          key={campaign.id}
          to={`/campaigns/${campaign.id}`}
          className="flex flex-col"
        >
          <CampaignCard
            name={campaign.name}
            isCore={campaign.isCore}
            onClick={() => onClick?.(campaign.id)}
            className="flex-grow"
          />
        </Link>
      )),
    [filteredCampaigns, onClick],
  );
  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      <div className="flex flex-row space-x-2 shrink-0 mb-2">
        <Input
          className="rounded-3xl"
          placeholder="Search..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <Button className="rounded-3xl">Search</Button>
      </div>
      <ScrollArea className="rounded-t-3xl flex-1">
        <div className="grid grid-cols-2 md:grid-cols-1 2xl:grid-cols-2 gap-2">
          {isInitialLoading && (
            <div className="flex col-span-full flex-row flex-grow justify-center items-center h-full w-full">
              <LoadingSpinner />
            </div>
          )}
          {campaignLinks}
          {!isInitialLoading && (
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
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const { campaign } = useCampaign();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: removeCampaign } = useCampaignsControllerRemove({
    onSuccess: () => {
      toast({
        title: "Campaign deleted",
        description: "Your campaign has been deleted.",
      });
      invalidateCampaigns(queryClient);
      navigate("/campaigns");
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete campaign",
        // apiFetch errors carry no payload, so this is always undefined.
        description: (error as Partial<T.ApiError>)?.payload,
      });
    },
  });

  const handleDelete = () => {
    if (campaign === undefined) return;
    removeCampaign({ pathParams: { id: campaign.id } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            {campaign?.name}
            {
              '"? This action cannot be undone. All Pokemon templates, moves, items, and abilities in this campaign will be deleted.'
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CampaignHeader = () => {
  const { campaign, updateCampaign } = useCampaign();
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftName, setDraftName] = React.useState(campaign?.name ?? "");
  if (campaign === undefined) return <div>No campaign selected</div>;

  const confirmEdit = () => {
    updateCampaign({ name: draftName });
    setIsEditing(false);
  };
  const cancelEdit = () => {
    setDraftName(campaign.name);
    setIsEditing(false);
  };

  return (
    <Box
      color="bg-type-grass"
      className="p-4 bg-linear-to-br/srgb from-type-grass-light"
    >
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex flex-row items-center gap-2 flex-grow">
          {isEditing ? (
            <>
              <Input
                value={draftName}
                onChange={(event) => {
                  setDraftName(event.target.value);
                }}
                className="text-2xl font-bold max-w-xs"
              />
              <Button variant="ghost" size="icon" onClick={confirmEdit}>
                <FaCheck size={20} />
              </Button>
              <Button variant="ghost" size="icon" onClick={cancelEdit}>
                <FaXmark size={20} />
              </Button>
            </>
          ) : (
            <>
              <Text size="text-3xl" color="text-white" className="font-bold">
                {campaign.name}
              </Text>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraftName(campaign.name);
                  setIsEditing(true);
                }}
              >
                <FaPenToSquare size={20} className="text-white" />
              </Button>
            </>
          )}
        </div>
        <div className="flex flex-row items-center gap-2">
          {campaign.isCore && (
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
  const { campaign, isLoading, isError } = useCampaign();
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  if (isError || campaign === undefined)
    return (
      <div className="flex items-center justify-center h-full">
        Error loading campaign
      </div>
    );
  return (
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
  const { id } = useParams();
  const [selectedId, setSelectedId] = React.useState(id);
  const detailRef = useScrollToDetail(selectedId);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  React.useEffect(() => {
    setSelectedId(id);
  }, [id]);
  const DetailContainer = isDesktop ? ScrollArea : "div";
  return (
    <div className="sheet-layout grid grid-cols-4 gap-4 pl-2 pt-2 pr-2 md:h-[calc(100vh-1rem)] md:grid-rows-1">
      <CampaignList
        className="md:col-span-1 col-span-full max-md:min-h-[15vh] max-md:max-h-[35vh]"
        onClick={(campaignId) => {
          setSelectedId(campaignId);
        }}
      />
      <DetailContainer ref={detailRef} className="md:col-span-3 col-span-full h-full">
        {selectedId === undefined ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="md:h-[80%] max-md:w-1/2">
              <FaCompass size="100%" color="#5f5c54" />
            </div>
          </div>
        ) : (
          <CampaignProvider id={selectedId}>
            <CampaignDetail />
          </CampaignProvider>
        )}
      </DetailContainer>
    </div>
  );
};
