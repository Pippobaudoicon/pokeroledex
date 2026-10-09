import * as React from "react";
import { Text } from "@/components/Text";
import { Button, type ButtonProps } from "@/components/ui/button";

export type AddNewBoxProps = ButtonProps;

export const AddNewBox = React.forwardRef<HTMLButtonElement, AddNewBoxProps>(
  ({ onClick, className, ...props }, ref) => (
    <Button
      variant="transparent"
      onClick={onClick}
      className={`p-2 flex rounded-3xl flex-row gap-2 items-center justify-center ${className} bg-pokerole-gray-light`}
      ref={ref}
      {...props}
    >
      <Text className="text-center" color="text-white" size="text-5xl">
        +
      </Text>
    </Button>
  ),
);
AddNewBox.displayName = "AddNewBox";
