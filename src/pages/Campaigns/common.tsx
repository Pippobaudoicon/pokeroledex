import { type QueryClient, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type * as React from "react";
import { apiFetch } from "@/api/client";
import { button } from "@/components/kit/button";
import { Sheet } from "@/components/kit/Sheet";
import { fold } from "@/hooks/use-dex";
import { cn } from "@/lib/utils";

export const field =
  "h-11 w-full min-w-0 rounded-xl bg-fill px-3 text-body outline-none placeholder:text-label-3 focus-visible:outline-2 focus-visible:outline-focus lg:h-8 lg:rounded-lg";
export const textArea =
  "min-h-24 w-full min-w-0 rounded-xl bg-fill px-3 py-2.5 text-body outline-none placeholder:text-label-3 focus-visible:outline-2 focus-visible:outline-focus lg:rounded-lg";

/** A labelled form field. Use `as="div"` around controls that are buttons, like a Picker. */
export const Field = ({
  label,
  hint,
  required = false,
  as: Element = "label",
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  as?: "label" | "div";
  className?: string;
  children: React.ReactNode;
}) => (
  <Element className={cn("flex min-w-0 flex-col gap-1.5", className)}>
    <span className="text-subhead font-medium">
      {label}
      {required && <span className="font-normal text-label-2"> · required</span>}
    </span>
    {children}
    {hint && <span className="text-footnote text-label-2">{hint}</span>}
  </Element>
);

/** The server's message from an apiFetch error, which keeps the response body in `stack`. */
export const errorText = (error: unknown) => {
  const payload = (error as { stack?: { payload?: unknown } } | null)?.stack?.payload;
  return typeof payload === "string" && payload ? payload : "Check your connection and try again.";
};

export type CampaignEntryKind = "pokemon-templates" | "moves" | "abilities" | "items";

/** The custom entries of one campaign (optionally with the core ones), as a cached query. */
export const useCampaignEntries = <TEntry,>(kind: CampaignEntryKind, campaignId: string, includeCore = false, enabled = true) =>
  useQuery({
    queryKey: [kind, "all", campaignId, { includeCore }],
    queryFn: ({ signal }) => apiFetch<TEntry[]>({ url: `/${kind}/all/${campaignId}`, method: "post", body: { includeCore }, signal }),
    enabled: enabled && campaignId !== "",
  });

/** Refreshes campaign lists and the app-wide indexes (Pokédex, Moves, Items) built from them. */
export const invalidateEntries = (queryClient: QueryClient, ...heads: string[]) =>
  queryClient.invalidateQueries({
    predicate: (query) => {
      const head = query.queryKey[0];
      return typeof head === "string" && heads.some((name) => head.includes(name));
    },
  });

export const byName = <TEntry extends { name: string }>(entries: TEntry[]) =>
  [...entries].sort((first, second) => first.name.localeCompare(second.name));

export const matches = (query: string, ...texts: (string | null | undefined)[]) => {
  const needle = fold(query.trim());
  return !needle || texts.some((text) => fold(text ?? "").includes(needle));
};

export const SearchField = ({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) => (
  <label className="relative flex items-center">
    <span className="sr-only">{label}</span>
    <Search aria-hidden className="pointer-events-none absolute left-3 size-4.5 text-label-2 lg:left-2.5 lg:size-4" />
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={label}
      className="h-11 w-full rounded-xl bg-fill pr-3 pl-10 text-body outline-none placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-focus lg:h-8 lg:rounded-lg lg:pl-8"
    />
  </label>
);

/** Asks before deleting; the sheet stays open until the request finishes. */
export const ConfirmDelete = ({
  open,
  onOpenChange,
  name,
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  isPending: boolean;
  onConfirm: () => void;
}) => (
  <Sheet open={open} onOpenChange={onOpenChange} title={`Delete ${name}?`} description={description}>
    <div className="flex flex-col gap-3 p-4">
      <button type="button" className={button({ variant: "filled" })} disabled={isPending} onClick={onConfirm}>
        {isPending ? "Deleting…" : confirmLabel}
      </button>
      <button type="button" className={button({ variant: "gray" })} onClick={() => onOpenChange(false)}>
        Cancel
      </button>
    </div>
  </Sheet>
);

/**
 * A create/edit form in a sheet. Save stays pinned to the bottom of long forms; editing
 * an existing entry adds a Delete button under the fields.
 */
export const EditorSheet = ({
  open,
  onOpenChange,
  title,
  submitLabel,
  canSubmit,
  blocker,
  isPending,
  onSubmit,
  onDelete,
  deleteLabel = "Delete",
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  canSubmit: boolean;
  /** Why the form can't be saved yet, shown above Save. */
  blocker?: string;
  isPending: boolean;
  onSubmit: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <Sheet open={open} onOpenChange={onOpenChange} title={title} initialExpanded className={className}>
    <form
      className="flex min-h-full flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit && !isPending) onSubmit();
      }}
    >
      <div className="flex flex-1 flex-col gap-6 p-4">
        {children}
        {onDelete && (
          <button type="button" className={cn(button({ variant: "destructive" }), "self-start")} onClick={onDelete}>
            {deleteLabel}
          </button>
        )}
      </div>
      <div className="sticky bottom-0 border-t border-hairline bg-canvas/90 p-4 backdrop-blur-xl">
        {blocker && (
          <p className="mb-2 text-center text-footnote text-label-2" aria-live="polite">
            {blocker}
          </p>
        )}
        <button type="submit" disabled={!canSubmit || isPending} className={cn(button({ variant: "filled" }), "w-full")}>
          {isPending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  </Sheet>
);

/** Loading, error and empty states shared by the campaign tabs. */
export const EntriesState = ({
  isError,
  onRetry,
  noun,
}: {
  isError: boolean;
  onRetry: () => void;
  noun: string;
}) =>
  isError ? (
    <div className="rounded-2xl bg-surface p-6 text-center shadow-card">
      <p className="mb-3 text-body">The {noun} couldn’t be loaded.</p>
      <button type="button" className={button({ variant: "tinted" })} onClick={onRetry}>
        Try again
      </button>
    </div>
  ) : (
    <div aria-hidden className="space-y-2">
      <div className="skeleton h-14 rounded-xl" />
      <div className="skeleton h-14 rounded-xl" />
      <div className="skeleton h-14 rounded-xl" />
    </div>
  );

export const EmptyEntries = ({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: React.ReactNode;
}) => (
  <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-8 text-center shadow-card">
    <span aria-hidden className="text-tint [&>svg]:size-10">
      {icon}
    </span>
    <h3 className="text-title-3 font-semibold">{title}</h3>
    <p className="max-w-sm text-subhead text-label-2">{text}</p>
    {action}
  </div>
);
