import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ClickTooltipProps {
  content?: React.ReactNode;
  contentClassName?: string;
  /** Rendered as the trigger via `asChild`, so it must be a single element. */
  trigger?: React.ReactNode;
}

/** Tooltip that also toggles on click (for touch devices). */
export const ClickTooltip = ({
  content,
  contentClassName,
  trigger,
}: ClickTooltipProps) => {
  const [open, setOpen] = React.useState(false);
  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger
          asChild={true}
          onClick={() => {
            setOpen(!open);
          }}
        >
          {trigger}
        </TooltipTrigger>
        <TooltipContent className={contentClassName}>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
