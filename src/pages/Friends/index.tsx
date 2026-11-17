import { Check, UserPlus, X } from "lucide-react";
import * as React from "react";
import { button } from "@/components/kit/button";
import { Group, Row } from "@/components/kit/List";
import { PageHeader } from "@/components/kit/PageHeader";
import { useFriendChange, useFriends } from "@/hooks/use-friends";
import { field } from "@/pages/MyCity/common";

const trainerNames = (trainers: { name: string }[]) =>
  trainers.length ? trainers.map((trainer) => trainer.name || "Unnamed trainer").join(", ") : "No trainers yet";

export const FriendsPage = () => {
  const [email, setEmail] = React.useState("");
  const friends = useFriends();
  const change = useFriendChange();
  const list = friends.data;
  return (
    <>
      <PageHeader title="Friends">
        <p className="text-subhead text-label-2">Friends can send each other Pokémon and items, and are suggested when you invite members to a city.</p>
      </PageHeader>
      <div className="flex max-w-2xl flex-col gap-6 px-4 pb-8 lg:px-8">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            change.mutate({ kind: "request", email: email.trim() }, { onSuccess: () => setEmail("") });
          }}
        >
          <input
            type="email"
            required
            maxLength={254}
            aria-label="Friend's email"
            placeholder="friend@example.com"
            className={field}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button disabled={!email.trim() || change.isPending} className={button({ variant: "filled" })}>
            <UserPlus aria-hidden className="size-4" />
            Send request
          </button>
        </form>
        {friends.isError ? (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p>Your friends could not be loaded.</p>
            <button type="button" className={button({ variant: "tinted" })} onClick={() => friends.refetch()}>
              Try again
            </button>
          </div>
        ) : !list ? (
          <p role="status">Loading friends...</p>
        ) : (
          <>
            {list.incoming.length > 0 && (
              <Group title="Friend requests" footer="Accept to see each other's trainers and send Pokémon and items.">
                {list.incoming.map((other) => (
                  <Row
                    key={other}
                    title={<span className="break-all">{other}</span>}
                    value={
                      <span className="flex gap-2">
                        <button type="button" disabled={change.isPending} className={button({ variant: "filled", size: "sm" })} onClick={() => change.mutate({ kind: "accept", email: other })}>
                          <Check aria-hidden className="size-4" />
                          Accept
                        </button>
                        <button type="button" disabled={change.isPending} className={button({ variant: "gray", size: "sm" })} onClick={() => change.mutate({ kind: "remove", email: other })}>
                          <X aria-hidden className="size-4" />
                          Decline
                        </button>
                      </span>
                    }
                  />
                ))}
              </Group>
            )}
            <Group title="Friends" footer={list.friends.length ? undefined : "Send a request with the email your friend logs in with."}>
              {list.friends.length ? (
                list.friends.map((friend) => (
                  <Row
                    key={friend.email}
                    title={<span className="break-all">{friend.email}</span>}
                    subtitle={trainerNames(friend.trainers)}
                    value={
                      <button
                        type="button"
                        disabled={change.isPending}
                        className={button({ variant: "gray", size: "sm" })}
                        onClick={() => {
                          if (window.confirm(`Remove ${friend.email} from your friends?`)) change.mutate({ kind: "remove", email: friend.email });
                        }}
                      >
                        Remove
                      </button>
                    }
                  />
                ))
              ) : (
                <Row title={<span className="text-label-2">No friends yet</span>} />
              )}
            </Group>
            {list.outgoing.length > 0 && (
              <Group title="Sent requests" footer="They appear as friends once they accept.">
                {list.outgoing.map((other) => (
                  <Row
                    key={other}
                    title={<span className="break-all">{other}</span>}
                    value={
                      <button type="button" disabled={change.isPending} className={button({ variant: "gray", size: "sm" })} onClick={() => change.mutate({ kind: "remove", email: other })}>
                        Cancel
                      </button>
                    }
                  />
                ))}
              </Group>
            )}
          </>
        )}
      </div>
    </>
  );
};
