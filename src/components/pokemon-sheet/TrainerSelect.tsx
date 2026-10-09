import { FaArrowRight } from "react-icons/fa6";
import { Link } from "react-router-dom";
import type * as T from "../../../shared/types";
import { useTrainersControllerFindAll } from "@/api/components";
import { Combobox } from "@/components/Combobox";
import { usePokemon } from "@/components/pokemon-sheet/context";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
const TrainerSelect = ({
  className,
  comboBoxClassName,
  labelClassName,
  disabled = false,
  setSelectTrainer,
  trainer,
  placeholder,
}: {
  className?: string;
  comboBoxClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
  setSelectTrainer?: (trainer: T.Trainer | undefined) => void;
  trainer?: T.TrainerRecord | null;
  placeholder?: string;
}) => {
  const { data: trainers } = useTrainersControllerFindAll({});
  const trainerItems = () =>
    trainers == null
      ? []
      : [...trainers]
          .sort((a, b) =>
            (a?.name ?? "").localeCompare(b?.name ?? "", undefined, {
              sensitivity: "base",
            }),
          )
          .map((option) => ({
            label: <span>{option?.name ?? ""}</span>,
            value: option?.id ?? "",
            searchValue: option?.name ?? "",
          }));
  return (
    <div className={cn("flex flex-row items-center justify-center", className)}>
      {disabled ? (
        <Text className={cn("p-2 flex-grow justify-center text-center", labelClassName)}>
          {trainer?.name ?? "-"}
        </Text>
      ) : (
        <Combobox
          items={trainerItems()}
          value={trainer?.id}
          className={cn("flex-grow", comboBoxClassName)}
          disabled={disabled}
          onChange={(value: string) => {
            setSelectTrainer?.(trainers?.find((candidate) => candidate?.id === value));
          }}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};
export const PokemonTrainerField = () => {
  const { updatedPokemon, updatePokemon } = usePokemon();
  return (
    <div className="flex flex-row items-center space-x-1">
      <TrainerSelect
        trainer={updatedPokemon?.trainer}
        className="flex-grow"
        comboBoxClassName="text-lg p-1 pl-2"
        setSelectTrainer={(trainer) => {
          if (updatedPokemon != null)
            updatePokemon({
              trainer,
            });
        }}
      />
      {updatedPokemon?.trainer != null && (
        <Link to={`/myTrainers/${updatedPokemon.trainer.id}`}>
          <Button variant="blue" size="equalPadding">
            <FaArrowRight size={20} />
          </Button>
        </Link>
      )}
    </div>
  );
};
