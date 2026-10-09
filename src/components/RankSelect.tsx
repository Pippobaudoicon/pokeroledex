import { Textfit } from "react-textfit";
import { Rank } from "@/api/schemas";
import { Combobox } from "@/components/Combobox";
import { RankIcon, type RankIconProps } from "@/components/RankIcon";
import { Text } from "@/components/Text";
import { cn } from "@/lib/utils";

export interface RankSelectProps {
  className?: string;
  comboBoxClassName?: string;
  iconSize?: RankIconProps["size"];
  /** Shows the rank as plain text instead of a combobox. */
  disabled?: boolean;
  /** Called with the picked rank, or undefined when cleared. */
  onSelect?: (rank: Rank | undefined) => void;
  rank?: Rank | null;
  placeholder?: string;
}

export const RankSelect = ({
  className,
  comboBoxClassName,
  iconSize = "md",
  disabled = false,
  onSelect,
  rank,
  placeholder,
}: RankSelectProps) => {
  const items = () =>
    Object.values(Rank).map((value) => ({
      label: (
        <div className="flex items-center justify-center space-x-1">
          <RankIcon rank={Rank[value]} size={iconSize} />{" "}
          <Textfit className="md:max-w-20">{value}</Textfit>
        </div>
      ),
      value: value.toLowerCase(),
      searchValue: value,
    }));
  return (
    <div className={cn("flex flex-row items-center", className)}>
      {disabled ? (
        <Text className="p-2 text-center flex-grow">
          {rank?.replace("_", " ") ?? "-"}
        </Text>
      ) : (
        <Combobox
          items={items()}
          value={rank?.toLowerCase()}
          className={cn("flex-grow", comboBoxClassName)}
          disabled={disabled}
          onChange={(value) => {
            onSelect?.(Object.values(Rank).find((option) => option.toLowerCase() === value));
          }}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};
