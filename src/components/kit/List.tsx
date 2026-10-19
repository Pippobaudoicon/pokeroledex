import { ChevronRight } from "lucide-react";
import type * as React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** iOS Settings-style inset grouped list. */
export const Group = ({
  title,
  footer,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  footer?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={className}>
    {(title || action) && (
      <div className="flex items-end justify-between gap-2 px-4 pb-1.5 lg:px-3">
        {title && <h2 className="text-footnote font-semibold uppercase tracking-wide text-label-2">{title}</h2>}
        {action}
      </div>
    )}
    <div className="overflow-hidden rounded-xl bg-surface shadow-card">{children}</div>
    {footer && <p className="px-4 pt-1.5 text-footnote text-label-2 lg:px-3">{footer}</p>}
  </section>
);

interface RowProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned detail text or control. */
  value?: React.ReactNode;
  to?: string;
  /** Replace the history entry, for moving between details in a sheet. */
  replace?: boolean;
  onClick?: () => void;
  className?: string;
  /** Shows a chevron; on by default for links. */
  chevron?: boolean;
  "aria-label"?: string;
}

/** One row of a Group. Links and buttons get the whole row as their target; separators are inset past the icon. */
export const Row = ({ icon, title, subtitle, value, to, replace, onClick, className, chevron, ...rest }: RowProps) => {
  const interactive = to !== undefined || onClick !== undefined;
  const body = (
    <>
      {icon && <span className="grid shrink-0 place-items-center text-label-2">{icon}</span>}
      <span className="flex min-h-11 min-w-0 flex-1 items-center gap-3 border-b border-hairline py-2.5 pr-4 group-last/row:border-b-0 lg:min-h-9 lg:py-2 lg:pr-3">
        <span className="min-w-0 flex-1">
          <span className="block text-body text-label">{title}</span>
          {subtitle && <span className="mt-0.5 block text-subhead text-label-2">{subtitle}</span>}
        </span>
        {value !== undefined && <span className="shrink-0 text-body text-label-2">{value}</span>}
        {(chevron ?? interactive) && <ChevronRight aria-hidden className="size-4 shrink-0 text-label-3" />}
      </span>
    </>
  );
  const rowClass = cn(
    "group/row flex w-full items-center gap-3 pl-4 text-left lg:pl-3",
    interactive && "transition-colors duration-150 hover:bg-raised active:bg-fill",
    className,
  );
  if (to !== undefined)
    return (
      <Link to={to} replace={replace} className={rowClass} aria-label={rest["aria-label"]}>
        {body}
      </Link>
    );
  if (onClick !== undefined)
    return (
      <button type="button" onClick={onClick} className={rowClass} aria-label={rest["aria-label"]}>
        {body}
      </button>
    );
  return <div className={rowClass}>{body}</div>;
};

/** Rounded square icon behind a row, like Settings. */
export const RowIcon = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("grid size-7 place-items-center rounded-lg text-white lg:size-6 lg:rounded-md [&>svg]:size-4 lg:[&>svg]:size-3.5", className)}>
    {children}
  </span>
);
