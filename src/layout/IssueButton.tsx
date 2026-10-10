import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";

const issueBody = `## Feature or improvement
Describe what you would like to add or change.

## Why it would help
What problem would this solve during your game?

## Expected behaviour
- [ ] Describe what should work when this is implemented.

## Examples or screenshots
Add any useful references here (optional).`;

const issueUrl = `https://github.com/Pippobaudoicon/pokeroledex/issues/new?${new URLSearchParams({ body: issueBody })}`;

export const IssueButton = () => (
  <Button asChild variant="beige" size="equalPadding" className="gap-2">
    <a href={issueUrl} target="_blank" rel="noopener noreferrer" title="Create a GitHub issue (opens in a new tab)">
      <Github size={18} aria-hidden="true" />
      Suggest a feature
    </a>
  </Button>
);
