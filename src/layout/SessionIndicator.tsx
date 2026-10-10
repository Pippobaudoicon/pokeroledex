import { FaUser } from "react-icons/fa6";
import { useAuth } from "@/api/client";
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
            {user?.nickname}
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
export const LocalModeBadge = ({ className }: { className?: string }) => (
  <Button variant="beige" className={cn("text-sm", className)} disabled={true}>
    Local mode
  </Button>
);
// Hosted donation widgets loaded remote images and fonts. Keep this local marker
// in the same slots so the original layout and guided-tour targets still work.
export const LocalWorkspaceLabel = () => <span className="font-move text-sm text-white px-3">Local workspace</span>;
