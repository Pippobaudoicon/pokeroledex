import { FaGenderless, FaMars, FaVenus } from "react-icons/fa";
import { TbGenderBigender } from "react-icons/tb";
import type * as T from "../../../../shared/types";
import { Combobox } from "@/components/Combobox";

/** Combobox value for genderType "" (the species can be either male or female). */
const NO_GENDER_VALUE = "both";

const genderTypeOptions = [
  {
    label: (
      <div className="flex items-center gap-2">
        <FaMars color="#03adfc" size={18} />
        <span>Male</span>
      </div>
    ),
    value: "m",
    searchValue: "Male",
  },
  {
    label: (
      <div className="flex items-center gap-2">
        <FaVenus color="#f781f1" size={18} />
        <span>Female</span>
      </div>
    ),
    value: "f",
    searchValue: "Female",
  },
  {
    label: (
      <div className="flex items-center gap-2">
        <FaGenderless color="gray" size={18} />
        <span>Neutral</span>
      </div>
    ),
    value: "n",
    searchValue: "Neutral",
  },
  {
    label: (
      <div className="flex items-center gap-2">
        <TbGenderBigender color="#9b59b6" size={18} />
        <span>Both</span>
      </div>
    ),
    value: NO_GENDER_VALUE,
    searchValue: "Both",
  },
];

export function GenderTypeSelect({
  value,
  onChange,
  className,
}: {
  value: T.GenderType;
  onChange: (genderType: T.GenderType) => void;
  className?: string;
}) {
  return (
    <Combobox
      items={genderTypeOptions}
      value={value === "" ? NO_GENDER_VALUE : value.toLowerCase()}
      onChange={(picked) => {
        // picked is one of the option values above, or "" when re-picked.
        onChange(picked === NO_GENDER_VALUE ? "" : (picked.toUpperCase() as T.GenderType));
      }}
      className={className}
      placeholder="Select gender..."
    />
  );
}
