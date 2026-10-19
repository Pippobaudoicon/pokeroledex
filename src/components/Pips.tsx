import { useHover } from "@uidotdev/usehooks";
import * as React from "react";
import { cn } from "@/lib/utils";

const PipState = {
  SET: "SET",
  SELECTED: "SELECTED",
  HOVERED: "HOVERED",
  SELECTABLE: "SELECTABLE",
  UNSET: "UNSET",
  UNSELECTABLE: "UNSELECTABLE",
} as const;
type PipState = (typeof PipState)[keyof typeof PipState];

const Pip = ({ state, className }: { state: PipState; className?: string }) => {
  const stateClassName = React.useMemo(() => {
    switch (state) {
      case "SET":
        return "bg-pokerole-black";
      case "SELECTED":
        return "bg-pokerole-black border-white border-[3px]";
      case "HOVERED":
        return "bg-pokerole-gray border-white border-[3px]";
      case "SELECTABLE":
        return "bg-pokerole-black border-white border-[6px]";
      case "UNSET":
        return "bg-white";
      case "UNSELECTABLE":
        return "bg-white/50";
    }
  }, [state]);
  return <div className={cn(`rounded-full w-6 h-6 ${stateClassName}`, className)} />;
};

interface HoverPipProps {
  state: PipState;
  pipClassName?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const HoverPip = ({
  state,
  pipClassName,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: HoverPipProps) => {
  const [hoverRef, hovering] = useHover<HTMLDivElement>();
  React.useEffect(() => {
    if (hovering) onMouseEnter?.();
    else onMouseLeave?.();
  }, [hovering]);
  return (
    <div ref={hoverRef} onClick={onClick}>
      <Pip state={state} className={pipClassName} />
    </div>
  );
};

export interface PipRowProps {
  numberOfPips: number;
  /** Leading pips that are fixed (e.g. the base value). */
  numberOfSetPips: number;
  /** Pips selected on top of the set ones. */
  numberOfSelectedPips: number;
  /** Pips after the selection that can still be picked. */
  numberOfSelectablePips: number;
  /** Empty pips that are within the maximum but not currently affordable. */
  numberOfSettablePips: number;
  /** Called with the index of a clicked selectable/selected pip. */
  onSelect?: (index: number) => void;
  className?: string;
  pipClassName?: string;
}

/** A row of pips; hovering a selectable pip highlights it and every selectable pip before it. */
export const PipRow = ({
  numberOfPips,
  numberOfSetPips,
  numberOfSelectedPips,
  numberOfSelectablePips,
  numberOfSettablePips,
  onSelect,
  className,
  pipClassName,
}: PipRowProps) => {
  const [hoveredIndex, setHoveredIndex] = React.useState(-1);
  const hover = (index: number) => {
    setHoveredIndex(index);
  };
  const unhover = () => {
    setHoveredIndex(-1);
  };
  const selectableEnd = numberOfSetPips + numberOfSelectedPips + numberOfSelectablePips;
  const stateOf = (index: number): PipState =>
    index < numberOfSetPips
      ? PipState.SET
      : index < numberOfSetPips + numberOfSelectedPips
        ? index <= hoveredIndex && hoveredIndex < selectableEnd
          ? PipState.HOVERED
          : PipState.SELECTED
        : index < selectableEnd
          ? index <= hoveredIndex && hoveredIndex < selectableEnd
            ? PipState.HOVERED
            : PipState.SELECTABLE
          : index < selectableEnd + numberOfSettablePips
            ? PipState.UNSET
            : PipState.UNSELECTABLE;
  const pips: React.ReactElement[] = [];
  for (let index = 0; index < numberOfPips; index++)
    pips.push(
      <HoverPip
        key={index}
        onClick={() => {
          if (
            onSelect != null &&
            (stateOf(index) === PipState.SELECTABLE ||
              stateOf(index) === PipState.HOVERED ||
              stateOf(index) === PipState.SELECTED)
          )
            onSelect(index);
        }}
        onMouseEnter={() => {
          hover(index);
        }}
        onMouseLeave={() => {
          unhover();
        }}
        state={stateOf(index)}
        pipClassName={pipClassName}
      />,
    );
  return <div className={`flex space-x-0.5 ${className}`}>{pips}</div>;
};

export interface StatPipsProps {
  baseStat: number;
  maxStat: number;
  maxPips: number;
  /** Points already added on top of the base stat. */
  numSelected: number;
  /** Points still available to add. */
  allocatablePoints: number;
  /** Optional cap below maxStat (e.g. the rank's skill limit). */
  limit?: number;
  onSelect?: (index: number) => void;
  className?: string;
  pipClassName?: string;
}

export const StatPips = ({
  baseStat,
  maxStat,
  maxPips,
  numSelected,
  allocatablePoints,
  limit,
  onSelect,
  className,
  pipClassName,
}: StatPipsProps) => {
  const cap = Math.min(maxStat, limit ?? maxStat);
  const selected = Math.min(cap - baseStat, numSelected);
  const selectable = Math.min(cap - (baseStat + numSelected), allocatablePoints);
  const settable = maxStat - (baseStat + selectable + selected);
  return (
    <PipRow
      numberOfPips={maxPips}
      numberOfSetPips={baseStat}
      numberOfSelectedPips={selected}
      numberOfSelectablePips={selectable}
      numberOfSettablePips={settable}
      onSelect={onSelect}
      className={className}
      pipClassName={pipClassName}
    />
  );
};
