import { Loader2, Send } from "lucide-react";
import * as React from "react";
import type * as T from "../../shared/types";
import { ISSUE_DESCRIPTION_LIMIT, ISSUE_TITLE_LIMIT } from "../../shared/types";
import { useIssuesControllerCreate } from "@/api/components";
import { button } from "@/components/kit/button";
import { Sheet } from "@/components/kit/Sheet";
import { useToast } from "@/hooks/use-toast";
import { isTouchScreen } from "@/lib/utils";

const labelClass = "flex flex-col gap-1.5 text-subhead font-medium";
const fieldClass = "w-full rounded-xl bg-fill text-body font-normal outline-none placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-focus";
// Both answers share the Worker's description limit, with room left for the headings.
const ANSWER_LIMIT = ISSUE_DESCRIPTION_LIMIT / 2 - 50;

// The Worker opens the issue with its own token (worker/github.ts), so no GitHub account is needed.
export const IssueButton = ({ trigger }: { trigger: (open: () => void) => React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [what, setWhat] = React.useState("");
  const [why, setWhy] = React.useState("");
  const { toast } = useToast();
  const { mutate, isPending } = useIssuesControllerCreate({
    onSuccess: (issue) => {
      toast({
        title: "Thanks for the suggestion!",
        description: (
          <a href={issue.url} target="_blank" rel="noopener noreferrer" className="underline">
            View issue #{issue.number} on GitHub
          </a>
        ),
      });
      setOpen(false);
      setTitle("");
      setWhat("");
      setWhy("");
    },
    onError: (error) => {
      toast({
        title: "Could not send the suggestion",
        // apiFetch keeps the server's { payload } answer in `stack`.
        description: (error.stack as Partial<T.ApiError> | undefined)?.payload ?? "Try again later.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      {trigger(() => setOpen(true))}
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Suggest a feature"
        description="Posted as a public GitHub issue. Your email isn’t included."
        initialExpanded
      >
        <form
          className="flex flex-col gap-4 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const description = `## What it should do\n${what.trim()}${why.trim() && `\n\n## Why it would help\n${why.trim()}`}`;
            mutate({ body: { title: title.trim(), description } });
          }}
        >
          <label className={labelClass}>
            Your idea
            <input
              autoFocus={!isTouchScreen()}
              autoComplete="off"
              placeholder="A short summary"
              value={title}
              maxLength={ISSUE_TITLE_LIMIT}
              onChange={(event) => setTitle(event.target.value)}
              className={`${fieldClass} h-11 px-3 lg:h-9 lg:rounded-lg`}
            />
          </label>
          <label className={labelClass}>
            What should it do?
            <textarea
              placeholder="Describe what you would like to add or change."
              rows={5}
              value={what}
              maxLength={ANSWER_LIMIT}
              onChange={(event) => setWhat(event.target.value)}
              className={`${fieldClass} resize-y p-3`}
            />
          </label>
          <label className={labelClass}>
            <span>
              Why would it help? <span className="font-normal text-label-2">Optional</span>
            </span>
            <textarea
              placeholder="What problem would this solve during your game?"
              rows={3}
              value={why}
              maxLength={ANSWER_LIMIT}
              onChange={(event) => setWhy(event.target.value)}
              className={`${fieldClass} resize-y p-3`}
            />
          </label>
          <button type="submit" disabled={isPending || !title.trim() || !what.trim()} className={button({ variant: "filled" })}>
            {isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />}
            {isPending ? "Sending…" : "Send suggestion"}
          </button>
        </form>
      </Sheet>
    </>
  );
};
