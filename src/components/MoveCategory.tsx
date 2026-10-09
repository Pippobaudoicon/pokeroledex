import type { MoveCategory } from "@/api/schemas";
import { IconBadge } from "@/components/TypeBadge";

const MoveCategoryIcon = ({ category, size }: { category: MoveCategory; size?: number }) => (
  <div
    style={{
      width: size,
      height: size,
    }}
    className="flex items-center justify-center"
  >
    <img
      src={`/images/moveCategory/${category.toLowerCase()}.png`}
      alt="Move Category Icon"
      width={size}
      height={size}
    />
  </div>
);

export interface MoveCategoryBadgeProps {
  category: MoveCategory;
  className?: string;
  /** Icon only, without the category name. */
  short?: boolean;
  textClassName?: string;
}

export const MoveCategoryBadge = ({
  category,
  className,
  short = false,
  textClassName,
}: MoveCategoryBadgeProps) => {
  const color = `bg-move-category-${category.toLowerCase().replace(/_/g, "-")}`;
  return (
    <IconBadge
      icon={<MoveCategoryIcon category={category} size={20} />}
      className={className}
      color={color}
      text={short ? null : category.replace(/_/g, "/")}
      textClassName={textClassName}
    />
  );
};
