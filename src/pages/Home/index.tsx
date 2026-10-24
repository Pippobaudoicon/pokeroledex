import { Lightbulb, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { usePokemonControllerFindAllMinimal, useTrainersControllerFindAll } from "@/api/components";
import { button } from "@/components/kit/button";
import { Group, Row, RowIcon } from "@/components/kit/List";
import { PageHeader } from "@/components/kit/PageHeader";
import { RankBall } from "@/components/kit/Pills";
import { Pokeball } from "@/components/kit/Pokeball";
import { Sprite } from "@/components/kit/Sprite";
import { shinyRing } from "@/components/kit/Shiny";
import { IssueButton } from "@/layout/IssueButton";
import { navSections } from "@/layout/nav";
import { useSpotlight } from "@/layout/Spotlight";
import { cn } from "@/lib/utils";

const SearchField = () => {
  const { open } = useSpotlight();
  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      className="mt-3 flex h-11 w-full items-center gap-2 rounded-xl bg-fill px-3 text-body text-label-2 transition-colors hover:bg-fill-strong lg:h-9 lg:max-w-md lg:rounded-lg"
    >
      <Search aria-hidden className="size-4.5 lg:size-4" />
      Pokémon, moves, items, rules…
    </button>
  );
};

const MyPokemonStrip = () => {
  const { data, isFetching } = usePokemonControllerFindAllMinimal({});
  const list = data?.slice(0, 8);
  return (
    <Group
      title="My Pokémon"
      action={
        <Link to="/myPokemon" className="rounded-md px-1 text-subhead text-tint hover:bg-tint/10">
          See all
        </Link>
      }
    >
      {!list && isFetching ? (
        <div className="flex gap-3 p-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="skeleton h-24 w-20 rounded-xl" />
          ))}
        </div>
      ) : list?.length ? (
        <ul className="no-scrollbar flex snap-x gap-1 overflow-x-auto p-2">
          {list.map((pokemon) => (
            <li key={pokemon.id} className="snap-start">
              <Link
                to={`/myPokemon/${pokemon.id}`}
                className={cn("flex w-22 flex-col items-center gap-1 rounded-xl p-2 text-center transition-colors hover:bg-raised", pokemon.shiny && shinyRing)}
              >
                <span className="relative">
                  <Sprite image={pokemon.image} set="box" className="h-14 w-17" />
                  <RankBall rank={pokemon.rank} className="absolute -right-1 -bottom-1 size-4" />
                </span>
                <span className="w-full truncate text-footnote font-medium">{pokemon.name}{pokemon.shiny && <span className="sr-only"> (shiny)</span>}</span>
              </Link>
            </li>
          ))}
          <li className="snap-start">
            <Link to="/pokemon" className="flex h-full w-22 flex-col items-center justify-center gap-1 rounded-xl p-2 text-tint hover:bg-tint/10">
              <Plus aria-hidden className="size-6" />
              <span className="text-footnote font-medium">Add</span>
            </Link>
          </li>
        </ul>
      ) : (
        <div className="flex items-center gap-3 p-4">
          <Pokeball className="size-10 shrink-0 text-label-3" strokeWidth={6} />
          <p className="flex-1 text-subhead text-label-2">No Pokémon yet. Find one in the Pokédex and add it to start a sheet.</p>
          <Link to="/pokemon" className={button({ variant: "tinted", size: "sm" })}>
            Browse
          </Link>
        </div>
      )}
    </Group>
  );
};

const TrainersGroup = () => {
  const { data, isFetching } = useTrainersControllerFindAll({});
  const list = data?.slice(0, 3);
  return (
    <Group
      title="Trainers"
      action={
        <Link to="/myTrainers" className="rounded-md px-1 text-subhead text-tint hover:bg-tint/10">
          See all
        </Link>
      }
    >
      {!list && isFetching ? (
        <div className="skeleton m-3 h-8 rounded-lg" />
      ) : list?.length ? (
        list.map((trainer) => (
          <Row
            key={trainer.id}
            to={`/myTrainers/${trainer.id}`}
            title={trainer.name}
            subtitle={`${trainer.pokemon.length} Pokémon`}
            icon={<RankBall rank={trainer.rank} className="size-6" />}
          />
        ))
      ) : (
        <Row to="/myTrainers" title="Create a trainer" subtitle="Party, bag and money in one sheet" icon={<RowIcon className="bg-[#1d4ed8]"><Plus /></RowIcon>} />
      )}
    </Group>
  );
};

export const HomePage = () => (
  <div className="mx-auto max-w-6xl pb-10">
    <PageHeader title="PokéroleDex">
      <p className="text-subhead text-label-2">Your Pokérole table companion.</p>
      <SearchField />
    </PageHeader>
    <div className="flex flex-col gap-6 px-4 lg:px-8">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2 lg:gap-5">
        <MyPokemonStrip />
        <TrainersGroup />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-3 lg:gap-5">
        {navSections.map((section) => (
          <Group key={section.title} title={section.title}>
            {section.items.map((item) => (
              <Row
                key={item.to}
                to={item.to}
                title={item.label}
                subtitle={<span className="line-clamp-1">{item.hint}</span>}
                icon={<RowIcon className={cn(item.tile, "[&>svg]:size-4")}>{item.icon}</RowIcon>}
              />
            ))}
            {section.title === "Tools" && (
              <IssueButton
                trigger={
                  <Row
                    onClick={() => {}}
                    title="Suggest a feature"
                    subtitle={<span className="line-clamp-1">Share an idea for improving PokéroleDex</span>}
                    icon={<RowIcon className="bg-[#a16207]"><Lightbulb /></RowIcon>}
                    aria-label="Suggest a feature"
                  />
                }
              />
            )}
          </Group>
        ))}
      </div>
    </div>
  </div>
);
