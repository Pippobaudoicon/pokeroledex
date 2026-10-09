import type { Nature } from "../../shared/types";
import { useNaturesControllerFindAll } from "@/api/components";
import { Combobox } from "@/components/Combobox";
import { Text } from "@/components/Text";
import { cn } from "@/lib/utils";

export interface NatureSelectProps {
  className?: string;
  comboBoxClassName?: string;
  labelClassName?: string;
  /** Shows the nature name as plain text instead of a combobox. */
  disabled?: boolean;
  /** Called with the picked nature, or undefined when cleared. */
  setSelectNature?: (nature: Nature | undefined) => void;
  nature?: Nature | null;
  placeholder?: string;
}

export const NatureSelect = ({
  className,
  comboBoxClassName,
  labelClassName,
  disabled = false,
  setSelectNature,
  nature,
  placeholder,
}: NatureSelectProps) => {
  const { data: natures } = useNaturesControllerFindAll({});
  const items = () =>
    natures == null
      ? []
      : natures.map((option) => ({
          label: <span className={labelClassName}>{option?.name ?? ""}</span>,
          value: option?.name.toLowerCase() ?? "",
          searchValue: option?.name ?? "",
        }));
  return (
    <div className={cn("flex flex-row items-center justify-center", className)}>
      {disabled ? (
        <Text className={cn("p-2 flex-grow justify-center text-center", labelClassName)}>
          {nature?.name ?? "-"}
        </Text>
      ) : (
        <Combobox
          items={items()}
          value={nature?.name.toLowerCase()}
          className={cn("flex-grow", comboBoxClassName)}
          disabled={disabled}
          onChange={(value) => {
            setSelectNature?.(
              natures?.find((option) => option?.name.toLowerCase() === value),
            );
          }}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};
