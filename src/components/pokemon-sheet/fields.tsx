import * as React from "react";
import type * as T from "../../../shared/types";
import { Link } from "react-router-dom";
import { useItemsControllerFindAll, useNaturesControllerFindAll, useTrainersControllerFindAll } from "@/api/components";
import { Rank } from "@/api/schemas";
import { Group, Row } from "@/components/kit/List";
import { Picker } from "@/components/kit/Picker";
import { RankBall } from "@/components/kit/Pills";
import { usePokemon } from "@/components/pokemon-sheet/context";
import { formatEnumName } from "@/lib/utils";

type NumberField = "currentHp" | "currentWill" | "trainingPoints";

/**
 * Draft text for a number on the sheet. Typing and stepping update it at once; the Pokémon is updated
 * 400ms after the last change (or on blur), because in view mode every update is saved to the server.
 */
export const useNumberDraft = (property: NumberField) => {
  const { updatedPokemon, updatePokemon } = usePokemon();
  const stored = updatedPokemon?.[property] ?? 0;
  const [draft, setDraft] = React.useState(String(stored));
  React.useEffect(() => setDraft(String(stored)), [stored]);
  const commit = (text = draft) => {
    const value = Number.parseInt(text, 10);
    if (!Number.isNaN(value) && value !== stored) updatePokemon({ [property]: value });
  };
  React.useEffect(() => {
    const timer = setTimeout(commit, 400);
    return () => clearTimeout(timer);
  }, [draft]);
  return { draft, setDraft, commit, value: Number.parseInt(draft, 10) || 0 };
};

const fieldLabel = "w-28 shrink-0 text-body text-label lg:w-24";

const FieldRow = ({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) => (
  <div className="flex min-h-12 items-center gap-3 border-b border-hairline py-1.5 pr-2 pl-4 last:border-b-0 lg:min-h-10 lg:pl-3">
    {htmlFor ? (
      <label htmlFor={htmlFor} className={fieldLabel}>
        {label}
      </label>
    ) : (
      <span className={fieldLabel}>{label}</span>
    )}
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

const abilitiesOf = (template: T.PokemonTemplate) =>
  [template.abilityOne, template.abilityTwo, template.hiddenAbility, template.eventAbility].filter((ability): ability is T.Ability => ability != null);

const NaturePicker = ({ pokemon }: { pokemon: T.Pokemon }) => {
  const { updatePokemon } = usePokemon();
  const { data, isFetching } = useNaturesControllerFindAll({});
  const items = React.useMemo(() => (data ?? []).map((nature) => ({ value: nature.id, label: nature.name, detail: nature.nature })), [data]);
  return (
    <Picker
      label="Nature"
      items={items}
      loading={isFetching}
      value={pokemon.nature?.id ?? ""}
      clearable={false}
      onChange={(id) => {
        const nature = data?.find((candidate) => candidate.id === id);
        if (nature) updatePokemon({ nature });
      }}
    />
  );
};

const ItemPicker = ({ pokemon }: { pokemon: T.Pokemon }) => {
  const { updatePokemon } = usePokemon();
  const { data, isFetching } = useItemsControllerFindAll({});
  const items = React.useMemo(
    () =>
      (data ?? [])
        .map((item) => ({ value: item.id, label: item.name, detail: item.pocket ? formatEnumName(item.pocket) : undefined }))
        .sort((first, second) => first.label.localeCompare(second.label)),
    [data],
  );
  return (
    <Picker
      label="Held item"
      items={items}
      loading={isFetching}
      value={pokemon.heldItem?.id ?? ""}
      placeholder="None"
      onChange={(id) => updatePokemon({ heldItem: data?.find((item) => item.id === id) ?? null })}
    />
  );
};

const TrainerPicker = ({ pokemon }: { pokemon: T.Pokemon }) => {
  const { updatePokemon } = usePokemon();
  const { data, isFetching } = useTrainersControllerFindAll({});
  const items = React.useMemo(
    () => (data ?? []).map((trainer) => ({ value: trainer.id, label: trainer.name })).sort((first, second) => first.label.localeCompare(second.label)),
    [data],
  );
  return (
    <div className="flex items-center gap-1">
      <Picker
        label="Trainer"
        className="flex-1"
        items={items}
        loading={isFetching}
        value={pokemon.trainer?.id ?? ""}
        placeholder="No trainer"
        onChange={(id) => updatePokemon({ trainer: data?.find((trainer) => trainer.id === id) ?? null })}
      />
      {pokemon.trainer && (
        <Link to={`/myTrainers/${pokemon.trainer.id}`} className="shrink-0 rounded-lg px-2 py-2 text-subhead font-semibold text-tint hover:bg-tint/10">
          Open
        </Link>
      )}
    </div>
  );
};

const TrainingPoints = () => {
  const { draft, setDraft, commit } = useNumberDraft("trainingPoints");
  return (
    <input
      id="training-points"
      type="number"
      inputMode="numeric"
      min={0}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => commit()}
      className="h-11 w-20 rounded-xl bg-fill px-3 text-body tabular-nums lg:h-8 lg:rounded-lg"
    />
  );
};

/** Ability, nature, held item, trainer and rank. Pickers only appear in edit mode, as before. */
export const InfoGroups = ({ showTrainer = true }: { showTrainer?: boolean }) => {
  const { updatedPokemon: pokemon, editingMode, updatePokemon } = usePokemon();
  if (!pokemon) return null;
  const editing = editingMode === "edit";
  const shinyId = React.useId();
  const abilities = abilitiesOf(pokemon.pokemonTemplate);
  return (
    <div className="flex flex-col gap-6 @3xl:gap-5">
      <Group title="Ability">
        {editing ? (
          <div className="p-2">
            <Picker
              label="Ability"
              items={abilities.map((ability) => ({ value: ability.id, label: ability.name, detail: ability.effect }))}
              value={pokemon.ability?.id ?? ""}
              clearable={false}
              placeholder="Choose an ability"
              onChange={(id) => {
                const ability = abilities.find((candidate) => candidate.id === id);
                if (ability) updatePokemon({ ability });
              }}
            />
          </div>
        ) : null}
        {pokemon.ability ? (
          <div className="px-4 py-2.5 lg:px-3 lg:py-2">
            <p className="text-body font-semibold">{pokemon.ability.name}</p>
            <p className="mt-0.5 text-subhead text-label-2">{pokemon.ability.effect}</p>
          </div>
        ) : (
          !editing && <p className="px-4 py-3 text-subhead text-label-2 lg:px-3">No ability chosen. Use Edit to pick one.</p>
        )}
      </Group>
      <Group title="Details">
        <FieldRow label="Rank">
          {editing ? (
            <Picker
              label="Rank"
              items={Object.values(Rank).map((rank) => ({ value: rank, label: formatEnumName(rank) }))}
              value={pokemon.rank}
              clearable={false}
              onChange={(rank) => updatePokemon({ rank: rank as T.Rank })}
            />
          ) : (
            <span className="inline-flex items-center gap-1.5 text-body text-label-2">
              <RankBall rank={pokemon.rank} />
              {formatEnumName(pokemon.rank)}
            </span>
          )}
        </FieldRow>
        <FieldRow label="Nature">
          {editing ? <NaturePicker pokemon={pokemon} /> : <span className="text-body text-label-2">{pokemon.nature ? `${pokemon.nature.name} · ${pokemon.nature.nature} · Confidence ${pokemon.nature.confidence}` : "None"}</span>}
        </FieldRow>
        {editing && (
          <FieldRow label="Shiny" htmlFor={shinyId}>
            <input
              id={shinyId}
              type="checkbox"
              checked={pokemon.shiny ?? false}
              onChange={(event) => updatePokemon({ shiny: event.target.checked })}
              className="size-5 accent-pokerole-yellow lg:size-4"
            />
          </FieldRow>
        )}
        <FieldRow label="Held item">
          {editing ? <ItemPicker pokemon={pokemon} /> : <span className="text-body text-label-2">{pokemon.heldItem?.name ?? "None"}</span>}
        </FieldRow>
        {showTrainer && (
          <FieldRow label="Trainer">
            <TrainerPicker pokemon={pokemon} />
          </FieldRow>
        )}
        <FieldRow label="Training points" htmlFor="training-points">
          <TrainingPoints />
        </FieldRow>
      </Group>
      {pokemon.heldItem?.description && (
        <Group title={pokemon.heldItem.name}>
          <p className="px-4 py-3 text-subhead text-label-2 lg:px-3">{pokemon.heldItem.description}</p>
        </Group>
      )}
      <Group title="Species">
        <Row title="Height" value={`${pokemon.pokemonTemplate.height} m`} />
        <Row title="Weight" value={`${pokemon.pokemonTemplate.weight} kg`} />
        <Row title="Pokédex entry" to={`/pokemon/${pokemon.pokemonTemplate.id}`} />
      </Group>
    </div>
  );
};
