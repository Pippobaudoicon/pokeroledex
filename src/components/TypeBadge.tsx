import type * as React from "react";
import type { PokemonType } from "@/api/schemas";
import { Text } from "@/components/Text";
import { cn } from "@/lib/utils";

type BadgeSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface TypeIconProps {
  type: PokemonType;
  size?: number | string;
  /** The SVGs are white; "black" inverts them. */
  color?: "white" | "black";
}

export const TypeIcon = ({ type, size, color = "white" }: TypeIconProps) => {
  const filter = color === "black" ? "invert(1)" : "none";
  return (
    <img
      src={`/images/type/${type.toLowerCase()}.svg`}
      alt={type}
      width={size}
      height={size}
      style={{
        filter,
      }}
    />
  );
};

export interface IconBadgeProps {
  icon?: React.ReactNode;
  text?: React.ReactNode;
  className?: string;
  /** Tailwind background class, used by the "default" variant. */
  color?: string;
  showText?: boolean;
  textClassName?: string;
  /** Anything but "default" renders a transparent badge with dark text and icon. */
  variant?: string;
}

export const IconBadge = ({
  icon,
  text,
  className,
  color,
  showText = true,
  textClassName,
  variant = "default",
}: IconBadgeProps) => {
  const background = variant === "default" ? color : "bg-transparent";
  return (
    <div
      className={`rounded-full p-2 flex flex-row items-center space-x-1 ${className ?? ""} ${background}`}
    >
      {icon}
      {text != null && (
        <Text
          color={variant === "default" ? "text-white" : "text-pokerole-black"}
          className={`capitalize ${textClassName ?? ""} ${showText ? "" : "hidden"}`}
          size="text-base"
        >
          {text}
        </Text>
      )}
    </div>
  );
};

export interface TypeBadgeProps {
  type: PokemonType;
  className?: string;
  textClassName?: string;
  size?: BadgeSize;
  /** Anything but "default" renders a transparent badge with dark text and icon. */
  variant?: string;
}

export const TypeBadge = ({
  type,
  className,
  textClassName,
  size = "md",
  variant = "default",
}: TypeBadgeProps) => {
  const color = `bg-type-${type.toLowerCase()}`;
  const iconSizes = {
    xs: "10",
    sm: "16",
    md: "20",
    lg: "24",
    xl: "28",
  };
  const textSizes = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };
  return (
    <IconBadge
      icon={
        <TypeIcon
          type={type}
          size={iconSizes[size]}
          color={variant === "default" ? "white" : "black"}
        />
      }
      className={`${className}`}
      textClassName={cn(textSizes[size], textClassName)}
      color={color}
      text={type}
      variant={variant}
    />
  );
};
