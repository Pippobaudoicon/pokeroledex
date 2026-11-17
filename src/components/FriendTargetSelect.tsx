import { Link } from "react-router-dom";
import type { Friend } from "../../shared/types";
import { cn } from "@/lib/utils";

export type FriendTarget = { email: string; trainerId?: string };

const SEPARATOR = "\n";
export const targetLabel = (friends: Friend[], target: FriendTarget) => {
  const trainer = friends.find((friend) => friend.email === target.email)?.trainers.find((entry) => entry.id === target.trainerId);
  return trainer ? `${trainer.name || "Unnamed trainer"} (${target.email})` : target.email;
};

/** Picks a friend's trainer, or with `allowAccount` the friend's account itself. */
export const FriendTargetSelect = ({
  friends,
  value,
  onChange,
  allowAccount = false,
  className,
}: {
  friends: Friend[];
  value: FriendTarget | null;
  onChange: (target: FriendTarget | null) => void;
  allowAccount?: boolean;
  className?: string;
}) => {
  const choices = friends.filter((friend) => allowAccount || friend.trainers.length);
  if (!choices.length)
    return (
      <p className="text-footnote text-label-2">
        {friends.length ? "Your friends have no trainers yet." : "You have no friends to send to yet."}{" "}
        <Link to="/friends" className="text-tint underline">
          Add friends
        </Link>
      </p>
    );
  return (
    <select
      aria-label="Send to"
      required
      value={value ? `${value.email}${SEPARATOR}${value.trainerId ?? ""}` : ""}
      onChange={(event) => {
        const [email, trainerId] = event.target.value.split(SEPARATOR);
        onChange(email ? { email, ...(trainerId ? { trainerId } : {}) } : null);
      }}
      className={cn("h-11 w-full min-w-0 rounded-xl bg-fill px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-focus lg:h-9", className)}
    >
      <option value="">Choose a friend…</option>
      {choices.map((friend) => (
        <optgroup key={friend.email} label={friend.email}>
          {allowAccount && <option value={`${friend.email}${SEPARATOR}`}>No trainer (their My Pokémon)</option>}
          {friend.trainers.map((trainer) => (
            <option key={trainer.id} value={`${friend.email}${SEPARATOR}${trainer.id}`}>
              {trainer.name || "Unnamed trainer"}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};
