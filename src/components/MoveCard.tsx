import { useToggle } from "@uidotdev/usehooks";
import { Dice5 } from "lucide-react";
import * as React from "react";
import { FaXmark } from "react-icons/fa6";
import { CollapsableButton } from "@/components/CollapsableButton";
import { DiceRoll, type DiceRollRequest } from "@/components/DiceRoll";
import { MoveCategoryBadge } from "@/components/MoveCategory";
import { RankIcon } from "@/components/RankIcon";
import { Text } from "@/components/Text";
import { TypeIcon } from "@/components/TypeBadge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { getContrastTextColor } from "@/lib/colors";
import { encounterMovePools } from "@/lib/encounter-moves";
import { abbreviateStat } from "@/lib/stats";
import { capitalize } from "@/lib/utils";
import type { Move, Pokemon } from "../../shared/types";
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
  pokemon?: Pokemon;
  initialOpen?: boolean;
  disableToggle?: boolean;
  className?: string;
  showDelete?: boolean;
  onDelete?: React.MouseEventHandler<HTMLButtonElement>;
}

/** Dice in a pool like "4/5" (a choice of attributes): roll the larger, as the corebook advises (p. 57). */
const poolDice = (pool: string | undefined) => {
  const choices = pool?.split("/").map(Number) ?? [];
  return choices.length > 0 && choices.every((dice) => Number.isInteger(dice) && dice > 0)
    ? Math.max(...choices)
    : undefined;
};

const STAB_HINT = "S.T.A.B.: same type as the Pokémon, +1 damage die";

/**
 * Explains a value on mouse hover, or on tap on touch screens. A popover rather than a tooltip so a tap
 * elsewhere closes it, and the click is kept from toggling the card.
 */
const Hint = ({ hint, className, children }: { hint?: string; className?: string; children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  if (!hint) return <span className={className}>{children}</span>;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild={true}>
        <span
          role="button"
          tabIndex={0}
          className={`move-hint ${className ?? ""}`}
          onPointerEnter={(event) => event.pointerType === "mouse" && setOpen(true)}
          onPointerLeave={(event) => event.pointerType === "mouse" && setOpen(false)}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        collisionPadding={8}
        className="w-auto max-w-xs px-3 py-2 font-move text-base"
        onOpenAutoFocus={(event) => event.preventDefault()}
        // Returning focus to this trigger would close a hint opened meanwhile on another value.
        onCloseAutoFocus={(event) => event.preventDefault()}
        onClick={(event) => event.stopPropagation()}
      >
        {hint}
      </PopoverContent>
    </Popover>
  );
};

// The dice roller (DiceRoll) is parked for now: chips only show the dice count. Set to true to roll on tap.
const ROLLING_ENABLED = false;

/** Dice count at the end of a pool line; rolls that pool on tap while rolling is enabled. */
const RollChip = ({ dice, label, title, onClick }: { dice: number; label: string; title: string; onClick: (event: React.MouseEvent) => void }) => {
  const className = "dice-chip ml-1 inline-flex items-center gap-1 h-6 px-2 rounded-full align-middle font-square text-sm leading-none";
  const content = (
    <>
      <Dice5 size={14} aria-hidden />
      {dice}
    </>
  );
  if (!ROLLING_ENABLED) {
    return (
      <Hint hint={title} className="dice-chip ml-1 inline-flex items-center gap-1 align-middle font-move">
        {content}
      </Hint>
    );
  }
  return (
    <button type="button" className={className} aria-label={`Roll ${label}: ${dice} dice`} title={`${title}. Tap to roll.`} onClick={onClick}>
      {content}
    </button>
  );
};

/** Move summary that expands on click to show its full details. */
export const MoveCard = ({
  move,
  pokemon,
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
  const pools = pokemon ? encounterMovePools(move, pokemon) : undefined;
  // Hover text spelling out the pool, e.g. "2 Strength + 2 Power + 1 S.T.A.B. = 5 dice".
  const accuracyTitle = pools && pools.accuracy !== "—" ? `${pools.accuracyBreakdown} = ${pools.accuracy} dice` : undefined;
  const damageTitle = pools && pools.damage !== "—" ? `${pools.damageBreakdown} = ${pools.damage} dice` : undefined;
  const accuracyDice = poolDice(pools?.accuracy);
  const damageDice = poolDice(pools?.damage);
  const [roll, setRoll] = React.useState<(DiceRollRequest & { key: number }) | null>(null);
  const rollPool = (kind: DiceRollRequest["kind"], dice: number) => (event?: React.MouseEvent) => {
    event?.stopPropagation();
    setRoll((previous) => ({ title: move.name, kind, dice, key: (previous?.key ?? 0) + 1 }));
  };
  const learnedRank = pokemon?.pokemonTemplate.possibleMoves.find((possible) => possible.move.id === move.id)?.rank;
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
          {learnedRank && <span className="flex items-center gap-1 text-sm"><RankIcon rank={learnedRank} size="sm" />{learnedRank}</span>}
        </Text>
        <div className="flex flex-row flex-wrap justify-center items-center gap-1">
          <Text
            color={textColor}
            size="text-base"
            className={`p-2 flex-grow whitespace-nowrap rounded-full bg-white/20 transition-all duration-500 ease-in-out ${open ? "opacity-0 max-h-0 max-w-0" : "opacity-100 max-h-20 max-w-96"}`}
          >
            A: {pools ? <Hint hint={accuracyTitle}>{pools.accuracy}</Hint> : (<>
              {move.accuracy1.length > 0 ? abbreviateStat(move.accuracy1) : "-"}
            {move.accuracy2 === undefined
              ? ""
              : ` + ${abbreviateStat(move.accuracy2)}`}
            </>)}
          </Text>
          <Text
            color={textColor}
            size="text-base"
            className={`p-2 flex-grow whitespace-nowrap rounded-full bg-white/20 transition-all duration-300 ease-in-out ${open ? "opacity-0 max-h-0 max-w-0" : "opacity-100 max-h-20 max-w-96"}`}
          >
            D:{" "}
            {pools ? (
              <>
                <Hint hint={damageTitle}>{pools.damage}</Hint>
                {pools.stab && <Hint hint={STAB_HINT}> ★</Hint>}
              </>
            ) : (<>
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
            </>)}
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
                {move.accuracy2 === undefined || move.accuracy2 === "" ? "" : ` + ${move.accuracy2}`}
                {pools && pools.accuracy !== "—" && !accuracyDice && ` = ${pools.accuracy} dice`}
              </span>
              {accuracyTitle && accuracyDice && (
                <RollChip dice={accuracyDice} label="accuracy" title={accuracyTitle} onClick={rollPool("accuracy", accuracyDice)} />
              )}
            </Text>
            <Text size="text-base" color={lightTextColor}>
              Damage:{" "}
              <span className="font-move">
                {move.damage1 || "-"}
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
                {pools?.stab && (
                  <>
                    {" + "}
                    <Hint hint={STAB_HINT}>1 ★</Hint>
                  </>
                )}
                {pools && pools.damage !== "—" && !damageDice && ` = ${pools.damage} dice`}
              </span>
              {damageTitle && damageDice && <RollChip dice={damageDice} label="damage" title={damageTitle} onClick={rollPool("damage", damageDice)} />}
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
      {roll && (
        <DiceRoll
          key={roll.key}
          request={roll}
          onClose={() => setRoll(null)}
          next={roll.kind === "accuracy" && damageDice ? `Roll damage (${damageDice} dice)` : undefined}
          onNext={damageDice ? () => rollPool("damage", damageDice)() : undefined}
        />
      )}
    </div>
  );
};
