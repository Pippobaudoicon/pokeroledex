import { Github } from "lucide-react";
import * as React from "react";
import type * as T from "../../shared/types";
import { ISSUE_DESCRIPTION_LIMIT, ISSUE_TITLE_LIMIT } from "../../shared/types";
import { useIssuesControllerCreate } from "@/api/components";
import { Text } from "@/components/Text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const issueBody = `## Feature or improvement
Describe what you would like to add or change.

## Why it would help
What problem would this solve during your game?

## Expected behaviour
Describe what should work when this is implemented.`;

// The Worker opens the issue with its own token (worker/github.ts), so no GitHub account is needed.
export const IssueButton = () => {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState(issueBody);
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
      setDescription(issueBody);
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
  const isValid = title.trim() !== "" && description.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true}>
        <Button variant="beige" size="equalPadding" className="gap-2" title="Suggest a feature or report a problem">
          <Github size={18} aria-hidden="true" />
          Suggest a feature
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Suggest a feature</DialogTitle>
          <DialogDescription>
            Your suggestion is published as a public GitHub issue. Your email is not included.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 p-1">
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Title *
            </Text>
            <Input
              placeholder="A short summary"
              value={title}
              maxLength={ISSUE_TITLE_LIMIT}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Text font="font-move" className="text-sm font-medium">
              Description *
            </Text>
            <Textarea
              value={description}
              maxLength={ISSUE_DESCRIPTION_LIMIT}
              rows={10}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="green"
            onClick={() => {
              mutate({ body: { title: title.trim(), description: description.trim() } });
            }}
            disabled={isPending || !isValid}
          >
            {isPending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
