import * as React from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { Box } from "@/components/Box";
import { Text } from "@/components/Text";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface FilterSectionProps {
  label?: React.ReactNode;
  children?: React.ReactNode;
}

export const FilterSection = ({ label, children }: FilterSectionProps) => {
  const [open, setOpen] = React.useState(false);
  return (
    <Box color="bg-pokerole-beige" className="p-2 flex flex-col gap-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex flex-row justify-center w-full items-center">
          <Text
            size="text-2xl"
            color="text-pokerole-black"
            className="text-center w-full flex-grow"
          >
            {label}
          </Text>
          {open ? (
            <IoIosArrowUp
              className="stroke-pokerole-black fill-pokerole-black ml-auto mr-1"
              size={20}
            />
          ) : (
            <IoIosArrowDown
              className="stroke-pokerole-black fill-pokerole-black ml-auto mr-1"
              size={20}
            />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>{children}</CollapsibleContent>
      </Collapsible>
    </Box>
  );
};
