import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQueries } from "@tanstack/react-query";
import type * as T from "../../shared/types";
import { apiFetch } from "@/api/client";
import { Rank } from "@/api/schemas";
import { capitalize, cn, formatEnumName } from "@/lib/utils";

const RANKS = Object.values(Rank);

export type RankBudget = Pick<T.RankUpAttributes, "attributePoints" | "skillPoints" | "socialPoints" | "skillLimit">;

/** Points a sheet earns by ranking up from Unranked to `rank`, summed over every rank-up. Undefined while loading, null on error. */
export const useRankBudget = (rank: T.Rank, enabled = true): RankBudget | null | undefined => {
  const ranks = RANKS.slice(1, RANKS.indexOf(rank) + 1);
  const results = useQueries({
    queries: ranks.map((entry) => ({
      queryKey: ["rankup-attributes", entry],
      queryFn: ({ signal }: { signal: AbortSignal }) => apiFetch<T.RankUpAttributes | null>({ url: `/rankup-attributes/${entry}`, method: "get", signal }),
      staleTime: Infinity,
      enabled,
    })),
  });
  if (results.some((result) => result.isError)) return null;
  if (!enabled || results.some((result) => result.data === undefined)) return undefined;
  return results.reduce<RankBudget>(
    (total, { data }) =>
      data
        ? {
            attributePoints: total.attributePoints + data.attributePoints,
            skillPoints: total.skillPoints + data.skillPoints,
            socialPoints: total.socialPoints + data.socialPoints,
            skillLimit: Math.max(total.skillLimit, data.skillLimit),
          }
        : total,
    { attributePoints: 0, skillPoints: 0, socialPoints: 0, skillLimit: 0 },
  );
};

export type StatCategory = { title: string; budget: keyof Omit<RankBudget, "skillLimit">; stats: readonly string[] };
export type StatIssue = { stat: string; value: number; limit: number; reason: string };

/** Compares invested points (stats stored as offsets) with what ranking up from Unranked would give. */
export const StatPointsCheckDialog = ({
  name,
  rank,
  stats,
  categories,
  skills,
  extraIssues = [],
  open,
  onOpenChange,
}: {
  name: string;
  rank: T.Rank;
  stats: Partial<Record<string, number>>;
  categories: StatCategory[];
  /** Skills checked against the rank's skill limit. */
  skills: readonly string[];
  extraIssues?: StatIssue[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const budget = useRankBudget(rank, open);
  const rows = categories.map((category) => {
    const spent = category.stats.reduce((sum, stat) => sum + (stats[stat] ?? 0), 0);
    const expected = budget?.[category.budget] ?? 0;
    return { ...category, spent, expected, difference: spent - expected };
  });
  const issues: StatIssue[] = [
    ...skills
      .filter((skill) => (stats[skill] ?? 0) > (budget?.skillLimit ?? 0))
      .map((skill) => ({ stat: skill, value: stats[skill] ?? 0, limit: budget?.skillLimit ?? 0, reason: `above the ${formatEnumName(rank)} skill limit` })),
    ...extraIssues,
  ];
  const allGood = rows.every((row) => row.difference === 0) && issues.length === 0;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[min(340px,calc(100vw-48px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-surface/95 text-center shadow-float backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 [--tw-duration:200ms]">
          <div className="px-5 pt-5 pb-4">
            <DialogPrimitive.Title className="text-headline font-semibold break-words">Check {name}’s points</DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 text-footnote text-label-2">
              Compared with ranking up from Unranked to {formatEnumName(rank)}. Nothing on the sheet is changed.
            </DialogPrimitive.Description>
            {budget === undefined ? (
              <p className="mt-4 text-subhead text-label-2">Loading…</p>
            ) : budget === null ? (
              <p className="mt-4 text-subhead text-[#d92d20]">Couldn’t load the rank-up points. Check your connection and try again.</p>
            ) : (
              <>
                <ul className="mt-4 overflow-hidden rounded-xl bg-fill text-left">
                  {rows.map((row) => (
                    <li key={row.title} className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-2 last:border-b-0">
                      <span className="flex flex-col">
                        <span className="text-body">{row.title}</span>
                        <span className="text-caption text-label-2 tabular-nums">
                          {row.spent} of {row.expected} spent
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-footnote font-semibold tabular-nums",
                          row.difference === 0 ? "bg-[#12b76a]/15 text-[#067647]" : row.difference > 0 ? "bg-[#d92d20]/10 text-[#d92d20]" : "bg-tint/10 text-tint",
                        )}
                      >
                        {row.difference === 0
                          ? "Matches"
                          : row.difference > 0
                            ? `${row.difference} too many`
                            : `${-row.difference} to spend`}
                      </span>
                    </li>
                  ))}
                </ul>
                {issues.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1 text-left text-footnote text-[#d92d20]">
                    {issues.map((issue) => (
                      <li key={`${issue.stat}-${issue.reason}`}>
                        {capitalize(issue.stat)} is {issue.value}, {issue.reason} ({issue.limit}).
                      </li>
                    ))}
                  </ul>
                )}
                {allGood && <p className="mt-3 text-footnote text-label-2">Everything adds up.</p>}
              </>
            )}
          </div>
          <div className="border-t border-hairline">
            <DialogPrimitive.Close className="h-11 w-full text-body font-semibold text-tint hover:bg-fill">OK</DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
