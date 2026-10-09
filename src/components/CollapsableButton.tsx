import { useHover } from "@uidotdev/usehooks";
import * as React from "react";
import { Text } from "@/components/Text";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface CollapsableButtonProps extends ButtonProps {
  /** Label revealed while hovered. */
  text?: React.ReactNode;
  icon?: React.ReactNode;
}

/** Icon button whose text label slides out on hover. */
export const CollapsableButton = React.forwardRef<HTMLButtonElement, CollapsableButtonProps>(
  ({ onClick, text, icon, variant, disabled, ...props }, ref) => {
    const [hoverRef, hovering] = useHover<HTMLDivElement>();
    const expanded = hovering && !disabled;
    return (
      <div ref={hoverRef}>
        <Button
          className="flex flex-row items-center overflow-hidden"
          variant={variant}
          onClick={onClick}
          size="equalPadding"
          ref={ref}
          disabled={disabled}
          {...props}
        >
          <>
            {icon}
            <Text
              color="text-white"
              size="text-base"
              className={`transition-all ease-in-out duration-500 delay-300 ${expanded ? "ml-1 max-w-96 opacity-100" : "max-w-0 opacity-0"}`}
            >
              {text}
            </Text>
          </>
        </Button>
      </div>
    );
  },
);
CollapsableButton.displayName = "CollapsableButton";
