import { Box } from "@/components/Box";
import { LabeledField } from "@/components/LabeledField";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MoveCard } from "@/components/MoveCard";
import { AddMoveButton } from "@/components/pokemon-sheet/AddMoveSheet";
import { usePokemon } from "@/components/pokemon-sheet/context";
import {
  AbilityField,
  EditableTextField,
  HeldItemField,
  NatureField,
  RankField,
} from "@/components/pokemon-sheet/fields";
import { PokemonSheetHeader, type SheetButtons } from "@/components/pokemon-sheet/Header";
import { PokemonStatPips } from "@/components/pokemon-sheet/StatPips";
import { PokemonImage } from "@/components/PokemonImage";
import { StatBox } from "@/components/StatBox";
import { Text } from "@/components/Text";
import { POKEMON_SKILLS, getTotalStat } from "@/lib/stats";
import { capitalize } from "@/lib/utils";
export const PokemonSheet = ({ showButtons = "edit", showMovePools = false }: { showButtons?: SheetButtons; showMovePools?: boolean }) => {
  const { updatedPokemon: pokemon, editingMode, updatePokemon } = usePokemon();
  return pokemon === undefined ? (
    <div className="flex flex-row flex-grow justify-center items-center h-full">
      <LoadingSpinner />
    </div>
  ) : (
    <div className="pokemon-sheet grid grid-flow-row grid-cols-12 gap-2">
      <PokemonSheetHeader showButtons={showButtons} />
      <Box
        className="sheet-main p-2 grid grid-flow-row grid-cols-2 gap-2 col-span-full"
        color="bg-pokerole-beige"
      >
        <div className="flex flex-col space-y-2 flex-grow md:col-span-1 col-span-full">
          <Box
            color="bg-pokerole-beige"
            className="sheet-artwork p-2 flex flex-col items-center"
            withBorder={true}
          >
            <PokemonImage
              imageFileName={pokemon.pokemonTemplate.image}
              className=""
              type="book"
            />
          </Box>
          <div className="flex flex-row gap-2">
            <LabeledField
              color="bg-pokerole-black"
              label="HP"
              topLabel={`Max: ${getTotalStat(pokemon, "vitality") + pokemon.pokemonTemplate.baseHp}`}
              className="flex-grow"
            >
              <EditableTextField property="currentHp" />
            </LabeledField>
            <LabeledField
              color="bg-pokerole-black"
              label="Will"
              topLabel={`Max: ${getTotalStat(pokemon, "insight") + 3}`}
              className="flex-grow"
            >
              <EditableTextField property="currentWill" />
            </LabeledField>
          </div>
          <HeldItemField />
          <div className="flex md:flex-col 2xl:flex-row flex-row gap-2">
            <LabeledField
              color="bg-pokerole-black"
              label="Height"
              className="flex-grow"
            >
              <Text
                color="text-pokerole-black"
                className="text-center"
                size="text-base"
              >
                {pokemon.pokemonTemplate.height}m
              </Text>
            </LabeledField>
            <LabeledField
              color="bg-pokerole-black"
              label="Weight"
              className="flex-grow"
            >
              <Text
                color="text-pokerole-black"
                className="text-center"
                size="text-base"
              >
                {pokemon.pokemonTemplate.weight}kg
              </Text>
            </LabeledField>
          </div>
        </div>
        <div className="flex flex-col space-y-2 flex-grow md:col-span-1 col-span-full">
          <RankField />
          <AbilityField />
          <NatureField />
          <LabeledField color="bg-pokerole-black" label="Training Points">
            <EditableTextField
              property="trainingPoints"
              className="w-12 mx-auto"
            />
          </LabeledField>
          <StatBox
            statName="Happiness"
            color="bg-attributes-blue"
            pipRow={<PokemonStatPips stat="happiness" type="other" />}
          />
          <StatBox
            statName="Loyalty"
            color="bg-attributes-blue"
            pipRow={<PokemonStatPips stat="loyalty" type="other" />}
          />
        </div>
      </Box>
      <Box
        className="sheet-attributes p-2 space-y-2 col-span-full"
        color="bg-pokerole-beige"
      >
        <Text className="text-center">Attributes</Text>
        <StatBox
          statName="Strength"
          color="bg-attributes-blue"
          pipRow={
            <PokemonStatPips
              stat="strength"
              type="attribute"
              pipClassName="max-lg:w-5 max-lg:h-5 max-xs:w-4 max-xs:h-4"
              className="flex-wrap justify-center gap-y-0.5"
            />
          }
        />
        <StatBox
          statName="Dexterity"
          color="bg-attributes-blue"
          pipRow={
            <PokemonStatPips
              stat="dexterity"
              type="attribute"
              pipClassName="max-lg:w-5 max-lg:h-5 max-xs:w-4 max-xs:h-4"
              className="flex-wrap justify-center gap-y-0.5"
            />
          }
        />
        <StatBox
          statName="Vitality"
          color="bg-attributes-blue"
          pipRow={
            <PokemonStatPips
              stat="vitality"
              type="attribute"
              pipClassName="max-lg:w-5 max-lg:h-5 max-xs:w-4 max-xs:h-4"
              className="flex-wrap justify-center gap-y-0.5"
            />
          }
        />
        <StatBox
          statName="Special"
          color="bg-attributes-blue"
          pipRow={
            <PokemonStatPips
              stat="special"
              type="attribute"
              pipClassName="max-lg:w-5 max-lg:h-5 max-xs:w-4 max-xs:h-4"
              className="flex-wrap justify-center gap-y-0.5"
            />
          }
        />
        <StatBox
          statName="Insight"
          color="bg-attributes-blue"
          pipRow={
            <PokemonStatPips
              stat="insight"
              type="attribute"
              pipClassName="max-lg:w-5 max-lg:h-5 max-xs:w-4 max-xs:h-4"
              className="flex-wrap justify-center gap-y-0.5"
            />
          }
        />
      </Box>
      <Box
        color="bg-pokerole-beige"
        className="sheet-socials p-2 space-y-2 col-span-6"
      >
        <Text className="text-center">Socials</Text>
        <StatBox
          statName="Tough"
          color="bg-socials-tough"
          pipRow={
            <PokemonStatPips
              stat="tough"
              type="social"
              pipClassName="max-xs:w-4 max-xs:h-4"
            />
          }
        />
        <StatBox
          statName="Cool"
          color="bg-socials-cool"
          pipRow={
            <PokemonStatPips
              stat="cool"
              type="social"
              pipClassName="max-xs:w-4 max-xs:h-4"
            />
          }
        />
        <StatBox
          statName="Beauty"
          color="bg-socials-beauty"
          pipRow={
            <PokemonStatPips
              stat="beauty"
              type="social"
              pipClassName="max-xs:w-4 max-xs:h-4"
            />
          }
        />
        <StatBox
          statName="Cute"
          color="bg-socials-cute"
          pipRow={
            <PokemonStatPips
              stat="cute"
              type="social"
              pipClassName="max-xs:w-4 max-xs:h-4"
            />
          }
        />
        <StatBox
          statName="Clever"
          color="bg-socials-clever"
          pipRow={
            <PokemonStatPips
              stat="clever"
              type="social"
              pipClassName="max-xs:w-4 max-xs:h-4"
            />
          }
        />
      </Box>
      <Box
        color="bg-pokerole-red"
        className="sheet-skills p-2 flex flex-col flex-shrink col-span-6"
      >
        <Text className="text-center" size="text-xl">
          Skills
        </Text>
        <div className="sheet-skill-groups p-2">
          {[0, 4, 8].map((start) => (
            <div key={start} className="space-y-1">
              {POKEMON_SKILLS.slice(start, start + 4).map((skill) => (
                <div key={skill} className="flex flex-col items-center">
                  <Text color="text-pokerole-black" size="text-base">
                    {capitalize(skill)}
                  </Text>
                  <PokemonStatPips
                    stat={skill}
                    type="skill"
                    pipClassName="w-4 h-4 max-xs:w-3 max-xs:h-3"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Box>
      <div className="grid 2xl:grid-cols-4 md:grid-cols-2 gap-2 col-span-full">
        {pokemon.moves.map((move) => (
          <div
            key={move.name}
            className="md:col-span-1 col-span-full flex items-stretch"
          >
            <MoveCard
              move={move}
              pokemon={pokemon}
              initialOpen={!showMovePools}
              disableToggle={!showMovePools}
              showDelete={editingMode === "edit" || editingMode === "rankUp"}
              onDelete={() => {
                updatePokemon({
                  moves: pokemon.moves.filter((m) => m.id !== move.id),
                });
              }}
            />
          </div>
        ))}
        <AddMoveButton />
      </div>
    </div>
  );
};
