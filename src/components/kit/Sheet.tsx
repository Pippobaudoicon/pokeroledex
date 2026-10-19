import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { button } from "@/components/kit/button";
import { cn } from "@/lib/utils";

const isTouchLayout = () => window.matchMedia("(max-width: 1023px)").matches;

/**
 * Modal sheet. On phones and tablets it rises from the bottom at a medium height; drag the
 * grabber (or scroll the content) up to expand it, drag it down to dismiss. On desktop it is
 * a centred panel. Radix handles focus trapping, Escape and the aria-modal wiring.
 */
export const Sheet = ({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  description,
  toolbar,
  children,
  initialExpanded = false,
  className = "lg:max-w-lg",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  /** Keeps the title for screen readers only, e.g. when the content shows its own heading. */
  hideTitle?: boolean;
  description?: React.ReactNode;
  /** Right side of the sheet's top bar, next to the close button. */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  initialExpanded?: boolean;
  /** Desktop width, e.g. "lg:max-w-2xl". */
  className?: string;
}) => {
  const [expanded, setExpanded] = React.useState(initialExpanded);
  const [dragY, setDragY] = React.useState<number | null>(null);
  const drag = React.useRef<{ y: number; time: number } | null>(null);
  React.useEffect(() => {
    if (open) setExpanded(initialExpanded);
  }, [open, initialExpanded]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (!isTouchLayout() || (event.target as Element).closest("button, a, input, select")) return;
    drag.current = { y: event.clientY, time: performance.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    if (drag.current) setDragY(event.clientY - drag.current.y);
  };
  const onPointerUp = (event: React.PointerEvent) => {
    if (!drag.current) return;
    const distance = event.clientY - drag.current.y;
    const velocity = distance / Math.max(1, performance.now() - drag.current.time);
    drag.current = null;
    setDragY(null);
    if (distance > 120 || velocity > 0.6) {
      if (expanded && distance < 260 && velocity < 1.2) setExpanded(false);
      else onOpenChange(false);
    } else if (distance < -40 || velocity < -0.4) setExpanded(true);
  };
  // Medium detent: the sheet is full height but pushed down, so content never reflows while dragging.
  const rest = expanded ? "0px" : "var(--sheet-medium-offset)";
  const offset = dragY === null ? rest : `max(calc(${rest} + ${dragY}px), calc((${rest} + ${dragY}px) * 0.2))`;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 [--tw-duration:250ms]" />
        <DialogPrimitive.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          style={{ "--sheet-offset": offset } as React.CSSProperties}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-canvas shadow-float outline-none [--tw-duration:300ms] [--tw-ease:var(--ease-spring)]",
            // Phones and tablets: bottom sheet. The !important widths beat the legacy dialog cap in layout.css.
            "max-lg:inset-x-0 max-lg:bottom-0 max-lg:h-[calc(100dvh-env(safe-area-inset-top)-12px)] max-lg:max-h-none! max-lg:max-w-none! max-lg:rounded-t-[14px] max-lg:[--sheet-medium-offset:38dvh] max-lg:[transform:translateY(var(--sheet-offset))]",
            dragY === null && "max-lg:transition-transform max-lg:duration-300 max-lg:ease-spring",
            "max-lg:data-[state=open]:animate-in max-lg:data-[state=open]:slide-in-from-bottom-full max-lg:data-[state=closed]:animate-out max-lg:data-[state=closed]:slide-out-to-bottom-full",
            // Desktop: centred panel.
            "lg:left-1/2 lg:top-1/2 lg:max-h-[min(760px,calc(100dvh-64px))] lg:w-[calc(100vw-64px)] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:data-[state=open]:animate-in lg:data-[state=open]:fade-in-0 lg:data-[state=open]:zoom-in-95 lg:data-[state=closed]:animate-out lg:data-[state=closed]:fade-out-0 lg:data-[state=closed]:zoom-out-95 lg:[--tw-duration:200ms]",
            className,
          )}
        >
          <div
            className={cn(
              "z-10 shrink-0 touch-none select-none lg:touch-auto",
              // With a hidden title the bar floats over the content (e.g. a hero image), keeping only the grabber and close.
              hideTitle ? "absolute inset-x-0 top-0" : "relative border-b border-hairline bg-canvas/90 backdrop-blur-xl",
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div aria-hidden className="mx-auto mt-1.5 h-1.5 w-10 rounded-full bg-fill-strong lg:hidden" />
            <div className="flex min-h-12 items-center gap-2 px-4 py-1.5 lg:min-h-12 lg:px-4">
              <DialogPrimitive.Title className={cn("min-w-0 flex-1 truncate text-headline font-semibold", hideTitle && "sr-only")}>
                {title}
              </DialogPrimitive.Title>
              {hideTitle && <span className="flex-1" />}
              {toolbar}
              <DialogPrimitive.Close
                className={cn(button({ variant: "gray", size: "icon" }), "size-9 lg:size-7", hideTitle && "bg-surface/70 backdrop-blur-md hover:bg-surface/90")}
                aria-label="Close"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
            {description && <DialogPrimitive.Description className="px-4 pb-2 text-subhead text-label-2">{description}</DialogPrimitive.Description>}
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(16px,env(safe-area-inset-bottom))]"
            onScroll={(event) => {
              if (!expanded && event.currentTarget.scrollTop > 8 && isTouchLayout()) setExpanded(true);
            }}
          >
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
