import { useQueryClient } from "@tanstack/react-query";
import { useMediaQuery } from "@uidotdev/usehooks";
import { Plus, Search, UserRound, Users } from "lucide-react";
import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useNaturesControllerFindAll, useTrainersControllerCreate, useTrainersControllerFindAll } from "@/api/components";
import { Rank } from "@/api/schemas";
import { button } from "@/components/kit/button";
import { Row } from "@/components/kit/List";
import { PageHeader } from "@/components/kit/PageHeader";
import { Picker } from "@/components/kit/Picker";
import { RankBall, RankBadge } from "@/components/kit/Pills";
import { Sheet } from "@/components/kit/Sheet";
import { fold } from "@/hooks/use-dex";
import { useToast } from "@/hooks/use-toast";
import { cn, formatEnumName } from "@/lib/utils";
import { TrainerProvider } from "@/pages/MyTrainers/context";
import { TrainerSheet } from "@/pages/MyTrainers/TrainerSheet";

const CreateTrainer = () => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [age, setAge] = React.useState(0);
  const [natureId, setNatureId] = React.useState("");
  const [rank, setRank] = React.useState<Rank>(Rank.UNRANKED);
  const { data: natures } = useNaturesControllerFindAll({});
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate, isPending } = useTrainersControllerCreate({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
      setOpen(false);
      setName("");
      setAge(0);
      setNatureId("");
      setRank(Rank.UNRANKED);
      toast({ title: "Trainer added" });
    },
    onError: () => toast({ title: "Trainer couldn’t be added", description: "Please try again." }),
  });
  const inputClass =
    "h-11 w-full rounded-xl bg-fill px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus lg:h-9 lg:rounded-lg";
  return (
    <>
      <button type="button" aria-label="Add trainer" onClick={() => setOpen(true)} className={button({ variant: "plain", size: "sm" })}>
        <Plus aria-hidden className="size-4" />
        Add
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Add trainer" initialExpanded>
        <form
          className="flex flex-col gap-4 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) mutate({ body: { name: name.trim(), age, rank, natureId: natureId || undefined } });
          }}
        >
          <label className="flex flex-col gap-1.5 text-subhead font-medium">
            Name
            <input
              required
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
              placeholder="Trainer name"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-subhead font-medium">
            Age
            <input type="number" min={0} value={age} onChange={(event) => setAge(Number(event.target.value))} className={inputClass} />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-subhead font-medium">Nature</span>
            <Picker
              label="Nature"
              items={(natures ?? []).map((nature) => ({ value: nature.id, label: nature.name }))}
              value={natureId}
              onChange={setNatureId}
            />
          </div>
          <label className="flex flex-col gap-1.5 text-subhead font-medium">
            Rank
            <select value={rank} onChange={(event) => setRank(event.target.value as Rank)} className={inputClass}>
              {Object.values(Rank).map((entry) => (
                <option key={entry} value={entry}>
                  {formatEnumName(entry)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={isPending || !name.trim()} className={button({ variant: "filled" })}>
            {isPending ? "Adding…" : "Add trainer"}
          </button>
        </form>
      </Sheet>
    </>
  );
};

const TrainerList = ({ compact = false, selectedId }: { compact?: boolean; selectedId?: string }) => {
  const { data: trainers, isError, refetch } = useTrainersControllerFindAll({});
  const [query, setQuery] = React.useState("");
  const list = React.useMemo(
    () => trainers?.filter((trainer) => fold(trainer.name).includes(fold(query.trim()))).sort((a, b) => a.name.localeCompare(b.name)),
    [trainers, query],
  );
  return (
    <>
      <PageHeader title="Trainers" compact={compact} actions={<CreateTrainer />}>
        <p className="text-subhead text-label-2">Your trainers, their party and everything they carry.</p>
        <label className="relative mt-3 flex items-center lg:max-w-md">
          <span className="sr-only">Search trainers</span>
          <Search aria-hidden className="pointer-events-none absolute left-3 size-4.5 text-label-2 lg:left-2.5 lg:size-4" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search trainers"
            className="h-11 w-full rounded-xl bg-fill pr-3 pl-10 text-body outline-none placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-focus lg:h-8 lg:rounded-lg lg:pl-8"
          />
        </label>
      </PageHeader>
      {compact && (
        <label className="mx-3 my-3 block">
          <span className="sr-only">Search trainers</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search trainers"
            className="h-8 w-full rounded-lg bg-fill px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus"
          />
        </label>
      )}
      <div className={cn("px-4 pb-8", compact ? "lg:px-3" : "lg:px-8")}>
        {isError ? (
          <div className="rounded-xl bg-surface p-6 text-center shadow-card">
            <p className="mb-3 text-body">Trainers couldn’t be loaded.</p>
            <button type="button" className={button({ variant: "tinted" })} onClick={() => refetch()}>
              Try again
            </button>
          </div>
        ) : !list ? (
          <div aria-hidden className="skeleton h-40 rounded-xl" />
        ) : !trainers?.length ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-8 text-center shadow-card">
            <Users aria-hidden className="size-12 text-tint" />
            <h2 className="text-title-3 font-semibold">No trainers yet</h2>
            <p className="max-w-sm text-subhead text-label-2">Create a trainer to keep their party, stats and inventory together.</p>
            <CreateTrainer />
          </div>
        ) : !list.length ? (
          <div className="rounded-xl bg-surface p-6 text-center shadow-card">
            <p className="text-body">No trainers named “{query}”.</p>
            <button type="button" onClick={() => setQuery("")} className={cn(button({ variant: "tinted" }), "mt-3")}>
              Clear search
            </button>
          </div>
        ) : (
          <>
            <p className="mb-3 px-1 text-footnote font-medium text-label-2" aria-live="polite">
              {list.length} {list.length === 1 ? "trainer" : "trainers"}
            </p>
            {compact ? (
              <div className="overflow-hidden rounded-xl bg-surface shadow-card">
                {list.map((trainer) => (
                  <Row
                    key={trainer.id}
                    to={`/myTrainers/${trainer.id}`}
                    replace
                    title={trainer.name}
                    subtitle={`${trainer.pokemon.length} Pokémon · ${formatEnumName(trainer.rank)}`}
                    icon={<RankBall rank={trainer.rank} className="size-6" />}
                    className={trainer.id === selectedId ? "bg-tint/10" : undefined}
                  />
                ))}
              </div>
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,220px)] justify-center gap-4 sm:justify-start">
                {list.map((trainer) => (
                  <li key={trainer.id}>
                    <Link
                      to={`/myTrainers/${trainer.id}`}
                      className="flex h-full flex-col items-center gap-3 rounded-2xl bg-surface p-5 text-center shadow-card transition-colors hover:bg-raised"
                    >
                      <span className="grid size-16 place-items-center rounded-full bg-tint/10 text-tint">
                        <UserRound aria-hidden className="size-8" />
                      </span>
                      <span className="line-clamp-2 w-full text-body font-semibold">{trainer.name}</span>
                      <RankBadge rank={trainer.rank} />
                      <span className="text-footnote text-label-2">
                        {trainer.pokemon.length} Pokémon · Age {trainer.age}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
};

export const MyTrainersPage = () => {
  const { id } = useParams();
  const desktop = useMediaQuery("(min-width: 1024px)");
  if (!id)
    return (
      <div className="mx-auto max-w-6xl">
        <TrainerList />
      </div>
    );
  const sheet = (
    <TrainerProvider key={id} id={id} editingMode="view">
      <TrainerSheet />
    </TrainerProvider>
  );
  if (!desktop) return sheet;
  return (
    <div className="flex">
      <aside aria-label="Trainers" className="sticky top-0 h-dvh w-80 shrink-0 overflow-y-auto border-r border-hairline xl:w-88">
        <TrainerList compact selectedId={id} />
      </aside>
      <div className="min-w-0 flex-1">{sheet}</div>
    </div>
  );
};
