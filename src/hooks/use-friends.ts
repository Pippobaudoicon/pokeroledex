import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FriendsList } from "../../shared/types";
import { apiFetch, type ApiFetchError } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { errorText } from "@/pages/MyCity/common";

/** Your friends with their trainers, and pending requests. Polled so new requests show up. */
export const useFriends = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ["friends"],
    queryFn: ({ signal }) => apiFetch<FriendsList>({ url: "/friends", method: "get", signal }),
    refetchInterval: 30_000,
    enabled,
  });

export type FriendChange = { kind: "request" | "accept" | "remove"; email: string };

export const useFriendChange = () => {
  const client = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ kind, email }: FriendChange) => {
      const path = `/friends/${encodeURIComponent(email)}`;
      if (kind === "request") return apiFetch<FriendsList>({ url: "/friends", method: "post", body: { email } });
      if (kind === "accept") return apiFetch<FriendsList>({ url: `${path}/accept`, method: "post" });
      return apiFetch<FriendsList>({ url: path, method: "delete" });
    },
    onSuccess: (list, { kind, email }) => {
      client.setQueryData(["friends"], list);
      const friends = list.friends.some((friend) => friend.email === email);
      if (kind === "request") toast({ title: friends ? `You and ${email} are now friends` : `Friend request sent to ${email}` });
      if (kind === "accept") toast({ title: `You and ${email} are now friends` });
    },
    onError: (error: ApiFetchError) => toast({ title: "Friends could not be updated", description: errorText(error) }),
  });
};
