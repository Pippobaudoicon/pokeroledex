import type { PokemonType } from "@/api/schemas";
import { TypeBadge } from "@/components/TypeBadge";
import { useTypeEffectiveness } from "@/lib/type-chart";
export interface TypeEffectivenessProps {
  typeOne: PokemonType;
  typeTwo?: PokemonType;
}

/** Attacking types grouped by how effective they are against this type combination. */
export const TypeEffectiveness = ({ typeOne, typeTwo }: TypeEffectivenessProps) => {
  const { getDefensiveChart } = useTypeEffectiveness();
  const chart = getDefensiveChart(typeOne, typeTwo);
  return (
    <div className="flex flex-col gap-1 font-square text-xl text-pokerole-black">
      <div className="gap-1 grid grid-cols-6">
        <span className="bg-green-700 rounded-lg p-1 col-span-1 text-center text-white justify-center items-center flex">
          4x
        </span>
        <div className="col-span-5 gap-1 flex flex-row flex-wrap">
          {chart[4].map((type) => (
            <TypeBadge key={type} type={type} textClassName="hidden" />
          ))}
        </div>
      </div>
      <div className="gap-1 grid grid-cols-6">
        <span className="bg-green-500 rounded-lg p-1 col-span-1 text-center text-white justify-center items-center flex">
          2x
        </span>
        <div className="col-span-5 gap-1 flex flex-row flex-wrap">
          {chart[2].map((type) => (
            <TypeBadge key={type} type={type} textClassName="hidden" />
          ))}
        </div>
      </div>
      <div className="gap-1 grid grid-cols-6">
        <span className="bg-red-500 rounded-lg p-1 col-span-1 text-center text-white justify-center items-center flex">
          ½x
        </span>
        <div className="col-span-5 gap-1 flex flex-row flex-wrap">
          {chart[0.5].map((type) => (
            <TypeBadge key={type} type={type} textClassName="hidden" />
          ))}
        </div>
      </div>
      <div className="gap-1 grid grid-cols-6">
        <span className="bg-red-700 rounded-lg p-1 col-span-1 text-center text-white justify-center items-center flex">
          ¼x
        </span>
        <div className="col-span-5 gap-1 flex flex-row flex-wrap">
          {chart[0.25].map((type) => (
            <TypeBadge key={type} type={type} textClassName="hidden" />
          ))}
        </div>
      </div>
      <div className="gap-1 grid grid-cols-6">
        <span className="bg-purple-700 rounded-lg p-1 col-span-1 text-center text-white justify-center items-center flex">
          0x
        </span>
        <div className="col-span-5 gap-1 flex flex-row flex-wrap">
          {chart[0].map((type) => (
            <TypeBadge key={type} type={type} textClassName="hidden" />
          ))}
        </div>
      </div>
    </div>
  );
};
