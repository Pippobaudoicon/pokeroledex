import { Gender } from "@/api/schemas";
import { GenderIcon } from "@/components/GenderIcon";
import { usePokemon } from "@/components/pokemon-sheet/context";
export const GenderToggle = ({ className }: { className?: string }) => {
  const { updatedPokemon, updatePokemon } = usePokemon();
  const toggleGender = () => {
    if (updatedPokemon != null && updatedPokemon.pokemonTemplate.genderType === "")
      updatePokemon({
        gender: updatedPokemon.gender === Gender.M ? Gender.F : Gender.M,
      });
  };
  return (
    <div className="hover:cursor-pointer hover:bg-pokerole-black-light rounded-3xl p-1">
      {updatedPokemon != null && (
        <GenderIcon onClick={toggleGender} gender={updatedPokemon.gender} className={className} />
      )}
    </div>
  );
};
