import type * as React from "react";
import { Box } from "@/components/Box";
import { Text } from "@/components/Text";

export interface StatBoxProps {
  /** Tailwind background class. */
  color: string;
  statName?: React.ReactNode;
  pipRow?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export const StatBox = ({
  color,
  statName,
  pipRow,
  className,
  textClassName,
}: StatBoxProps) => (
  <Box
    color={color}
    className={`flex flex-col items-center p-2 ${className ?? ""}`}
    withBorder={true}
  >
    <Text color="text-pokerole-black" className={textClassName ?? ""}>
      {statName}
    </Text>
    {pipRow}
  </Box>
);
