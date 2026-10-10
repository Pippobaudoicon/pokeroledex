import { useQuery } from "@tanstack/react-query";
import { FaUser } from "react-icons/fa6";
import { apiFetch, useAuth } from "@/api/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export const SessionIndicator = ({
  className,
  displayText = true,
}: {
  className?: string;
  displayText?: boolean;
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  // The Cloudflare Access login; `pnpm dev` has none and answers "local-user".
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ email: string }>({ url: "/me", method: "get" }),
  });
  const name = me && me.email !== "local-user" ? me.email.split("@")[0] : user?.nickname;
  return isLoading ? (
    <div className="flex justify-center items-center">
      <LoadingSpinner className="h-12 w-16" />
    </div>
  ) : (
    <div className={cn("flex justify-center items-center gap-2", className)}>
      {isAuthenticated && (
        <>
          <div className="bg-pokerole-beige rounded-full p-2">
            <FaUser className="text-pokerole-black" />
          </div>
          <span
            className={`font-move text-xl transition-all duration-200 ease-in-out text-white ${displayText ? "" : "opacity-0 pointer-events-none absolute"}`}
          >
            {name}
          </span>
        </>
      )}
      {!isAuthenticated && (
        <span
          className={`font-move text-xl transition-all duration-200 ease-in-out text-white ${displayText ? "" : "opacity-0 pointer-events-none absolute"}`}
        >
          Not logged in
        </span>
      )}
    </div>
  );
};
export const AccountButton = ({ className }: { className?: string }) =>
  import.meta.env.DEV ? (
    <Button variant="beige" className={cn("text-sm", className)} disabled={true}>
      Local mode
    </Button>
  ) : (
    <Button variant="beige" className={cn("text-sm", className)} asChild={true}>
      <a href="/cdn-cgi/access/logout">Log out</a>
    </Button>
  );
// Hosted donation widgets loaded remote images and fonts. Keep this local marker
// in the same slots so the original layout and guided-tour targets still work.
export const LocalWorkspaceLabel = () => <span className="font-move text-sm text-white px-3">Local workspace</span>;
