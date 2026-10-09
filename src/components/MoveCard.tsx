import { useToggle } from "@uidotdev/usehooks";
import type * as React from "react";
import { FaXmark } from "react-icons/fa6";
import { CollapsableButton } from "@/components/CollapsableButton";
import { MoveCategoryBadge } from "@/components/MoveCategory";
import { Text } from "@/components/Text";
import { TypeIcon } from "@/components/TypeBadge";
import { Separator } from "@/components/ui/separator";
import { getContrastTextColor } from "@/lib/colors";
import { abbreviateStat } from "@/lib/stats";
import { capitalize } from "@/lib/utils";
import type { Move } from "../../shared/types";
import type { MoveTarget } from "@/api/schemas";
const MoveTargetIcon = ({ target, size = 24 }: { target: MoveTarget; size?: number }) => (
  <div
    style={{
      width: size,
      height: size,
    }}
    className="flex items-center justify-center"
  >
    <img
      src={`/images/move/${target.toLowerCase()}.svg`}
      alt="Target Icon"
      width={size}
      height={size}
    />
  </div>
);
export interface MoveCardProps {
  move: Move;
  initialOpen?: boolean;
  disableToggle?: boolean;
  className?: string;
  showDelete?: boolean;
  onDelete?: React.MouseEventHandler<HTMLButtonElement>;
}

/** Move summary that expands on click to show its full details. */
export const MoveCard = ({
  move,
  initialOpen = false,
  disableToggle = false,
  className,
  showDelete = false,
  onDelete,
}: MoveCardProps) => {
  const background = `bg-type-${move.type.toLowerCase()}`;
  const textColor = getContrastTextColor(background);
  const lightTextColor = getContrastTextColor(background + "-light");
  const [open, toggle] = useToggle(initialOpen);
  return (
    <div
      className={`flex flex-col flex-grow rounded-3xl overflow-hidden ${background} justify-center ${className}`}
      onClick={() => {
        if (!disableToggle) toggle(!open);
      }}
    >
      <div className="p-3 pt-4 w-full flex flex-row justify-between items-center space-x-2">
        <Text color={textColor} className="flex-grow" size="text-xl">
          <span className="inline-flex items-center gap-2">
            <TypeIcon
              type={move.type}
              size={20}
              color={textColor === "text-white" ? "white" : "black"}
            />
            {move.name}
          </span>
        </Text>
        <div className="flex flex-row flex-wrap justify-center items-center gap-1">
          <Text
            color={textColor}
            size="text-base"
            className={`p-2 flex-grow whitespace-nowrap rounded-full bg-white bg-opacity-20 transition-all duration-500 ease-in-out ${open ? "opacity-0 max-h-0 max-w-0" : "opacity-100 max-h-20 max-w-96"}`}
          >
            A: {move.accuracy1.length > 0 ? abbreviateStat(move.accuracy1) : "-"}
            {move.accuracy2 === undefined
              ? ""
              : ` + ${abbreviateStat(move.accuracy2)}`}
          </Text>
          <Text
            color={textColor}
            size="text-base"
            className={`p-2 flex-grow whitespace-nowrap rounded-full bg-white bg-opacity-20 transition-all duration-300 ease-in-out ${open ? "opacity-0 max-h-0 max-w-0" : "opacity-100 max-h-20 max-w-96"}`}
          >
            D:{" "}
            {move.damage1 === undefined || move.damage1 === null || move.damage1 === ""
              ? "-"
              : abbreviateStat(move.damage1)}
            {move.damage2 === undefined || move.damage2 === null || move.damage2 === ""
              ? ""
              : ` + ${abbreviateStat(move.damage2)}`}
            {move.damagePower === undefined ||
            move.damagePower === null ||
            move.damagePower === "0"
              ? ""
              : ` + ${move.damagePower}`}
          </Text>
        </div>
        <div className="flex flex-row gap-2">
          <MoveCategoryBadge category={move.category} short={!open} />
          {showDelete && (
            <CollapsableButton
              onClick={onDelete}
              text="Delete"
              icon={<FaXmark color="white" />}
              variant="red"
            />
          )}
        </div>
      </div>
      <div
        className={`w-full ${background}-light flex-grow rounded-t-none space-y-2 transition-all duration-300 ease-in-out ${open ? "max-h-[1000px] p-3 opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}
      >
        <div className="flex flex-row justify-between">
          <div className="flex flex-col space-y-1">
            <Text size="text-base" color={lightTextColor}>
              Type: <span className="font-move">{capitalize(move.type)}</span>
            </Text>
            <Text size="text-base" color={lightTextColor}>
              Accuracy:{" "}
              <span className="font-move">
                {move.accuracy1 ?? "-"}
                {move.accuracy2 === undefined ? "" : ` + ${move.accuracy2}`}
              </span>
            </Text>
            <Text size="text-base" color={lightTextColor}>
              Damage:{" "}
              <span className="font-move">
                {move.damage1 ?? "-"}
                {move.damage2 === undefined ||
                move.damage2 === null ||
                move.damage2 === ""
                  ? ""
                  : ` + ${move.damage2}`}
                {move.damagePower === undefined ||
                move.damagePower === null ||
                move.damagePower === "0"
                  ? ""
                  : ` + ${move.damagePower}`}
              </span>
            </Text>
            <div className="flex flex-row space-x-2">
              <Text size="text-base" color={lightTextColor}>
                Effects: <span className="font-move"> {move.effect} </span>
              </Text>
            </div>
          </div>
          <div className="flex flex-col items-center space-y-1">
            <MoveTargetIcon target={move.target} size={64} />
          </div>
        </div>
        <Separator
          orientation="horizontal"
          className={lightTextColor.replace("text", "bg")}
        />
        <Text
          color={
            lightTextColor === "text-pokerole-black"
              ? "text-pokerole-black-light"
              : "text-white"
          }
          size="text-base"
          className="italic"
          font="font-move"
        >
          {move.description}
        </Text>
      </div>
    </div>
  );
};
