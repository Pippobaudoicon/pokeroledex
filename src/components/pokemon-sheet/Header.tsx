import { Box } from "@/components/Box";
import {
  AddToMyPokemon,
  LockButton,
  SheetActions,
} from "@/components/pokemon-sheet/actions";
import { usePokemon } from "@/components/pokemon-sheet/context";
import { GenderToggle } from "@/components/pokemon-sheet/GenderToggle";
import { PokemonTrainerField } from "@/components/pokemon-sheet/TrainerSelect";
import { Text } from "@/components/Text";
import { TypeBadges } from "@/components/TypeBadges";
/** Which action buttons the sheet header shows. */
export type SheetButtons = "edit" | "add" | "addAndLock";
export const PokemonSheetHeader = ({ showButtons }: { showButtons: SheetButtons }) => {
  const { basePokemon, updatedPokemon, isLoading } = usePokemon();
  return (
    <Box
      color="bg-pokerole-black"
      className="pokemon-sheet-header p-2 col-span-full grid grid-cols-12 gap-2 items-center"
    >
      {isLoading && <Text color="text-white">Loading...</Text>}
      {!isLoading && basePokemon == null && <Text color="text-white">No Pokemon found</Text>}
      {basePokemon != null && updatedPokemon != null && (
        <>
          <div
            className={`xl:col-span-4 sm:col-span-6 col-span-full flex flex-row space-x-1 items-center ${showButtons === "addAndLock" ? "xl:col-span-5 sm:col-span-6" : ""}`}
          >
            <Text color="text-white">
              {"Name: "}
              {basePokemon.pokemonTemplate.name}
            </Text>
            <GenderToggle />
          </div>
          <div
            className={`text-white text-3xl font-square leading-none flex flex-row items-center space-x-2 flex-wrap xl:col-span-3 sm:col-span-6 col-span-full ${showButtons === "addAndLock" ? "xl:col-span-5 sm:col-span-6" : ""}`}
          >
            <Text color="text-white">Type:</Text>
            <TypeBadges
              typeOne={basePokemon.pokemonTemplate.types[0]}
              typeTwo={basePokemon.pokemonTemplate.types[1]}
            />
          </div>
          {showButtons !== "addAndLock" && (
            <div className="flex flex-row items-center space-x-2 xl:col-span-3 sm:col-span-6 col-span-full flex-wrap">
              <Text color="text-white">Trainer:</Text>
              <PokemonTrainerField />
            </div>
          )}
          <div
            className={`flex flex-row md:justify-end justify-center space-x-1 text-white leading-none xl:col-span-2 sm:col-span-6 col-span-full ${showButtons === "addAndLock" ? "xl:col-span-2 sm:col-span-6" : ""}`}
          >
            {showButtons === "edit" && <SheetActions />}
            {showButtons === "add" && <AddToMyPokemon />}
            {showButtons === "addAndLock" && (
              <>
                <AddToMyPokemon />
                <LockButton />
              </>
            )}
          </div>
        </>
      )}
    </Box>
  );
};
