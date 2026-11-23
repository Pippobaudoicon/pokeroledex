import { useQueryClient } from "@tanstack/react-query";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Compass, NotebookPen, Pencil, Plus, Star, Trash2, Users } from "lucide-react";
import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type * as T from "../../../shared/types";
import { useAuth } from "@/api/client";
import {
  useCampaignsControllerCreate,
  useCampaignsControllerFindAll,
  useCampaignsControllerRemove,
  useCampaignsControllerShared,
  useCampaignsControllerUpdate,
} from "@/api/components";
import { NotesSheet } from "@/components/NotesSheet";
import { button } from "@/components/kit/button";
import { Switch } from "@/components/kit/Controls";
import { Group, Row, RowIcon } from "@/components/kit/List";
import { PageHeader } from "@/components/kit/PageHeader";
import { Segmented, segmentPanelProps } from "@/components/kit/Segmented";
import { Sheet } from "@/components/kit/Sheet";
import { useCampaignFilter } from "@/hooks/use-campaign-filter";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CampaignAbilities } from "@/pages/Campaigns/Abilities";
import { ConfirmDelete, errorText, field, invalidateEntries, matches, SearchField } from "@/pages/Campaigns/common";
import { CampaignProvider, useCampaign } from "@/pages/Campaigns/context";
import { CampaignItems } from "@/pages/Campaigns/Items";
import { CampaignMoves } from "@/pages/Campaigns/Moves";
import { CampaignPokemonTemplates } from "@/pages/Campaigns/PokemonTemplates";
import { CampaignCities } from "@/pages/MyCity";

const CAMPAIGN_COLOR = "bg-[#047857]";

/** Whether a campaign's entries show up in the Pokédex, indexes and generators. */
const useShown = () => {
  const { state, setCampaignIds } = useCampaignFilter();
  const shown = (id: string) => state.campaignIds.includes(id);
  const setShown = (id: string, show: boolean) =>
    setCampaignIds(show ? [...state.campaignIds.filter((entry) => entry !== id), id] : state.campaignIds.filter((entry) => entry !== id));
  return { shown, setShown };
};

/** A name form in a sheet, for creating and renaming. */
const NameSheet = ({
  open,
  onOpenChange,
  title,
  initialName,
  submitLabel,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialName: string;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (name: string) => void;
}) => {
  const [name, setName] = React.useState(initialName);
  React.useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      <form
        className="flex flex-col gap-4 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) onSubmit(name.trim());
        }}
      >
        <label className="flex flex-col gap-1.5 text-subhead font-medium">
          Name
          <input required autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} placeholder="Campaign name" className={field} />
        </label>
        <button type="submit" disabled={isPending || !name.trim() || name.trim() === initialName} className={button({ variant: "filled" })}>
          {isPending ? "Saving…" : submitLabel}
        </button>
      </form>
    </Sheet>
  );
};

const CreateCampaign = ({ variant = "plain" }: { variant?: "plain" | "tinted" }) => {
  const [open, setOpen] = React.useState(false);
  const { user } = useAuth();
  const { setShown } = useShown();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutate, isPending } = useCampaignsControllerCreate({
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setOpen(false);
      // A new campaign is shown right away, so what you add to it appears in the Pokédex.
      setShown(campaign.id, true);
      navigate(`/campaigns/${campaign.id}`);
      toast({ title: `${campaign.name} created` });
    },
    onError: (error) => toast({ title: "Campaign couldn’t be created", description: errorText(error) }),
  });
  return (
    <>
      <button type="button" className={button({ variant, size: variant === "plain" ? "sm" : "md" })} onClick={() => setOpen(true)}>
        <Plus aria-hidden className="size-4" />
        {variant === "plain" ? "Add" : "New campaign"}
      </button>
      <NameSheet
        open={open}
        onOpenChange={setOpen}
        title="New campaign"
        initialName=""
        submitLabel="Create campaign"
        isPending={isPending}
        onSubmit={(name) => mutate({ body: { name, userId: user.sub } })}
      />
    </>
  );
};

const CoreMark = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-[#f5b301]/15 px-2 py-0.5 text-caption font-semibold text-[#9a6b00]">
    <Star aria-hidden className="size-3 fill-current" />
    Core
  </span>
);

const ShowSettings = ({ campaigns }: { campaigns: T.Campaign[] }) => {
  const { state, setIncludeCore } = useCampaignFilter();
  const { shown, setShown } = useShown();
  return (
    <Group title="Show in Pokédex & generators" footer="Turn a campaign on to add its Pokémon, moves, abilities and items across the app.">
      <Row
        icon={
          <RowIcon className="bg-[#f5b301]">
            <Star />
          </RowIcon>
        }
        title="Core rulebook"
        value={<Switch aria-label="Show core rulebook" checked={state.includeCore} onChange={setIncludeCore} />}
      />
      {campaigns.map((campaign) => (
        <Row
          key={campaign.id}
          icon={
            <RowIcon className={CAMPAIGN_COLOR}>
              <Compass />
            </RowIcon>
          }
          title={campaign.name}
          value={<Switch aria-label={`Show ${campaign.name}`} checked={shown(campaign.id)} onChange={(show) => setShown(campaign.id, show)} />}
        />
      ))}
    </Group>
  );
};

/** Campaigns other players run in your cities; their public notes open read-only. */
const SharedCampaigns = ({ compact }: { compact: boolean }) => {
  const { data } = useCampaignsControllerShared({});
  const [openId, setOpenId] = React.useState<string>();
  if (!data?.length) return null;
  const key = (campaign: T.SharedCampaign) => `${campaign.owner}\0${campaign.id}`;
  const opened = data.find((campaign) => key(campaign) === openId);
  const notesLabel = (campaign: T.SharedCampaign) =>
    campaign.notes.length === 1 ? "1 public note" : `${campaign.notes.length || "No"} public notes`;
  return (
    <section className={cn(compact && "mx-3 mb-6")}>
      <Group
        title="Shared with you"
        footer={compact ? undefined : "Campaigns other players run in your cities. Only their public notes are shown."}
      >
        {data.map((campaign) => (
          <Row
            key={key(campaign)}
            onClick={() => setOpenId(key(campaign))}
            icon={
              <RowIcon className={CAMPAIGN_COLOR}>
                <Users />
              </RowIcon>
            }
            title={campaign.name}
            subtitle={`${campaign.owner} · ${campaign.cities.join(", ")}`}
            value={compact ? undefined : notesLabel(campaign)}
          />
        ))}
      </Group>
      {opened && (
        <NotesSheet
          title={`Notes for ${opened.name}`}
          description={`Public notes from ${opened.owner}.`}
          notes={opened.notes}
          open={!!openId}
          onOpenChange={(open) => !open && setOpenId(undefined)}
          emptyText="This campaign has no public notes yet."
        />
      )}
    </section>
  );
};

const CampaignList = ({ compact = false, selectedId }: { compact?: boolean; selectedId?: string }) => {
  const { data, isError, refetch } = useCampaignsControllerFindAll({});
  const { shown } = useShown();
  const [query, setQuery] = React.useState("");
  const campaigns = React.useMemo(() => data && [...data].sort((first, second) => first.name.localeCompare(second.name)), [data]);
  const list = campaigns?.filter((campaign) => matches(query, campaign.name));
  return (
    <>
      <PageHeader title="Campaigns" compact={compact} actions={<CreateCampaign />}>
        <p className="text-subhead text-label-2">Custom Pokémon, moves, abilities and items for your table.</p>
        {(campaigns?.length ?? 0) > 3 && (
          <div className="mt-3 lg:max-w-md">
            <SearchField value={query} onChange={setQuery} label="Search campaigns" />
          </div>
        )}
      </PageHeader>
      {compact && (campaigns?.length ?? 0) > 3 && (
        <div className="mx-3 my-3">
          <SearchField value={query} onChange={setQuery} label="Search campaigns" />
        </div>
      )}
      <div className={cn("flex flex-col gap-8 px-4 pb-8", compact ? "lg:px-3" : "lg:px-8")}>
        {isError ? (
          <div className="rounded-2xl bg-surface p-6 text-center shadow-card">
            <p className="mb-3 text-body">Campaigns couldn’t be loaded.</p>
            <button type="button" className={button({ variant: "tinted" })} onClick={() => refetch()}>
              Try again
            </button>
          </div>
        ) : !campaigns || !list ? (
          <div aria-hidden className="skeleton h-40 rounded-2xl" />
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-8 text-center shadow-card">
            <Compass aria-hidden className="size-12 text-[#047857]" />
            <h2 className="text-title-3 font-semibold">No campaigns yet</h2>
            <p className="max-w-sm text-subhead text-label-2">Create a campaign to add your own Pokémon, moves, abilities and items.</p>
            <CreateCampaign variant="tinted" />
          </div>
        ) : (
          <section>
            {list.length === 0 ? (
              <div className="rounded-2xl bg-surface p-6 text-center shadow-card">
                <p className="text-body">No campaigns named “{query}”.</p>
                <button type="button" onClick={() => setQuery("")} className={cn(button({ variant: "tinted" }), "mt-3")}>
                  Clear search
                </button>
              </div>
            ) : compact ? (
              <div className="overflow-hidden rounded-xl bg-surface shadow-card">
                {list.map((campaign) => (
                  <Row
                    key={campaign.id}
                    to={`/campaigns/${campaign.id}`}
                    replace
                    icon={
                      <RowIcon className={CAMPAIGN_COLOR}>
                        <Compass />
                      </RowIcon>
                    }
                    title={campaign.name}
                    subtitle={shown(campaign.id) ? "Shown in the Pokédex" : "Hidden"}
                    className={campaign.id === selectedId ? "bg-tint/10" : undefined}
                  />
                ))}
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-4">
                {list.map((campaign) => (
                  <li key={campaign.id}>
                    <Link
                      to={`/campaigns/${campaign.id}`}
                      className="flex h-full items-center gap-4 rounded-2xl bg-surface p-4 shadow-card transition-colors hover:bg-raised sm:flex-col sm:p-5 sm:text-center"
                    >
                      <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-white sm:size-16", CAMPAIGN_COLOR)}>
                        <Compass aria-hidden className="size-6 sm:size-8" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1 sm:items-center">
                        <span className="line-clamp-2 text-body font-semibold">{campaign.name}</span>
                        <span className="flex flex-wrap items-center gap-2 text-footnote text-label-2 sm:justify-center">
                          {campaign.isCore && <CoreMark />}
                          {shown(campaign.id) ? "Shown in the Pokédex" : "Hidden"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {!compact && <SharedCampaigns compact={false} />}
        {!compact && campaigns && <ShowSettings campaigns={campaigns} />}
      </div>
      {compact && <SharedCampaigns compact />}
    </>
  );
};

const TABS = [
  { value: "pokemon", label: "Pokémon" },
  { value: "moves", label: "Moves" },
  { value: "abilities", label: "Abilities" },
  { value: "items", label: "Items" },
  { value: "cities", label: "Cities" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const CampaignDetail = () => {
  const { campaign, isLoading, isError, refetch } = useCampaign();
  const [params, setParams] = useSearchParams();
  // Core campaigns cannot own cities.
  const tabs = TABS.filter((entry) => entry.value !== "cities" || (campaign && !campaign.isCore));
  const tab: Tab = tabs.find((entry) => entry.value === params.get("tab"))?.value ?? "pokemon";
  const [renaming, setRenaming] = React.useState(false);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const { shown, setShown } = useShown();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const saveNotes = useCampaignsControllerUpdate({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Notes saved" });
    },
    onError: (error) => toast({ title: "Notes couldn’t be saved", description: errorText(error) }),
  });
  const rename = useCampaignsControllerUpdate({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      // Entries show their campaign's name in pickers and the Pokédex.
      invalidateEntries(queryClient, "pokemon-templates", "moves", "abilities", "items", "dex", "move-index", "item-index");
      setRenaming(false);
      toast({ title: "Campaign renamed" });
    },
    onError: (error) => toast({ title: "Campaign couldn’t be renamed", description: errorText(error) }),
  });
  const remove = useCampaignsControllerRemove({
    onSuccess: () => {
      if (campaign) setShown(campaign.id, false);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      invalidateEntries(queryClient, "pokemon-templates", "moves", "abilities", "items", "dex", "move-index", "item-index", "learners");
      navigate("/campaigns");
      toast({ title: `${campaign?.name} deleted` });
    },
    onError: (error) => toast({ title: "Campaign couldn’t be deleted", description: errorText(error) }),
  });
  const back = { to: "/campaigns", label: "Campaigns" };

  if (isLoading)
    return (
      <>
        <PageHeader title="" back={back} />
        <div aria-hidden className="flex flex-col gap-4 px-4 lg:px-8">
          <div className="skeleton h-10 w-2/3 rounded-xl" />
          <div className="skeleton h-10 rounded-xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      </>
    );
  if (isError || !campaign)
    return (
      <>
        <PageHeader title="Campaign" back={back} />
        <div className="px-4 lg:px-8">
          <div className="rounded-2xl bg-surface p-6 text-center shadow-card">
            <p className="mb-3 text-body">This campaign couldn’t be loaded.</p>
            <button type="button" className={button({ variant: "tinted" })} onClick={refetch}>
              Try again
            </button>
          </div>
        </div>
      </>
    );

  return (
    <>
      <PageHeader title={campaign.name} back={back}>
        {campaign.isCore && (
          <div className="mt-1">
            <CoreMark />
          </div>
        )}
        {!campaign.isCore && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={button({ variant: "gray" })} onClick={() => setNotesOpen(true)}>
              <NotebookPen aria-hidden className="size-4" />
              Notes{campaign.notes?.length ? ` (${campaign.notes.length})` : ""}
            </button>
            <button type="button" className={button({ variant: "gray" })} onClick={() => setRenaming(true)}>
              <Pencil aria-hidden className="size-4" />
              Rename
            </button>
            <button type="button" aria-label="Delete campaign" className={button({ variant: "destructive", size: "icon" })} onClick={() => setDeleting(true)}>
              <Trash2 aria-hidden className="size-4" />
            </button>
          </div>
        )}
      </PageHeader>
      <div className={cn("flex flex-col gap-6 px-4 pb-10 lg:px-8", tab === "cities" ? "max-w-6xl" : "max-w-3xl")}>
        <Group footer="Adds this campaign’s Pokémon, moves, abilities and items to the Pokédex, indexes and generators on this device.">
          <Row
            title="Show in Pokédex & generators"
            value={<Switch aria-label="Show in Pokédex and generators" checked={shown(campaign.id)} onChange={(show) => setShown(campaign.id, show)} />}
          />
        </Group>
        <div className="flex flex-col gap-4">
          <Segmented
            label="Campaign content"
            idPrefix="campaign"
            options={tabs.map((entry) => ({ value: entry.value, label: entry.label }))}
            value={tab}
            onChange={(next) => setParams(next === "pokemon" ? {} : { tab: next }, { replace: true })}
          />
          <div {...segmentPanelProps("campaign", tab)}>
            {tab === "pokemon" && <CampaignPokemonTemplates />}
            {tab === "moves" && <CampaignMoves />}
            {tab === "abilities" && <CampaignAbilities />}
            {tab === "items" && <CampaignItems />}
            {tab === "cities" && <CampaignCities campaignId={campaign.id} />}
          </div>
        </div>
      </div>
      <NotesSheet
        title={`Notes for ${campaign.name}`}
        description="Private notes are yours alone. Public notes can be read by members of this campaign’s cities."
        notes={campaign.notes ?? []}
        open={notesOpen}
        onOpenChange={setNotesOpen}
        withVisibility
        placeholder="Plot hooks, NPCs, session recaps…"
        onSave={(notes) => saveNotes.mutate({ body: { id: campaign.id, notes } })}
      />
      <NameSheet
        open={renaming}
        onOpenChange={setRenaming}
        title="Rename campaign"
        initialName={campaign.name}
        submitLabel="Save"
        isPending={rename.isPending}
        onSubmit={(name) => rename.mutate({ body: { id: campaign.id, name } })}
      />
      <ConfirmDelete
        open={deleting}
        onOpenChange={setDeleting}
        name={campaign.name}
        description="Its Pokémon, moves, abilities and items are deleted too. This action cannot be undone."
        confirmLabel="Delete campaign"
        isPending={remove.isPending}
        onConfirm={() => remove.mutate({ pathParams: { id: campaign.id } })}
      />
    </>
  );
};

export const CampaignsPage = () => {
  const { id } = useParams();
  const desktop = useMediaQuery("(min-width: 1024px)");
  if (!id) return <CampaignList />;
  const detail = (
    <CampaignProvider key={id} id={id}>
      <CampaignDetail />
    </CampaignProvider>
  );
  if (!desktop) return detail;
  return (
    <div className="flex">
      <aside aria-label="Campaigns" className="sticky top-0 h-dvh w-80 shrink-0 overflow-y-auto border-r border-hairline xl:w-88">
        <CampaignList compact selectedId={id} />
      </aside>
      <div className="min-w-0 flex-1">{detail}</div>
    </div>
  );
};
