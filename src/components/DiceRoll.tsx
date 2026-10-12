import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

// Pokérole rolls pools of d6: every 4, 5 or 6 is a success (corebook p. 35).
const isSuccess = (face: number) => face >= 4;

// Rotation that turns each face towards the viewer. Opposite faces add up to 7.
const faceRotation: Record<number, [number, number]> = {
  1: [0, 0],
  6: [0, 180],
  3: [0, -90],
  4: [0, 90],
  2: [-90, 0],
  5: [90, 0],
};
// Where each face sits on the cube, matching faceRotation.
const facePlacement: Record<number, string> = {
  1: "rotateY(0deg)",
  6: "rotateY(180deg)",
  3: "rotateY(90deg)",
  4: "rotateY(-90deg)",
  2: "rotateX(90deg)",
  5: "rotateX(-90deg)",
};
// Filled cells of a 3x3 pip grid, row by row.
const pips: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const randomInt = (max: number) => crypto.getRandomValues(new Uint32Array(1))[0] % max;

interface Die {
  face: number;
  /** Final rotation including extra whole turns, so the die tumbles on the way. */
  rotateX: number;
  rotateY: number;
  tilt: number;
  delay: number;
}

const rollDice = (count: number): Die[] =>
  Array.from({ length: count }, (_, i) => {
    const face = randomInt(6) + 1;
    const [x, y] = faceRotation[face];
    const turns = () => (2 + randomInt(3)) * 360 * (randomInt(2) ? 1 : -1);
    return { face, rotateX: x + turns(), rotateY: y + turns(), tilt: randomInt(31) - 15, delay: i * 70 };
  });

const ROLL_MS = 1300;

const DieView = ({ die, landed }: { die: Die; landed: boolean }) => (
  <div
    className={`dice-drop ${landed ? (isSuccess(die.face) ? "dice-success" : "dice-failure") : ""}`}
    style={{ "--tilt": `${die.tilt}deg`, animationDelay: `${die.delay}ms` } as React.CSSProperties}
  >
    <div
      className="dice-cube"
      style={
        {
          "--rx": `${die.rotateX}deg`,
          "--ry": `${die.rotateY}deg`,
          animationDelay: `${die.delay}ms`,
        } as React.CSSProperties
      }
    >
      {[1, 2, 3, 4, 5, 6].map((face) => (
        <div key={face} className="dice-face" style={{ transform: `${facePlacement[face]} translateZ(var(--dice-half))` }}>
          {Array.from({ length: 9 }, (_, cell) => (
            <span key={cell} className={pips[face].includes(cell) ? "dice-pip" : undefined} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export interface DiceRollRequest {
  title: string;
  kind: "accuracy" | "damage";
  dice: number;
}

/**
 * Full-screen roll over a blurred page; give each request its own `key` so it rolls anew.
 * `onNext` offers a follow-up roll, like damage after accuracy.
 */
export const DiceRoll = ({
  request,
  onClose,
  next,
  onNext,
}: {
  request: DiceRollRequest;
  onClose: () => void;
  next?: string;
  onNext?: () => void;
}) => {
  const [dice] = React.useState(() => rollDice(request.dice));
  const [landed, setLanded] = React.useState(false);
  React.useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeout = setTimeout(() => setLanded(true), reduced ? 0 : ROLL_MS + dice.length * 70);
    return () => clearTimeout(timeout);
  }, [dice]);
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const successes = dice.filter((die) => isSuccess(die.face)).length;
  return createPortal(
    <div className="dice-overlay" role="dialog" aria-modal="true" aria-label={`${request.title} roll`}
      // React events bubble through portals: keep clicks from reaching the component that opened the roll.
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        className="dice-panel"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <p className="font-square text-2xl text-white text-center">
          {request.title} · {request.kind === "accuracy" ? "Accuracy" : "Damage"} ({request.dice} dice)
        </p>
        <div className="dice-table">
          {dice.map((die, i) => (
            <DieView key={i} die={die} landed={landed} />
          ))}
        </div>
        <div className="flex flex-col gap-3" aria-live="polite">
          <p className="font-square text-3xl text-white text-center h-10">
            {landed && (
              <span className="dice-total inline-block">
                {request.kind === "accuracy"
                  ? `${successes} ${successes === 1 ? "success" : "successes"}`
                  : `${Math.max(successes, 1)} damage`}
              </span>
            )}
          </p>
          <div className="flex flex-row flex-wrap justify-center gap-2">
            {next && onNext && (
              <Button variant="green" disabled={!landed} onClick={onNext}>
                {next}
              </Button>
            )}
            <Button variant="red" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
