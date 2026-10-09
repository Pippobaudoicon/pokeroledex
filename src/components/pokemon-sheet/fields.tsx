import { useDebounce } from "@uidotdev/usehooks";
import * as React from "react";
import { useItemsControllerFindAll } from "@/api/components";
import { Rank } from "@/api/schemas";
import { ClickTooltip } from "@/components/ClickTooltip";
import { Combobox } from "@/components/Combobox";
import { ItemCard } from "@/components/ItemCard";
import { ItemImage } from "@/components/ItemImage";
import { LabeledField } from "@/components/LabeledField";
import { NatureSelect } from "@/components/NatureSelect";
import { usePokemon } from "@/components/pokemon-sheet/context";
import { RankIcon } from "@/components/RankIcon";
import { Text } from "@/components/Text";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
/** Text input bound to one number field of the Pokemon; saves after 500ms of no typing and on blur. */
export const EditableTextField = ({
  property,
  className,
}: {
  property: "currentHp" | "currentWill" | "trainingPoints";
  className?: string;
}) => {
  const { updatedPokemon, updatePokemon } = usePokemon();
  const [value, setValue] = React.useState<string | number>(
    updatedPokemon != null ? updatedPokemon[property] : "",
  );
  const debouncedValue = useDebounce(value, 500);
  React.useEffect(() => {
    if (updatedPokemon === undefined) return;
    let newValue =
      typeof updatedPokemon[property] == "number"
        ? parseInt(value?.toString() ?? "")
        : debouncedValue;
    if (typeof newValue == "number" && isNaN(newValue)) newValue = 0;
    if (updatedPokemon[property] !== newValue)
      updatePokemon({
        [property]: newValue,
      });
  }, [debouncedValue]);
  React.useEffect(() => {
    if (updatedPokemon !== undefined) setValue(updatedPokemon[property]);
  }, [updatedPokemon]);
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };
  if (updatedPokemon === undefined) return <div>Loading...</div>;
  if (typeof updatedPokemon[property] != "number" && typeof updatedPokemon[property] != "string")
    throw new Error(
      `Value ${JSON.stringify(updatedPokemon[property])} of ValueInput is not a number or text`,
    );
  return (
    <Input
      className={`border-none rounded-md p-0 text-3xl text-center leading-none ${className}`}
      value={value}
      onChange={handleChange}
      onBlur={() =>
        updatePokemon({
          [property]: typeof updatedPokemon[property] === "number" ? parseInt(String(value)) || 0 : value,
        })
      }
    />
  );
};
export const RankField = () => {
  const { updatedPokemon, editingMode, updatePokemon } = usePokemon();
  return (
    <LabeledField
      color="bg-pokerole-black"
      label="Rank"
      className="p-0"
      valueClassName="p-0"
    >
      <div className="flex flex-row items-center">
        <Combobox
          items={Object.keys(Rank).map((rank) => ({
            label: (
              <div className="flex items-center space-x-1">
                <RankIcon rank={Rank[rank as keyof typeof Rank]} size="md" />{" "}
                <span className="xl:text-xl 2xl:text-3xl">{rank}</span>
              </div>
            ),
            value: rank.toLowerCase(),
            searchValue: rank,
          }))}
          value={updatedPokemon?.rank.toLowerCase()}
          className="flex-grow"
          disabled={editingMode !== "edit"}
          onChange={(value) => {
            if (updatedPokemon !== undefined)
              updatePokemon({
                rank: value.toUpperCase() as Rank,
              });
          }}
        />
      </div>
    </LabeledField>
  );
};
export const AbilityField = () => {
  const { updatedPokemon, editingMode, updatePokemon } = usePokemon();
  const abilityItems = () => {
    if (updatedPokemon == null) return [];
    const { abilityOne, abilityTwo, hiddenAbility, eventAbility } = updatedPokemon.pokemonTemplate;
    return [abilityOne, abilityTwo, hiddenAbility, eventAbility]
      .filter((ability) => ability != null)
      .map((ability) => ({
        label: (
          <React.Fragment key={ability?.id}>
            <ClickTooltip
              trigger={<span>{ability?.name}</span>}
              content={
                <div className="max-w-96 whitespace-normal">
                  <span className="font-move text-lg">{ability?.effect}</span>
                </div>
              }
            />
          </React.Fragment>
        ),
        value: ability?.name.toLowerCase() ?? "",
        searchValue: ability?.name ?? "",
      }));
  };
  return (
    <LabeledField
      color="bg-pokerole-black"
      label="Ability"
      className="p-0"
      valueClassName="p-0"
    >
      <div className="flex flex-row items-center">
        {editingMode !== "edit" ? (
          <Text className="p-2 text-center items-center flex flex-grow">
            <ClickTooltip
              trigger={
                <span className="xl:text-xl 2xl:text-3xl flex-grow">
                  {updatedPokemon?.ability?.name ?? "-"}
                </span>
              }
              content={
                <div className="whitespace-normal max-md:max-w-[92vw] md:max-w-96">
                  <span className="font-move text-lg">
                    {updatedPokemon?.ability?.effect ?? "Please select an ability"}
                  </span>
                </div>
              }
            />
          </Text>
        ) : (
          <Combobox
            items={abilityItems()}
            value={updatedPokemon?.ability?.name.toLowerCase()}
            className="flex-grow"
            disabled={editingMode !== "edit"}
            onChange={(value) => {
              if (updatedPokemon === undefined) return;
              const { abilityOne, abilityTwo, hiddenAbility, eventAbility } =
                updatedPokemon.pokemonTemplate;
              const ability = [abilityOne, abilityTwo, hiddenAbility, eventAbility].find(
                (candidate) => candidate?.name.toLowerCase() === value,
              );
              if (ability !== undefined)
                updatePokemon({
                  ability,
                });
            }}
          />
        )}
      </div>
    </LabeledField>
  );
};
export const NatureField = () => {
  const { updatedPokemon, editingMode, updatePokemon } = usePokemon();
  return (
    <LabeledField
      color="bg-pokerole-black"
      label="Nature"
      className="p-0"
      valueClassName="p-0"
    >
      <NatureSelect
        nature={updatedPokemon?.nature}
        setSelectNature={(nature) => {
          if (updatedPokemon != null && nature != null)
            updatePokemon({
              nature,
            });
        }}
        disabled={editingMode !== "edit"}
        className="xl:text-xl 2xl:text-3xl"
      />
    </LabeledField>
  );
};
export const HeldItemField = () => {
  const { updatedPokemon, editingMode, updatePokemon } = usePokemon();
  const { data: items } = useItemsControllerFindAll({});
  if (updatedPokemon == null) return <></>;
  const itemOptions = () =>
    items == null
      ? []
      : [...items]
          .sort((a, b) =>
            (a?.name ?? "").localeCompare(b?.name ?? "", undefined, {
              sensitivity: "base",
            }),
          )
          .map((item) => ({
            label: (
              <div
                key={item?.id}
                className="flex flex-row gap-1 justify-center items-center flex-wrap"
              >
                <ItemImage imageFileName={item?.image} className="w-8" />
                <span className="text-xl">{item?.name}</span>
              </div>
            ),
            value: item?.name.toLowerCase() ?? "",
            searchValue: item?.name ?? "",
          }));
  return (
    <LabeledField
      color="bg-pokerole-black"
      label="Held item"
      valueClassName={editingMode === "edit" ? "p-0" : ""}
    >
      {editingMode !== "edit" ? (
        <Popover>
          <PopoverTrigger asChild={true}>
            <div className="flex flex-row gap-1 justify-center items-center">
              {updatedPokemon.heldItem != null && (
                <ItemImage imageFileName={updatedPokemon.heldItem?.image} className="w-8" />
              )}
              <Text size="text-xl">{updatedPokemon.heldItem?.name ?? "None"}</Text>
            </div>
          </PopoverTrigger>
          {updatedPokemon.heldItem != null && (
            <PopoverContent className="p-0 bg-transparent border-none shadow-none">
              <ItemCard item={updatedPokemon.heldItem} />
            </PopoverContent>
          )}
        </Popover>
      ) : (
        <Combobox
          items={itemOptions()}
          value={updatedPokemon.heldItem?.name.toLowerCase()}
          className="flex-grow text-xl w-full"
          disabled={editingMode !== "edit"}
          onChange={(value) => {
            const heldItem = items?.find((item) => item?.name.toLowerCase() === value);
            if (updatedPokemon != null)
              updatePokemon({
                heldItem,
              });
          }}
        />
      )}
    </LabeledField>
  );
};
