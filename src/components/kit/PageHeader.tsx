import { ChevronLeft } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import { AppearanceSelect } from "@/layout/Appearance";
import { cn } from "@/lib/utils";

/**
 * iOS navigation bar. The large title scrolls with the page; once it passes under the bar,
 * the bar turns translucent and shows the title in small. `compact` skips the large title.
 */
export const PageHeader = ({
  title,
  back,
  actions,
  leading,
  compact = false,
  children,
  className,
}: {
  title: React.ReactNode;
  back?: { to: string; label: string; onClick?: (event: React.MouseEvent) => void };
  actions?: React.ReactNode;
  /** Replaces the back link, e.g. a Cancel button while editing. */
  leading?: React.ReactNode;
  compact?: boolean;
  /** Content under the large title, such as a search field. */
  children?: React.ReactNode;
  className?: string;
}) => {
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const [scrolled, setScrolled] = React.useState(compact);
  const BarTitle = compact ? "h1" : "div";
  React.useEffect(() => {
    if (compact || titleRef.current === null) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      rootMargin: "-52px 0px 0px 0px",
    });
    observer.observe(titleRef.current);
    return () => observer.disconnect();
  }, [compact]);
  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-30 flex h-[calc(52px+env(safe-area-inset-top))] items-center gap-2 border-b px-2 pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-200 lg:h-13 lg:px-6",
          scrolled ? "border-hairline bg-canvas/80 backdrop-blur-xl backdrop-saturate-150" : "border-transparent",
          className,
        )}
      >
        <div className="flex min-w-0 flex-initial items-center lg:flex-1">
          {leading ??
            (back && (
              <Link
                to={back.to}
                onClick={back.onClick}
                className="-ml-1 inline-flex h-11 min-w-0 items-center gap-0.5 rounded-lg pr-2 text-body text-tint hover:bg-tint/10 lg:h-8"
              >
                <ChevronLeft aria-hidden className="size-6 shrink-0 lg:size-5" strokeWidth={2.4} />
                <span className="truncate">{back.label}</span>
              </Link>
            ))}
        </div>
        <BarTitle
          aria-hidden={compact ? undefined : true}
          className={cn(
            // On phones a title centred on the page runs into the actions, so it takes only the space between them.
            "pointer-events-none min-w-0 flex-1 truncate text-headline font-semibold transition-opacity duration-200 lg:absolute lg:left-1/2 lg:max-w-[50%] lg:flex-none lg:-translate-x-1/2",
            (leading ?? back) && "max-lg:text-center",
            scrolled ? "opacity-100" : "opacity-0",
          )}
        >
          {title}
        </BarTitle>
        <div className="flex shrink-0 items-center justify-end gap-1">
          {actions}
          <div className="lg:hidden"><AppearanceSelect compact /></div>
        </div>
      </div>
      {!compact && (
        <div className="px-4 pb-3 lg:px-8 lg:pb-4">
          <h1 ref={titleRef} className="font-display text-large-title tracking-tight">
            {title}
          </h1>
          {children}
        </div>
      )}
    </>
  );
};
